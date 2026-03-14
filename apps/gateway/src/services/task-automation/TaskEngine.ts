/**
 * 任务执行引擎
 *
 * 参考 Claude Team 的 Agent 运行模式：
 * 1. 自主规划 - AI 自己决定如何完成任务
 * 2. 工具调用 - 可以调用各种工具
 * 3. 迭代执行 - 根据结果调整下一步
 * 4. 状态保持 - 记住执行上下文
 * 5. 人工确认 - 关键操作需要确认
 */

import { createLogger } from '../../utils/logger';
import { TaskPlan, SubTask, taskPlanner } from './TaskPlanner';
import { executeTool, ToolResult } from './ToolExecutor';
import { chatCompletion, ChatMessage } from '../ai';
import { EventEmitter } from 'events';

const logger = createLogger('TaskEngine');

/**
 * 任务状态
 */
export interface TaskExecution {
  taskId: string;
  plan: TaskPlan;
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed' | 'waiting_confirmation';
  currentStep: number;
  context: Record<string, unknown>;  // 执行上下文
  history: StepExecution[];          // 执行历史
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * 步骤执行记录
 */
export interface StepExecution {
  stepId: string;
  subtask: SubTask;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: ToolResult;
  startTime: Date;
  endTime?: Date;
  aiDecision?: string;  // AI 的决策说明
}

/**
 * 执行选项
 */
export interface ExecutionOptions {
  requireConfirmation?: boolean;  // 是否需要人工确认
  maxIterations?: number;         // 最大迭代次数
  autoRetry?: boolean;            // 失败是否自动重试
  timeout?: number;               // 超时时间（毫秒）
}

/**
 * 任务事件
 */
export interface TaskEvents {
  'task:started': (task: TaskExecution) => void;
  'task:step:started': (taskId: string, step: StepExecution) => void;
  'task:step:completed': (taskId: string, step: StepExecution) => void;
  'task:step:failed': (taskId: string, step: StepExecution, error: string) => void;
  'task:waiting_confirmation': (taskId: string, message: string) => void;
  'task:completed': (task: TaskExecution) => void;
  'task:failed': (task: TaskExecution, error: string) => void;
  'task:paused': (task: TaskExecution) => void;
}

/**
 * 任务执行引擎
 *
 * 核心流程：
 * 1. 接收用户任务
 * 2. AI 规划执行步骤
 * 3. 循环执行每个步骤：
 *    a. 分析当前状态
 *    b. 决定下一步操作
 *    c. 执行工具调用
 *    d. 评估结果
 *    e. 如有需要，调整计划
 * 4. 返回最终结果
 */
export class TaskEngine extends EventEmitter {
  private activeTasks: Map<string, TaskExecution> = new Map();

  /**
   * 启动新任务
   */
  async startTask(
    userRequest: string,
    options: ExecutionOptions = {}
  ): Promise<TaskExecution> {
    logger.info(`启动新任务: ${userRequest}`);

    // 1. AI 规划任务
    const plan = await taskPlanner.createPlan(userRequest);

    // 2. 创建任务执行记录
    const task: TaskExecution = {
      taskId: plan.taskId,
      plan,
      status: 'running',
      currentStep: 0,
      context: {
        originalRequest: userRequest,
        options
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeTasks.set(task.taskId, task);
    this.emit('task:started', task);

    // 3. 开始执行
    this.executeTask(task);

    return task;
  }

  /**
   * 执行任务
   */
  private async executeTask(task: TaskExecution): Promise<void> {
    const { plan, context } = task;
    const options = context.options as ExecutionOptions;
    const maxIterations = options.maxIterations || 50;

    try {
      // 执行每个子任务
      for (let i = 0; i < plan.subtasks.length; i++) {
        // 检查是否超时
        if (this.isTimeout(task, options.timeout)) {
          throw new Error('任务执行超时');
        }

        // 检查是否超过最大迭代次数
        if (task.history.length >= maxIterations) {
          throw new Error('超过最大迭代次数');
        }

        const subtask = plan.subtasks[i];
        task.currentStep = i;

        // 检查依赖是否完成
        if (!this.areDependenciesMet(task, subtask)) {
          logger.info(`步骤 ${subtask.id} 依赖未完成，跳过`);
          continue;
        }

        // 执行步骤
        await this.executeStep(task, subtask);

        // 如果任务被暂停或失败，停止执行
        if (task.status === 'paused' || task.status === 'failed') {
          return;
        }

        // 如果等待确认，暂停执行
        if (task.status === 'waiting_confirmation') {
          return;
        }
      }

      // 任务完成
      task.status = 'completed';
      task.completedAt = new Date();
      task.updatedAt = new Date();
      this.emit('task:completed', task);

      logger.info(`任务完成: ${task.taskId}`);

    } catch (error) {
      task.status = 'failed';
      task.error = (error as Error).message;
      task.updatedAt = new Date();
      this.emit('task:failed', task, task.error);

      logger.error(`任务失败: ${task.taskId}`, error);
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(task: TaskExecution, subtask: SubTask): Promise<void> {
    logger.info(`执行步骤: ${subtask.id} - ${subtask.name}`);

    // 创建步骤执行记录
    const stepExecution: StepExecution = {
      stepId: subtask.id,
      subtask,
      status: 'running',
      startTime: new Date()
    };

    task.history.push(stepExecution);
    task.updatedAt = new Date();
    this.emit('task:step:started', task.taskId, stepExecution);

    try {
      // 如果需要人工确认
      const options = task.context.options as ExecutionOptions;
      if (options.requireConfirmation && this.isSensitiveOperation(subtask)) {
        task.status = 'waiting_confirmation';
        const message = `步骤 "${subtask.name}" 需要确认：${subtask.description}`;
        this.emit('task:waiting_confirmation', task.taskId, message);
        return;
      }

      // 执行工具调用
      if (subtask.tool) {
        // 替换参数中的变量
        const parameters = this.interpolateParameters(subtask.parameters || {}, task);

        const result = await executeTool(subtask.tool, parameters);
        stepExecution.result = result;

        if (!result.success) {
          throw new Error(result.error || '工具执行失败');
        }

        // 保存结果到上下文
        task.context[`result_${subtask.id}`] = result.data;
      }

      // 使用 AI 评估结果并决定下一步
      const aiDecision = await this.evaluateStep(task, stepExecution);
      stepExecution.aiDecision = aiDecision;

      stepExecution.status = 'completed';
      stepExecution.endTime = new Date();
      subtask.status = 'completed';
      subtask.result = stepExecution.result?.data;

      this.emit('task:step:completed', task.taskId, stepExecution);

      logger.info(`步骤完成: ${subtask.id}`);

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.endTime = new Date();
      subtask.status = 'failed';
      subtask.error = (error as Error).message;

      this.emit('task:step:failed', task.taskId, stepExecution, subtask.error);

      logger.error(`步骤失败: ${subtask.id}`, error);

      // 如果设置了自动重试，尝试重试
      const options = task.context.options as ExecutionOptions;
      if (options.autoRetry) {
        await this.retryStep(task, subtask);
      } else {
        throw error;
      }
    }
  }

  /**
   * AI 评估步骤结果
   */
  private async evaluateStep(
    task: TaskExecution,
    step: StepExecution
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个任务执行评估专家。评估当前步骤的执行结果，并决定下一步操作。

可用操作：
- continue: 继续执行下一步
- retry: 当前步骤需要重试
- adjust_plan: 需要调整后续计划
- complete: 任务已完成，可以提前结束
- ask_user: 需要向用户询问更多信息

只输出 JSON 格式：
{
  "decision": "操作类型",
  "reason": "决策原因",
  "suggestion": "建议（如有）"
}`
      },
      {
        role: 'user',
        content: `任务目标: ${task.plan.goal}
当前步骤: ${step.subtask.name}
步骤描述: ${step.subtask.description}
执行结果: ${JSON.stringify(step.result)}

请评估并给出决策。`
      }
    ];

    try {
      const response = await chatCompletion({
        messages,
        temperature: 0.3,
        maxTokens: 500
      });

      return response.content;
    } catch (error) {
      logger.error('AI 评估失败', error);
      return '{"decision": "continue", "reason": "评估失败，继续执行"}';
    }
  }

  /**
   * 重试步骤
   */
  private async retryStep(task: TaskExecution, subtask: SubTask): Promise<void> {
    logger.info(`重试步骤: ${subtask.id}`);

    // 等待 2 秒后重试
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 重新执行
    await this.executeStep(task, subtask);
  }

  /**
   * 检查依赖是否完成
   */
  private areDependenciesMet(task: TaskExecution, subtask: SubTask): boolean {
    for (const depId of subtask.dependencies) {
      const depSubtask = task.plan.subtasks.find(st => st.id === depId);
      if (!depSubtask || depSubtask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查是否超时
   */
  private isTimeout(task: TaskExecution, timeout?: number): boolean {
    if (!timeout) return false;
    return Date.now() - task.createdAt.getTime() > timeout;
  }

  /**
   * 检查是否是敏感操作
   */
  private isSensitiveOperation(subtask: SubTask): boolean {
    const sensitiveTools = ['shell_command', 'file_write', 'file_delete'];
    return subtask.tool ? sensitiveTools.includes(subtask.tool) : false;
  }

  /**
   * 替换参数中的变量
   */
  private interpolateParameters(
    parameters: Record<string, unknown>,
    task: TaskExecution
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // 替换 ${variable} 格式的变量
        result[key] = value.replace(/\$\{(\w+)\}/g, (match, varName) => {
          const varValue = task.context[varName];
          return varValue !== undefined ? String(varValue) : match;
        });
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 确认继续执行
   */
  confirmTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'waiting_confirmation') {
      throw new Error('任务不在等待确认状态');
    }

    task.status = 'running';
    this.emit('task:started', task);

    // 继续执行
    this.executeTask(task);
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    task.status = 'paused';
    task.updatedAt = new Date();
    this.emit('task:paused', task);

    logger.info(`任务已暂停: ${taskId}`);
  }

  /**
   * 恢复任务
   */
  resumeTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'paused') {
      throw new Error('任务不在暂停状态');
    }

    task.status = 'running';
    this.emit('task:started', task);

    // 继续执行
    this.executeTask(task);

    logger.info(`任务已恢复: ${taskId}`);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    task.status = 'failed';
    task.error = '用户取消';
    task.updatedAt = new Date();
    this.emit('task:failed', task, '用户取消');

    this.activeTasks.delete(taskId);

    logger.info(`任务已取消: ${taskId}`);
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): TaskExecution | undefined {
    return this.activeTasks.get(taskId);
  }

  /**
   * 获取所有活跃任务
   */
  getActiveTasks(): TaskExecution[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * 生成任务报告
   */
  generateReport(taskId: string): string {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return '任务不存在';
    }

    const lines = [
      `任务报告: ${task.taskId}`,
      `状态: ${task.status}`,
      `目标: ${task.plan.goal}`,
      `创建时间: ${task.createdAt.toLocaleString()}`,
      `更新时间: ${task.updatedAt.toLocaleString()}`,
      '',
      '执行步骤:',
      ...task.history.map((step, index) => {
        const status = step.status === 'completed' ? '✅' :
                      step.status === 'failed' ? '❌' :
                      step.status === 'running' ? '⏳' : '⏸️';
        return `${index + 1}. ${status} ${step.subtask.name}`;
      }),
      '',
      task.status === 'completed' ? '✨ 任务成功完成！' :
      task.status === 'failed' ? `❌ 任务失败: ${task.error}` :
      '⏳ 任务进行中...'
    ];

    return lines.join('\n');
  }
}

export const taskEngine = new TaskEngine();
