/**
 * 任务规划模块
 * 
 * 将用户输入的复杂任务分解为可执行的子任务
 */

import { createLogger } from '../../utils/logger';
import { chatCompletion, ChatMessage } from '../ai';

const logger = createLogger('TaskPlanner');

/**
 * 子任务定义
 */
export interface SubTask {
  id: string;
  name: string;
  description: string;
  tool?: string;              // 需要使用的工具
  parameters?: Record<string, unknown>;  // 工具参数
  dependencies: string[];     // 依赖的其他子任务 ID
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;           // 执行结果
  error?: string;             // 错误信息
}

/**
 * 任务计划
 */
export interface TaskPlan {
  taskId: string;
  originalRequest: string;
  goal: string;
  subtasks: SubTask[];
  estimatedSteps: number;
  createdAt: Date;
}

/**
 * 规划提示词模板
 */
const PLANNING_PROMPT = `你是一个任务规划专家。请将用户的请求分解为具体的执行步骤。

要求：
1. 分析用户需求，理解目标
2. 将任务分解为 2-10 个子任务
3. 每个子任务应该是原子性的（不可再分）
4. 明确子任务之间的依赖关系
5. 为每个子任务指定合适的工具（如果需要）

可用工具：
- file_read: 读取文件内容
- file_write: 写入文件内容
- file_list: 列出目录文件
- web_search: 网络搜索
- code_execute: 执行代码
- shell_command: 执行 shell 命令
- database_query: 数据库查询
- http_request: HTTP 请求
- wait: 等待一段时间

输出格式必须是 JSON：
{
  "goal": "任务目标描述",
  "subtasks": [
    {
      "id": "step_1",
      "name": "步骤名称",
      "description": "详细描述",
      "tool": "工具名称",
      "parameters": { "参数名": "参数值" },
      "dependencies": []
    }
  ]
}

只输出 JSON，不要其他内容。`;

/**
 * 任务规划器
 */
export class TaskPlanner {
  /**
   * 分析用户需求并生成任务计划
   */
  async createPlan(userRequest: string): Promise<TaskPlan> {
    logger.info(`开始规划任务: ${userRequest}`);

    const messages: ChatMessage[] = [
      { role: 'system', content: PLANNING_PROMPT },
      { role: 'user', content: `请为以下请求制定执行计划：\n\n${userRequest}` }
    ];

    try {
      // 调用 AI 生成任务计划
      const response = await chatCompletion({
        messages,
        temperature: 0.3,
        maxTokens: 2000
      });

      // 解析 JSON 响应
      const planData = this.extractJson(response.content);
      
      if (!planData) {
        throw new Error('无法解析任务计划');
      }

      // 构建任务计划
      const taskPlan: TaskPlan = {
        taskId: this.generateTaskId(),
        originalRequest: userRequest,
        goal: planData.goal,
        subtasks: planData.subtasks.map((st: Partial<SubTask>, index: number) => ({
          id: st.id || `step_${index + 1}`,
          name: st.name || `步骤 ${index + 1}`,
          description: st.description || '',
          tool: st.tool,
          parameters: st.parameters || {},
          dependencies: st.dependencies || [],
          status: 'pending'
        })),
        estimatedSteps: planData.subtasks.length,
        createdAt: new Date()
      };

      logger.info(`任务计划生成完成: ${taskPlan.taskId}, 共 ${taskPlan.subtasks.length} 个子任务`);
      return taskPlan;

    } catch (error) {
      logger.error('任务规划失败:', error);
      throw error;
    }
  }

  /**
   * 从 AI 响应中提取 JSON
   */
  private extractJson(content: string): { goal: string; subtasks: Partial<SubTask>[] } | null {
    try {
      // 尝试直接解析
      return JSON.parse(content);
    } catch {
      // 尝试从代码块中提取
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // 继续尝试其他方式
        }
      }

      // 尝试从文本中提取 JSON 对象
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // 解析失败
        }
      }
    }

    return null;
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 优化任务计划
   * 根据执行过程中的反馈调整计划
   */
  async optimizePlan(plan: TaskPlan, feedback: string): Promise<TaskPlan> {
    logger.info(`优化任务计划: ${plan.taskId}`);

    const messages: ChatMessage[] = [
      { role: 'system', content: PLANNING_PROMPT },
      { role: 'user', content: `原始请求: ${plan.originalRequest}` },
      { role: 'assistant', content: JSON.stringify({ goal: plan.goal, subtasks: plan.subtasks }) },
      { role: 'user', content: `执行过程中遇到问题，请优化计划：\n${feedback}` }
    ];

    const response = await chatCompletion({
      messages,
      temperature: 0.3,
      maxTokens: 2000
    });

    const planData = this.extractJson(response.content);
    
    if (planData) {
      plan.goal = planData.goal;
      plan.subtasks = planData.subtasks.map((st: Partial<SubTask>, index: number) => ({
        id: st.id || `step_${index + 1}`,
        name: st.name || `步骤 ${index + 1}`,
        description: st.description || '',
        tool: st.tool,
        parameters: st.parameters || {},
        dependencies: st.dependencies || [],
        status: 'pending'
      }));
    }

    return plan;
  }
}

export const taskPlanner = new TaskPlanner();
