/**
 * ReAct Agent 实现
 *
 * ReAct = Reasoning (推理) + Acting (行动)
 *
 * 核心循环:
 * Thought → Action → Observation → ... → Final Answer
 *
 * 参考论文: ReAct: Synergizing Reasoning and Acting in Language Models
 */

import { createLogger } from '../../utils/logger';
import { chatCompletion, ChatMessage } from '../ai';
import { executeTool, ToolResult, toolRegistry } from './ToolExecutor';

const logger = createLogger('ReActAgent');

/**
 * ReAct 步骤类型
 */
export type ReActStepType = 'thought' | 'action' | 'observation' | 'final_answer';

/**
 * ReAct 步骤
 */
export interface ReActStep {
  type: ReActStepType;
  content: string;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  toolResult?: ToolResult;
  timestamp: Date;
}

/**
 * ReAct 执行结果
 */
export interface ReActResult {
  success: boolean;
  finalAnswer: string;
  steps: ReActStep[];
  totalTokens: number;
  executionTime: number;
}

/**
 * ReAct Agent 配置
 */
export interface ReActConfig {
  maxIterations: number;      // 最大迭代次数
  temperature: number;        // AI 温度
  model?: string;             // 指定模型
  requireConfirmation: boolean; // 是否需要人工确认
  timeout?: number;           // 超时时间（毫秒）
}

/**
 * ReAct Agent 类
 */
export class ReActAgent {
  private steps: ReActStep[] = [];
  private config: ReActConfig;
  private totalTokens = 0;
  private startTime: number = 0;

  constructor(config: Partial<ReActConfig> = {}) {
    this.config = {
      maxIterations: config.maxIterations ?? 10,
      temperature: config.temperature ?? 0.7,
      model: config.model,
      requireConfirmation: config.requireConfirmation ?? false,
      timeout: config.timeout ?? 300000, // 5分钟默认超时
    };
  }

  /**
   * 执行 ReAct 循环
   */
  async execute(query: string, context?: Record<string, unknown>): Promise<ReActResult> {
    this.startTime = Date.now();
    this.steps = [];
    this.totalTokens = 0;

    logger.info(`开始 ReAct 执行: ${query}`);

    try {
      // 构建系统提示
      const systemPrompt = this.buildSystemPrompt();

      // 构建初始消息
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: this.buildUserPrompt(query, context) }
      ];

      // ReAct 循环
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        logger.info(`ReAct 迭代 ${iteration + 1}/${this.config.maxIterations}`);

        // 1. 让 AI 思考并决定下一步
        const aiResponse = await this.callAI(messages);

        // 2. 解析 AI 响应
        const parsed = this.parseAIResponse(aiResponse);

        if (parsed.type === 'final_answer') {
          // 得到最终答案
          this.addStep({
            type: 'final_answer',
            content: parsed.content,
            timestamp: new Date()
          });

          return {
            success: true,
            finalAnswer: parsed.content,
            steps: this.steps,
            totalTokens: this.totalTokens,
            executionTime: Date.now() - this.startTime
          };
        }

        if (parsed.type === 'action') {
          // 执行工具调用
          this.addStep({
            type: 'thought',
            content: parsed.thought,
            timestamp: new Date()
          });

          this.addStep({
            type: 'action',
            content: `调用工具: ${parsed.toolName}`,
            toolName: parsed.toolName,
            toolParameters: parsed.toolParameters,
            timestamp: new Date()
          });

          // 执行工具
          const toolResult = await executeTool(
            parsed.toolName!,
            parsed.toolParameters || {}
          );

          // 添加观察结果
          const observation = this.formatToolResult(toolResult);
          this.addStep({
            type: 'observation',
            content: observation,
            toolResult,
            timestamp: new Date()
          });

          // 更新消息历史
          messages.push(
            { role: 'assistant', content: aiResponse },
            { role: 'user', content: `Observation: ${observation}\n\nContinue with your next thought and action, or provide the final answer.` }
          );
        }
      }

      // 达到最大迭代次数
      return {
        success: false,
        finalAnswer: '达到最大迭代次数限制，未能完成任务',
        steps: this.steps,
        totalTokens: this.totalTokens,
        executionTime: Date.now() - this.startTime
      };

    } catch (error) {
      logger.error('ReAct 执行失败', error);
      return {
        success: false,
        finalAnswer: `执行失败: ${(error as Error).message}`,
        steps: this.steps,
        totalTokens: this.totalTokens,
        executionTime: Date.now() - this.startTime
      };
    }
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(): string {
    const tools = toolRegistry.getAll();
    const toolDescriptions = tools.map(t => {
      const params = Object.entries(t.parameters.properties)
        .map(([name, prop]) => `    - ${name}: ${prop.type} - ${prop.description}`)
        .join('\n');
      return `- ${t.name}: ${t.description}\n  参数:\n${params}`;
    }).join('\n\n');

    return `You are a helpful AI assistant that can use tools to solve problems.

You must follow the ReAct pattern (Reasoning + Acting):

1. **Thought**: Think about what you need to do
2. **Action**: Use a tool to accomplish a step
3. **Observation**: Review the result
4. Repeat until you can provide the **Final Answer**

## Available Tools

${toolDescriptions}

## Response Format

You must respond in one of these formats:

### Format 1: Thought + Action

carefully analyze the problem and plan your approach. Consider what information you need and which tool would help you get it. Break down complex tasks into manageable steps.

Action: [ToolName]
Parameters: {
  "param1": "value1",
  "param2": "value2"
}

### Format 2: Final Answer

synthesize all the information gathered through your actions and observations. Provide a clear, comprehensive answer that directly addresses the original question. Include relevant details and insights from your investigation.

Final Answer: [Your comprehensive answer here]

## Important Rules

1. Always start with a Thought
2. Use Action to call tools when needed
3. Wait for Observation before next step
4. Provide Final Answer when task is complete
5. Be thorough but efficient
6. If a tool fails, try alternative approaches`;
  }

  /**
   * 构建用户提示
   */
  private buildUserPrompt(query: string, context?: Record<string, unknown>): string {
    let prompt = `Task: ${query}\n\n`;

    if (context && Object.keys(context).length > 0) {
      prompt += 'Context:\n';
      for (const [key, value] of Object.entries(context)) {
        prompt += `- ${key}: ${JSON.stringify(value)}\n`;
      }
      prompt += '\n';
    }

    prompt += 'Please solve this task using the ReAct pattern. Start with your thought process.';
    return prompt;
  }

  /**
   * 调用 AI
   */
  private async callAI(messages: ChatMessage[]): Promise<string> {
    const result = await chatCompletion({
      messages,
      temperature: this.config.temperature,
      model: this.config.model,
      maxTokens: 4000
    });

    this.totalTokens += result.tokens.total;
    return result.content;
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(response: string): {
    type: 'thought' | 'action' | 'final_answer';
    thought: string;
    content: string;
    toolName?: string;
    toolParameters?: Record<string, unknown>;
  } {
    // 检查是否是最终答案
    const finalAnswerMatch = response.match(/Final Answer:\s*([\s\S]+)$/i);
    if (finalAnswerMatch) {
      return {
        type: 'final_answer',
        thought: '',
        content: finalAnswerMatch[1].trim()
      };
    }

    // 解析 Thought 和 Action
    const thoughtMatch = response.match(/Thought:\s*([\s\S]+?)(?=Action:|$)/i);
    const actionMatch = response.match(/Action:\s*(\w+)/i);
    const paramsMatch = response.match(/Parameters:\s*(\{[\s\S]*\})/i);

    if (actionMatch) {
      return {
        type: 'action',
        thought: thoughtMatch ? thoughtMatch[1].trim() : '',
        content: response,
        toolName: actionMatch[1].trim(),
        toolParameters: paramsMatch ? JSON.parse(paramsMatch[1]) : {}
      };
    }

    // 默认返回为思考
    return {
      type: 'thought',
      thought: response,
      content: response
    };
  }

  /**
   * 格式化工具结果
   */
  private formatToolResult(result: ToolResult): string {
    if (result.success) {
      return `Tool executed successfully. Result: ${JSON.stringify(result.data, null, 2)}`;
    } else {
      return `Tool execution failed. Error: ${result.error}`;
    }
  }

  /**
   * 添加步骤
   */
  private addStep(step: ReActStep): void {
    this.steps.push(step);
    logger.info(`ReAct Step [${step.type}]: ${step.content.substring(0, 100)}...`);
  }

  /**
   * 获取执行历史
   */
  getHistory(): ReActStep[] {
    return [...this.steps];
  }

  /**
   * 生成执行报告
   */
  generateReport(): string {
    const lines: string[] = [
      '# ReAct Execution Report',
      '',
      `Total Steps: ${this.steps.length}`,
      `Total Tokens: ${this.totalTokens}`,
      `Execution Time: ${Date.now() - this.startTime}ms`,
      '',
      '## Execution Flow',
      ''
    ];

    for (const step of this.steps) {
      lines.push(`### ${step.type.toUpperCase()}`);
      lines.push(step.content);
      if (step.toolName) {
        lines.push(`\n**Tool:** ${step.toolName}`);
        lines.push(`**Parameters:** ${JSON.stringify(step.toolParameters, null, 2)}`);
      }
      if (step.toolResult) {
        lines.push(`\n**Result:** ${step.toolResult.success ? 'Success' : 'Failed'}`);
        if (step.toolResult.data) {
          lines.push(`\n\`\`\`json\n${JSON.stringify(step.toolResult.data, null, 2)}\n\`\`\``);
        }
        if (step.toolResult.error) {
          lines.push(`\n**Error:** ${step.toolResult.error}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * 创建 ReAct Agent 实例
 */
export function createReActAgent(config?: Partial<ReActConfig>): ReActAgent {
  return new ReActAgent(config);
}
