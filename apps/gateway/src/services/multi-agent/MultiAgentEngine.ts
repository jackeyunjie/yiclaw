/**
 * 多 Agent 协作引擎
 *
 * 实现 Agent 间的任务委派和协作
 */

import { createLogger } from '../../utils/logger';
import { ReActAgent, createReActAgent } from '../task-automation/ReActAgent';
import { agentRegistry, AgentRole } from './AgentRegistry';
import { EventEmitter } from 'events';

const logger = createLogger('MultiAgentEngine');

/**
 * 协作任务状态
 */
export type CollaborationStatus = 'pending' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed';

/**
 * 子任务分配
 */
export interface SubTaskAssignment {
  assignmentId: string;
  subTaskId: string;
  title: string;
  description: string;
  assignedTo: string;        // Agent ID
  assignedToName: string;    // Agent 名称
  dependencies: string[];    // 依赖的其他子任务
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 协作任务
 */
export interface CollaborationTask {
  taskId: string;
  title: string;
  description: string;
  status: CollaborationStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // 任务规划
  orchestratorAgentId: string;    // 协调者 Agent
  involvedAgents: string[];       // 参与的所有 Agent
  subTasks: SubTaskAssignment[];

  // 执行结果
  finalResult?: string;
  executionLog: CollaborationLogEntry[];
}

/**
 * 协作日志条目
 */
export interface CollaborationLogEntry {
  timestamp: Date;
  type: 'system' | 'agent' | 'handoff' | 'completion' | 'error';
  agentId?: string;
  agentName?: string;
  message: string;
  details?: unknown;
}

/**
 * 协作选项
 */
export interface CollaborationOptions {
  orchestratorModel?: string;
  maxAgents?: number;
  requireApproval?: boolean;
  parallelExecution?: boolean;
  timeout?: number;
}

/**
 * 多 Agent 协作引擎
 */
export class MultiAgentEngine extends EventEmitter {
  private tasks: Map<string, CollaborationTask> = new Map();
  private activeAgents: Map<string, ReActAgent> = new Map();

  /**
   * 创建协作任务
   */
  async createCollaboration(
    title: string,
    description: string,
    options: CollaborationOptions = {}
  ): Promise<CollaborationTask> {
    const taskId = `collab_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    logger.info(`创建协作任务: ${title}`);

    // 1. 使用协调者 Agent 进行任务规划
    const orchestrator = this.getOrCreateAgent('preset_architect', options.orchestratorModel);
    const plan = await this.planCollaboration(orchestrator, title, description, options);

    // 2. 创建协作任务
    const task: CollaborationTask = {
      taskId,
      title,
      description,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
      orchestratorAgentId: 'preset_architect',
      involvedAgents: [plan.orchestratorId, ...plan.requiredAgents.map(a => a.agentId)],
      subTasks: plan.subTasks.map((st, index) => ({
        assignmentId: `sub_${taskId}_${index}`,
        subTaskId: st.id,
        title: st.title,
        description: st.description,
        assignedTo: st.assignedTo,
        assignedToName: st.assignedToName,
        dependencies: st.dependencies,
        status: 'pending'
      })),
      executionLog: [{
        timestamp: now,
        type: 'system',
        message: `协作任务已创建，协调者: ${plan.orchestratorName}`
      }]
    };

    this.tasks.set(taskId, task);

    // 3. 开始执行
    this.executeCollaboration(taskId, options);

    return task;
  }

  /**
   * 规划协作
   */
  private async planCollaboration(
    orchestrator: ReActAgent,
    title: string,
    description: string,
    _options: CollaborationOptions
  ): Promise<{
    orchestratorId: string;
    orchestratorName: string;
    requiredAgents: { agentId: string; role: AgentRole; reason: string }[];
    subTasks: { id: string; title: string; description: string; assignedTo: string; assignedToName: string; dependencies: string[] }[];
  }> {
    logger.info('开始规划协作任务');

    // 获取所有可用 Agent
    const availableAgents = agentRegistry.getAllAgents()
      .filter(a => a.isActive)
      .map(a => ({
        agentId: a.agentId,
        name: a.name,
        role: a.role,
        description: a.description
      }));

    // 让协调者分析任务并规划
    const planQuery = `作为协调者，请分析以下任务并规划协作方案：

任务标题: ${title}
任务描述: ${description}

可用 Agent:
${availableAgents.map(a => `- ${a.name} (${a.role}): ${a.description}`).join('\n')}

请输出以下格式的规划方案：

## 任务分析
[分析这个任务需要什么能力]

## 需要的 Agent
[列出需要的 Agent 及其角色]

## 子任务分解
[将任务分解为可并行或串行的子任务，指定每个子任务的负责人]

格式：
1. [子任务名称] -> [Agent名称]
   描述: [详细描述]
   依赖: [依赖的其他子任务编号，没有则写"无"]

请确保：
1. 合理分配任务给最适合的 Agent
2. 明确任务依赖关系
3. 考虑并行执行的可能性`;

    const result = await orchestrator.execute(planQuery);

    // 解析规划结果（简化版，实际应该用更结构化的方式）
    const lines = result.finalAnswer.split('\n');
    const subTasks: { id: string; title: string; description: string; assignedTo: string; assignedToName: string; dependencies: string[] }[] = [];

    // 简单的解析逻辑
    let currentSubTask: Partial<typeof subTasks[0]> | null = null;

    for (const line of lines) {
      const taskMatch = line.match(/^\d+\.\s*(.+?)\s*->\s*(.+)$/);
      if (taskMatch) {
        if (currentSubTask && currentSubTask.title) {
          subTasks.push(currentSubTask as typeof subTasks[0]);
        }

        const agent = availableAgents.find(a => a.name.includes(taskMatch[2].trim()));
        currentSubTask = {
          id: `st_${subTasks.length}`,
          title: taskMatch[1].trim(),
          assignedTo: agent?.agentId || 'preset_developer',
          assignedToName: agent?.name || '程序员',
          dependencies: []
        };
      } else if (line.includes('描述:') && currentSubTask) {
        currentSubTask.description = line.replace('描述:', '').trim();
      } else if (line.includes('依赖:') && currentSubTask) {
        const depText = line.replace('依赖:', '').trim();
        if (depText !== '无') {
          // 简化处理，实际需要更复杂的解析
          currentSubTask.dependencies = [];
        }
      }
    }

    if (currentSubTask && currentSubTask.title) {
      subTasks.push(currentSubTask as typeof subTasks[0]);
    }

    // 如果没有解析到子任务，创建一个默认的
    if (subTasks.length === 0) {
      subTasks.push({
        id: 'st_0',
        title: '执行任务',
        description: description,
        assignedTo: 'preset_developer',
        assignedToName: '程序员',
        dependencies: []
      });
    }

    return {
      orchestratorId: 'preset_architect',
      orchestratorName: '架构师',
      requiredAgents: subTasks.map(st => ({
        agentId: st.assignedTo,
        role: 'developer',
        reason: `负责: ${st.title}`
      })),
      subTasks
    };
  }

  /**
   * 执行协作任务
   */
  private async executeCollaboration(taskId: string, options: CollaborationOptions): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = 'executing';
    task.updatedAt = new Date();

    this.emit('taskStarted', { taskId, task });

    try {
      // 按依赖顺序执行子任务
      const completedSubTaskIds = new Set<string>();

      while (completedSubTaskIds.size < task.subTasks.length) {
        // 找到可以执行的子任务（依赖已满足）
        const executableSubTasks = task.subTasks.filter(st =>
          st.status === 'pending' &&
          st.dependencies.every(dep => completedSubTaskIds.has(dep))
        );

        if (executableSubTasks.length === 0) {
          // 检查是否有失败的任务
          const failedTasks = task.subTasks.filter(st => st.status === 'failed');
          if (failedTasks.length > 0) {
            throw new Error(`子任务执行失败: ${failedTasks.map(t => t.title).join(', ')}`);
          }
          break;
        }

        if (options.parallelExecution) {
          // 并行执行
          await Promise.all(executableSubTasks.map(st =>
            this.executeSubTask(taskId, st, options)
          ));
        } else {
          // 串行执行
          for (const subTask of executableSubTasks) {
            await this.executeSubTask(taskId, subTask, options);
          }
        }

        // 更新已完成的子任务
        for (const st of task.subTasks) {
          if (st.status === 'completed') {
            completedSubTaskIds.add(st.subTaskId);
          }
        }
      }

      // 所有子任务完成，生成最终结果
      await this.generateFinalResult(taskId);

      task.status = 'completed';
      task.completedAt = new Date();
      task.updatedAt = new Date();

      this.emit('taskCompleted', { taskId, task });
      logger.info(`协作任务完成: ${task.title}`);

    } catch (error) {
      task.status = 'failed';
      task.updatedAt = new Date();

      task.executionLog.push({
        timestamp: new Date(),
        type: 'error',
        message: `协作任务失败: ${(error as Error).message}`
      });

      this.emit('taskFailed', { taskId, task, error });
      logger.error(`协作任务失败: ${task.title}`, error);
    }
  }

  /**
   * 执行子任务
   */
  private async executeSubTask(
    taskId: string,
    subTask: SubTaskAssignment,
    _options: CollaborationOptions
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    subTask.status = 'in_progress';
    subTask.startedAt = new Date();

    // 更新 Agent 状态
    agentRegistry.setAgentStatus(subTask.assignedTo, 'busy', taskId);

    task.executionLog.push({
      timestamp: new Date(),
      type: 'handoff',
      agentId: subTask.assignedTo,
      agentName: subTask.assignedToName,
      message: `开始执行子任务: ${subTask.title}`
    });

    this.emit('subTaskStarted', { taskId, subTask });

    try {
      // 获取或创建 Agent
      const agent = this.getOrCreateAgent(subTask.assignedTo);

      // 构建上下文
      const context: Record<string, unknown> = {
        parentTask: task.title,
        parentTaskDescription: task.description,
        subTaskTitle: subTask.title,
        subTaskDescription: subTask.description,
        completedSubTasks: task.subTasks
          .filter(st => st.status === 'completed')
          .map(st => ({ title: st.title, result: st.result }))
      };

      // 执行子任务
      const result = await agent.execute(
        `执行子任务: ${subTask.title}\n\n描述: ${subTask.description}`,
        context
      );

      subTask.status = 'completed';
      subTask.result = result.finalAnswer;
      subTask.completedAt = new Date();

      task.executionLog.push({
        timestamp: new Date(),
        type: 'completion',
        agentId: subTask.assignedTo,
        agentName: subTask.assignedToName,
        message: `完成子任务: ${subTask.title}`,
        details: { result: result.finalAnswer.substring(0, 200) + '...' }
      });

      // 更新 Agent 状态
      agentRegistry.recordTaskCompletion(subTask.assignedTo, true);

      this.emit('subTaskCompleted', { taskId, subTask });
      logger.info(`子任务完成: ${subTask.title}`);

    } catch (error) {
      subTask.status = 'failed';
      subTask.error = (error as Error).message;
      subTask.completedAt = new Date();

      task.executionLog.push({
        timestamp: new Date(),
        type: 'error',
        agentId: subTask.assignedTo,
        agentName: subTask.assignedToName,
        message: `子任务失败: ${subTask.title} - ${(error as Error).message}`
      });

      // 更新 Agent 状态
      agentRegistry.recordTaskCompletion(subTask.assignedTo, false);

      this.emit('subTaskFailed', { taskId, subTask, error });
      logger.error(`子任务失败: ${subTask.title}`, error);
    }
  }

  /**
   * 生成最终结果
   */
  private async generateFinalResult(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    task.status = 'reviewing';

    // 使用协调者整合所有子任务结果
    const orchestrator = this.getOrCreateAgent(task.orchestratorAgentId);

    const integrationQuery = `作为协调者，请整合以下子任务结果，生成最终报告：

原始任务: ${task.title}
描述: ${task.description}

子任务结果:
${task.subTasks.map(st => `
## ${st.title} (${st.assignedToName})
状态: ${st.status}
结果: ${st.result || '无结果'}
${st.error ? `错误: ${st.error}` : ''}
`).join('\n')}

请生成：
1. 执行摘要
2. 关键成果
3. 遇到的问题（如有）
4. 建议和改进

最终报告:`;

    const result = await orchestrator.execute(integrationQuery);

    task.finalResult = result.finalAnswer;

    task.executionLog.push({
      timestamp: new Date(),
      type: 'system',
      message: '已生成最终报告'
    });
  }

  /**
   * 获取或创建 Agent 实例
   */
  private getOrCreateAgent(agentId: string, model?: string): ReActAgent {
    if (this.activeAgents.has(agentId)) {
      return this.activeAgents.get(agentId)!;
    }

    const config = agentRegistry.getAgent(agentId);
    if (!config) {
      throw new Error(`Agent 不存在: ${agentId}`);
    }

    const agent = createReActAgent({
      model: model || config.model,
      temperature: config.temperature,
      maxIterations: config.maxIterations
    });

    this.activeAgents.set(agentId, agent);
    return agent;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): CollaborationTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): CollaborationTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }

    task.status = 'failed';
    task.updatedAt = new Date();

    task.executionLog.push({
      timestamp: new Date(),
      type: 'system',
      message: '任务已被取消'
    });

    this.emit('taskCancelled', { taskId, task });
    return true;
  }

  /**
   * 生成任务报告
   */
  generateReport(taskId: string): string {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const lines: string[] = [
      `# 协作任务报告: ${task.title}`,
      '',
      `**任务ID**: ${task.taskId}`,
      `**状态**: ${task.status}`,
      `**创建时间**: ${task.createdAt.toLocaleString()}`,
      `**完成时间**: ${task.completedAt?.toLocaleString() || '未完成'}`,
      '',
      '## 任务描述',
      task.description,
      '',
      '## 参与 Agent',
      ...task.involvedAgents.map(agentId => {
        const agent = agentRegistry.getAgent(agentId);
        return `- ${agent?.name || agentId} (${agent?.role || 'unknown'})`;
      }),
      '',
      '## 子任务执行',
      ...task.subTasks.map(st => [
        `### ${st.title}`,
        `- **负责人**: ${st.assignedToName}`,
        `- **状态**: ${st.status}`,
        `- **开始时间**: ${st.startedAt?.toLocaleString() || 'N/A'}`,
        `- **完成时间**: ${st.completedAt?.toLocaleString() || 'N/A'}`,
        st.result ? `- **结果**: ${st.result.substring(0, 500)}...` : '',
        st.error ? `- **错误**: ${st.error}` : '',
        ''
      ].join('\n')),
      '',
      '## 执行日志',
      ...task.executionLog.map(log =>
        `- [${log.timestamp.toLocaleTimeString()}] [${log.type}] ${log.agentName ? `(${log.agentName}) ` : ''}${log.message}`
      ),
      '',
      '## 最终结果',
      task.finalResult || '暂无最终结果'
    ];

    return lines.join('\n');
  }
}

// 导出单例
export const multiAgentEngine = new MultiAgentEngine();
