/**
 * 定时任务调度器
 *
 * 支持 Cron 表达式，定时触发 ReAct 任务
 */

import { createLogger } from '../../utils/logger';
import { createReActAgent } from '../task-automation/ReActAgent';

const logger = createLogger('CronScheduler');

/**
 * 定时任务状态
 */
export type ScheduledTaskStatus = 'active' | 'paused' | 'completed' | 'failed';

/**
 * 定时任务类型
 */
export type ScheduledTaskType = 'react' | 'command' | 'http';

/**
 * 定时任务配置
 */
export interface ScheduledTaskConfig {
  taskId: string;
  name: string;
  description?: string;
  cronExpression: string;  // Cron 表达式，如 "0 9 * * *" (每天9点)
  type: ScheduledTaskType;
  payload: {
    query?: string;        // ReAct 查询
    command?: string;      // Shell 命令
    url?: string;          // HTTP URL
    method?: string;       // HTTP 方法
    body?: unknown;        // HTTP 请求体
  };
  options?: {
    maxIterations?: number;
    temperature?: number;
    model?: string;
  };
  notification?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    email?: string;
    webhook?: string;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  failCount: number;
}

/**
 * 执行记录
 */
export interface ExecutionRecord {
  executionId: string;
  taskId: string;
  status: 'success' | 'failure';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  result?: unknown;
  error?: string;
  logs: string[];
}

/**
 * Cron 调度器
 */
export class CronScheduler {
  private tasks: Map<string, ScheduledTaskConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private executionHistory: Map<string, ExecutionRecord[]> = new Map();
  private isRunning = false;

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('调度器已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('Cron 调度器已启动');

    // 重新加载所有启用的任务
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.isRunning = false;

    // 清除所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    logger.info('Cron 调度器已停止');
  }

  /**
   * 创建定时任务
   */
  createTask(config: Omit<ScheduledTaskConfig, 'taskId' | 'createdAt' | 'updatedAt' | 'runCount' | 'failCount'>): ScheduledTaskConfig {
    const taskId = `cron_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const task: ScheduledTaskConfig = {
      ...config,
      taskId,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      failCount: 0
    };

    this.tasks.set(taskId, task);
    this.executionHistory.set(taskId, []);

    logger.info(`创建定时任务: ${task.name} (${task.cronExpression})`);

    // 如果调度器在运行且任务启用，立即调度
    if (this.isRunning && task.enabled) {
      this.scheduleTask(task);
    }

    return task;
  }

  /**
   * 更新定时任务
   */
  updateTask(taskId: string, updates: Partial<ScheduledTaskConfig>): ScheduledTaskConfig | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    // 更新字段
    Object.assign(task, updates, { updatedAt: new Date() });

    // 重新调度
    this.unscheduleTask(taskId);
    if (this.isRunning && task.enabled) {
      this.scheduleTask(task);
    }

    logger.info(`更新定时任务: ${task.name}`);
    return task;
  }

  /**
   * 删除定时任务
   */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.unscheduleTask(taskId);
    this.tasks.delete(taskId);
    this.executionHistory.delete(taskId);

    logger.info(`删除定时任务: ${task.name}`);
    return true;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): ScheduledTaskConfig | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): ScheduledTaskConfig[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 启用任务
   */
  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.enabled = true;
    task.updatedAt = new Date();

    if (this.isRunning) {
      this.scheduleTask(task);
    }

    logger.info(`启用定时任务: ${task.name}`);
    return true;
  }

  /**
   * 禁用任务
   */
  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.enabled = false;
    task.updatedAt = new Date();

    this.unscheduleTask(taskId);

    logger.info(`禁用定时任务: ${task.name}`);
    return true;
  }

  /**
   * 立即执行任务
   */
  async runTaskNow(taskId: string): Promise<ExecutionRecord> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    return this.executeTask(task);
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(taskId: string): ExecutionRecord[] {
    return this.executionHistory.get(taskId) || [];
  }

  /**
   * 调度任务
   */
  private scheduleTask(task: ScheduledTaskConfig): void {
    // 清除现有定时器
    this.unscheduleTask(task.taskId);

    // 计算下次执行时间
    const nextRun = this.getNextRunTime(task.cronExpression);
    if (!nextRun) {
      logger.error(`无效的 Cron 表达式: ${task.cronExpression}`);
      return;
    }

    task.nextRunAt = nextRun;

    const delay = nextRun.getTime() - Date.now();
    logger.info(`任务 ${task.name} 将在 ${nextRun.toLocaleString()} 执行，还有 ${Math.round(delay / 1000)} 秒`);

    // 设置定时器
    const timer = setTimeout(async () => {
      await this.executeTask(task);
      // 重新调度（如果是周期性任务）
      if (this.isRunning && task.enabled) {
        this.scheduleTask(task);
      }
    }, delay);

    this.timers.set(task.taskId, timer);
  }

  /**
   * 取消任务调度
   */
  private unscheduleTask(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRunAt = undefined;
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ScheduledTaskConfig): Promise<ExecutionRecord> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startedAt = new Date();
    const logs: string[] = [];

    logger.info(`开始执行任务: ${task.name} (${executionId})`);
    logs.push(`[${startedAt.toISOString()}] 任务开始执行`);

    try {
      let result: unknown;

      switch (task.type) {
        case 'react':
          result = await this.executeReActTask(task, logs);
          break;
        case 'command':
          result = await this.executeCommandTask(task, logs);
          break;
        case 'http':
          result = await this.executeHttpTask(task, logs);
          break;
        default:
          throw new Error(`未知的任务类型: ${task.type}`);
      }

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      task.lastRunAt = completedAt;
      task.runCount++;

      const record: ExecutionRecord = {
        executionId,
        taskId: task.taskId,
        status: 'success',
        startedAt,
        completedAt,
        duration,
        result,
        logs
      };

      // 保存执行记录
      const history = this.executionHistory.get(task.taskId) || [];
      history.push(record);
      this.executionHistory.set(task.taskId, history);

      logger.info(`任务执行成功: ${task.name}，耗时 ${duration}ms`);

      // 发送成功通知
      if (task.notification?.onSuccess) {
        await this.sendNotification(task, record);
      }

      return record;

    } catch (error) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      task.lastRunAt = completedAt;
      task.failCount++;

      const errorMessage = (error as Error).message;
      logs.push(`[${completedAt.toISOString()}] 执行失败: ${errorMessage}`);

      const record: ExecutionRecord = {
        executionId,
        taskId: task.taskId,
        status: 'failure',
        startedAt,
        completedAt,
        duration,
        error: errorMessage,
        logs
      };

      // 保存执行记录
      const history = this.executionHistory.get(task.taskId) || [];
      history.push(record);
      this.executionHistory.set(task.taskId, history);

      logger.error(`任务执行失败: ${task.name}`, error);

      // 发送失败通知
      if (task.notification?.onFailure) {
        await this.sendNotification(task, record);
      }

      return record;
    }
  }

  /**
   * 执行 ReAct 任务
   */
  private async executeReActTask(task: ScheduledTaskConfig, logs: string[]): Promise<unknown> {
    const agent = createReActAgent({
      maxIterations: task.options?.maxIterations || 10,
      temperature: task.options?.temperature || 0.7,
      model: task.options?.model
    });

    const query = task.payload.query;
    if (!query) {
      throw new Error('ReAct 任务缺少 query 参数');
    }

    logs.push(`执行 ReAct 查询: ${query}`);

    const result = await agent.execute(query);

    logs.push(`ReAct 执行完成，共 ${result.steps.length} 步，消耗 ${result.totalTokens} tokens`);

    return {
      finalAnswer: result.finalAnswer,
      steps: result.steps.length,
      totalTokens: result.totalTokens,
      executionTime: result.executionTime
    };
  }

  /**
   * 执行命令任务
   */
  private async executeCommandTask(task: ScheduledTaskConfig, logs: string[]): Promise<unknown> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const command = task.payload.command;
    if (!command) {
      throw new Error('命令任务缺少 command 参数');
    }

    logs.push(`执行命令: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    logs.push(`命令执行完成`);
    if (stderr) {
      logs.push(`stderr: ${stderr}`);
    }

    return { stdout, stderr };
  }

  /**
   * 执行 HTTP 任务
   */
  private async executeHttpTask(task: ScheduledTaskConfig, logs: string[]): Promise<unknown> {
    const url = task.payload.url;
    if (!url) {
      throw new Error('HTTP 任务缺少 url 参数');
    }

    logs.push(`发送 HTTP 请求: ${task.payload.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      method: task.payload.method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      body: task.payload.body ? JSON.stringify(task.payload.body) : undefined
    });

    const data = await response.json();

    logs.push(`HTTP 响应: ${response.status} ${response.statusText}`);

    return { status: response.status, data };
  }

  /**
   * 发送通知
   */
  private async sendNotification(task: ScheduledTaskConfig, record: ExecutionRecord): Promise<void> {
    // Webhook 通知
    if (task.notification?.webhook) {
      try {
        await fetch(task.notification.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskName: task.name,
            status: record.status,
            executionId: record.executionId,
            duration: record.duration,
            timestamp: record.completedAt
          })
        });
        logger.info(`Webhook 通知已发送: ${task.notification.webhook}`);
      } catch (error) {
        logger.error('Webhook 通知发送失败', error);
      }
    }

    // 邮件通知（待实现）
    if (task.notification?.email) {
      logger.info(`邮件通知待发送: ${task.notification.email}`);
      // TODO: 实现邮件发送
    }
  }

  /**
   * 计算下次执行时间
   */
  private getNextRunTime(cronExpression: string): Date | null {
    try {
      // 简化的 Cron 解析，支持基本格式
      // 格式: "分 时 日 月 周"
      // 示例: "0 9 * * *" (每天9点)
      // 示例: "*/5 * * * *" (每5分钟)

      const parts = cronExpression.split(' ');
      if (parts.length !== 5) {
        throw new Error('Cron 表达式必须包含5个部分');
      }

      const [minute, hour, day, month, weekday] = parts;
      const now = new Date();
      const next = new Date(now);

      // 简单实现：只支持固定时间点和简单间隔
      if (minute.startsWith('*/') && hour === '*' && day === '*' && month === '*' && weekday === '*') {
        // 每 N 分钟
        const interval = parseInt(minute.replace('*/', ''));
        const currentMinute = now.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;

        if (nextMinute >= 60) {
          next.setHours(now.getHours() + 1);
          next.setMinutes(nextMinute - 60);
        } else {
          next.setMinutes(nextMinute);
        }
      } else if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
        // 每天固定时间
        next.setHours(parseInt(hour));
        next.setMinutes(parseInt(minute));
        next.setSeconds(0);
        next.setMilliseconds(0);

        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      } else {
        // 其他复杂情况，默认1分钟后执行
        next.setMinutes(now.getMinutes() + 1);
      }

      return next;
    } catch (error) {
      logger.error('解析 Cron 表达式失败', error);
      return null;
    }
  }
}

// 导出单例
export const cronScheduler = new CronScheduler();
