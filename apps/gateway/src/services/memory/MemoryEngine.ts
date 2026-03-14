/**
 * 长期记忆引擎
 * 提供高级记忆功能：自动总结、复盘、优先级调整
 */

import { MemoryStore } from './MemoryStore';
import { chatCompletion } from '../ai';
import { logger } from '../../utils/logger';
import {
  BaseMemory,
  MemoryType,
  MemoryStatus,
  MemoryPriority,
  MemoryConfidence,
  StrategicMemory,
  FirstPrincipleMemory,
  FundamentalLogicMemory,
  ExperienceMemory,
  ReviewRecord,
  ReviewDecision,
  ActionItem,
  MemoryQuery
} from './types';

export interface MemoryContext {
  currentTask?: string;
  currentGoal?: string;
  recentMemories?: BaseMemory[];
  userPreferences?: Record<string, unknown>;
  agentRole?: string;
}

export interface MemoryInsight {
  type: 'pattern' | 'contradiction' | 'gap' | 'opportunity';
  description: string;
  relatedMemories: string[];
  confidence: number;
  recommendation?: string;
}

export class MemoryEngine {
  private store: MemoryStore;
  private model?: string;

  constructor(store: MemoryStore, model?: string) {
    this.store = store;
    this.model = model;
  }

  /**
   * 调用 AI 生成内容
   */
  private async callAI(prompt: string): Promise<string> {
    try {
      const result = await chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: '你是一个专业的分析助手，请提供结构化的分析结果。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 2000
      });
      return result.content;
    } catch (error) {
      logger.error('AI 调用失败:', error);
      throw error;
    }
  }

  /**
   * 创建战略目标记忆
   */
  async createStrategicMemory(params: {
    title: string;
    vision?: string;
    mission?: string;
    objective: string;
    keyResults: { description: string; target: number; unit: string; deadline: Date }[];
    milestones: { title: string; description: string; targetDate: Date }[];
    startDate: Date;
    targetDate: Date;
    rationale: string;
    stickiness: number;
    userId?: string;
    agentId?: string;
    tags?: string[];
  }): Promise<StrategicMemory> {
    logger.info(`创建战略目标记忆: ${params.title}`);

    const memory = await this.store.createMemory({
      type: MemoryType.STRATEGIC,
      title: params.title,
      content: params.objective,
      priority: MemoryPriority.CRITICAL,
      confidence: MemoryConfidence.HIGH,
      status: MemoryStatus.ACTIVE,
      userId: params.userId,
      agentId: params.agentId,
      tags: [...(params.tags || []), 'strategic', 'goal'],
      category: 'strategic',
      source: 'strategic_planning',
      typeSpecificData: {
        goalLevel: 'objective',
        vision: params.vision,
        mission: params.mission,
        objective: params.objective,
        keyResults: params.keyResults.map((kr, i) => ({
          id: `kr_${i}`,
          ...kr,
          current: 0,
          status: 'not_started'
        })),
        milestones: params.milestones.map((m, i) => ({
          id: `ms_${i}`,
          ...m,
          status: 'pending'
        })),
        startDate: params.startDate,
        targetDate: params.targetDate,
        progress: 0,
        subGoalIds: [],
        stickiness: params.stickiness,
        rationale: params.rationale,
        reviewHistory: []
      }
    });

    return memory as StrategicMemory;
  }

  /**
   * 创建第一性原理分析记忆
   */
  async createFirstPrincipleMemory(params: {
    title: string;
    problemStatement: string;
    problemDomain: string;
    userId?: string;
    agentId?: string;
    taskId?: string;
    tags?: string[];
  }): Promise<FirstPrincipleMemory> {
    logger.info(`创建第一性原理分析: ${params.title}`);

    // 使用 AI 进行第一性原理分析
    const analysis = await this.performFirstPrincipleAnalysis(
      params.problemStatement,
      params.problemDomain
    );

    const memory = await this.store.createMemory({
      type: MemoryType.FIRST_PRINCIPLE,
      title: params.title,
      content: analysis.conclusion,
      priority: MemoryPriority.HIGH,
      confidence: analysis.confidence,
      status: MemoryStatus.PENDING, // 需要验证
      userId: params.userId,
      agentId: params.agentId,
      taskId: params.taskId,
      tags: [...(params.tags || []), 'first_principle', 'analysis'],
      category: 'analysis',
      source: 'ai_analysis',
      typeSpecificData: {
        problemStatement: params.problemStatement,
        problemDomain: params.problemDomain,
        decomposition: analysis.decomposition,
        fundamentalTruths: analysis.fundamentalTruths,
        reasoningChain: analysis.reasoningChain,
        conclusion: analysis.conclusion,
        implications: analysis.implications,
        validated: false
      }
    });

    return memory as FirstPrincipleMemory;
  }

  /**
   * 创建底层逻辑记忆
   */
  async createFundamentalLogicMemory(params: {
    title: string;
    pattern: string;
    patternType: 'causal' | 'correlation' | 'system' | 'behavioral' | 'structural';
    causeEffectChain: { cause: string; effect: string; mechanism: string; strength: number }[];
    conditions: { condition: string; necessity: 'required' | 'preferred' | 'optional'; impact: number }[];
    userId?: string;
    agentId?: string;
    tags?: string[];
  }): Promise<FundamentalLogicMemory> {
    logger.info(`创建底层逻辑记忆: ${params.title}`);

    const memory = await this.store.createMemory({
      type: MemoryType.FUNDAMENTAL,
      title: params.title,
      content: params.pattern,
      priority: MemoryPriority.HIGH,
      confidence: MemoryConfidence.MODERATE,
      status: MemoryStatus.PENDING,
      userId: params.userId,
      agentId: params.agentId,
      tags: [...(params.tags || []), 'fundamental', 'logic', params.patternType],
      category: 'fundamental_logic',
      source: 'pattern_extraction',
      typeSpecificData: {
        pattern: params.pattern,
        patternType: params.patternType,
        causeEffectChain: params.causeEffectChain.map((link, i) => ({
          id: `cel_${i}`,
          ...link
        })),
        conditions: params.conditions.map((c, i) => ({
          id: `cond_${i}`,
          ...c
        })),
        constraints: [],
        predictivePower: 0,
        edgeCases: [],
        validationHistory: []
      }
    });

    return memory as FundamentalLogicMemory;
  }

  /**
   * 从任务执行中提取经验记忆
   */
  async extractExperienceFromTask(
    taskId: string,
    taskDescription: string,
    executionResult: {
      success: boolean;
      actions: string[];
      outcome: string;
      learnings: string[];
    },
    agentId?: string
  ): Promise<ExperienceMemory> {
    logger.info(`从任务提取经验: ${taskId}`);

    // 使用 AI 分析经验
    const analysis = await this.analyzeExperience(
      taskDescription,
      executionResult
    );

    const memory = await this.store.createMemory({
      type: MemoryType.EXPERIENCE,
      title: `经验: ${taskDescription.substring(0, 50)}...`,
      content: analysis.summary,
      priority: analysis.importance > 70 ? MemoryPriority.HIGH : MemoryPriority.MEDIUM,
      confidence: analysis.confidence,
      status: MemoryStatus.ACTIVE,
      agentId,
      taskId,
      tags: ['experience', executionResult.success ? 'success' : 'failure'],
      category: 'experience',
      source: 'task_execution',
      typeSpecificData: {
        context: taskDescription,
        action: executionResult.actions.join(', '),
        result: executionResult.success ? 'success' : 'failure',
        whatWorked: analysis.whatWorked,
        whatDidntWork: analysis.whatDidntWork,
        rootCauses: analysis.rootCauses,
        insights: analysis.insights,
        lessons: analysis.lessons,
        reusable: analysis.reusable,
        applicableContexts: analysis.applicableContexts,
        improvements: analysis.improvements
      }
    });

    return memory as ExperienceMemory;
  }

  /**
   * 执行复盘
   */
  async conductReview(
    memoryId: string,
    reviewType: 'weekly' | 'monthly' | 'quarterly' | 'milestone' | 'ad_hoc',
    context: {
      originalPlan: string;
      actualOutcome: string;
      successes: string[];
      failures: string[];
    }
  ): Promise<ReviewRecord> {
    logger.info(`执行复盘: ${memoryId} [${reviewType}]`);

    const memory = await this.store.getMemory(memoryId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    // 使用 AI 进行复盘分析
    const reviewAnalysis = await this.analyzeReview(context);

    const review: ReviewRecord = {
      id: `review_${Date.now()}`,
      timestamp: new Date(),
      reviewType,
      originalPlan: context.originalPlan,
      actualOutcome: context.actualOutcome,
      variance: reviewAnalysis.variance,
      successes: context.successes,
      failures: context.failures,
      surprises: reviewAnalysis.surprises,
      keyInsights: reviewAnalysis.insights,
      patternRecognition: reviewAnalysis.patterns,
      decisions: reviewAnalysis.decisions,
      actionItems: reviewAnalysis.actions
    };

    // 保存复盘记录
    await this.store.addReviewRecord(memoryId, review);

    // 根据复盘结果调整记忆
    await this.adjustBasedOnReview(memoryId, review);

    return review;
  }

  /**
   * 检索相关记忆
   */
  async retrieveRelevantMemories(
    query: string,
    context: MemoryContext,
    limit: number = 10
  ): Promise<BaseMemory[]> {
    logger.debug(`检索相关记忆: ${query}`);

    // 构建查询
    const memoryQuery: MemoryQuery = {
      searchQuery: query,
      status: [MemoryStatus.ACTIVE, MemoryStatus.PENDING],
      sortBy: 'relevance',
      limit: limit * 2 // 获取更多以便筛选
    };

    // 根据上下文添加过滤
    if (context.agentRole) {
      memoryQuery.tags = [context.agentRole];
    }

    // 搜索记忆
    const results = await this.store.searchMemories(memoryQuery);

    // 使用 AI 进行相关性重排序
    const reranked = await this.rerankByRelevance(
      results.map(r => r.memory),
      query,
      context
    );

    return reranked.slice(0, limit);
  }

  /**
   * 生成记忆洞察
   */
  async generateInsights(): Promise<MemoryInsight[]> {
    logger.info('生成记忆洞察');

    // 获取最近的记忆
    const recentMemories = await this.store.searchMemories({
      createdAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      limit: 100
    });

    const memories = recentMemories.map(r => r.memory);

    // 使用 AI 分析模式
    const insights = await this.analyzePatterns(memories);

    return insights;
  }

  /**
   * 自动总结和归档
   */
  async autoSummarizeAndArchive(): Promise<void> {
    logger.info('执行自动总结和归档');

    // 获取需要处理的记忆
    const oldMemories = await this.store.searchMemories({
      createdBefore: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      status: [MemoryStatus.ACTIVE],
      limit: 100
    });

    for (const result of oldMemories) {
      const memory = result.memory;

      // 检查是否需要归档
      if (memory.accessCount < 5 && memory.priority < MemoryPriority.HIGH) {
        await this.store.updateMemoryStatus(
          memory.memoryId,
          MemoryStatus.ARCHIVED,
          '长时间未访问，自动归档'
        );
        logger.debug(`归档记忆: ${memory.memoryId}`);
      }
    }
  }

  /**
   * 决定坚持、放弃或尝试新方向
   */
  async makeStrategicDecision(
    goalMemoryId: string
  ): Promise<{
    decision: 'continue' | 'stop' | 'pivot' | 'accelerate' | 'decelerate';
    rationale: string;
    confidence: number;
    newApproach?: string;
  }> {
    logger.info(`战略决策分析: ${goalMemoryId}`);

    const memory = await this.store.getMemory(goalMemoryId);
    if (!memory || memory.type !== MemoryType.STRATEGIC) {
      throw new Error('战略目标记忆不存在');
    }

    const strategicMemory = memory as StrategicMemory;

    // 获取相关经验
    const relatedExperiences = await this.store.searchMemories({
      types: [MemoryType.EXPERIENCE],
      tags: strategicMemory.tags,
      limit: 20
    });

    // 使用 AI 进行决策分析
    const decision = await this.analyzeStrategicDecision(
      strategicMemory,
      relatedExperiences.map(r => r.memory as ExperienceMemory)
    );

    // 执行决策
    switch (decision.decision) {
      case 'stop':
        await this.store.updateMemoryStatus(
          goalMemoryId,
          MemoryStatus.DEPRECATED,
          decision.rationale
        );
        break;
      case 'pivot':
        await this.store.updateMemoryStatus(
          goalMemoryId,
          MemoryStatus.PENDING,
          `转向新方向: ${decision.newApproach}`
        );
        break;
      case 'accelerate':
        await this.store.adjustPriority(
          goalMemoryId,
          MemoryPriority.CRITICAL,
          decision.rationale
        );
        break;
      case 'decelerate':
        await this.store.adjustPriority(
          goalMemoryId,
          MemoryPriority.LOW,
          decision.rationale
        );
        break;
    }

    return decision;
  }

  // 私有辅助方法

  private async performFirstPrincipleAnalysis(
    problem: string,
    domain: string
  ): Promise<{
    decomposition: any[];
    fundamentalTruths: any[];
    reasoningChain: any[];
    conclusion: string;
    implications: string[];
    confidence: MemoryConfidence;
  }> {
    const prompt = `请对以下问题进行第一性原理分析：

问题：${problem}
领域：${domain}

请提供：
1. 问题分解（将问题拆解到最基本的组成部分）
2. 基本真理（不可再简化的基本事实）
3. 推理链（从基本真理推导出结论的逻辑过程）
4. 结论
5. 启示/影响

以 JSON 格式输出。`;

    try {
      const response = await this.callAI(prompt);
      const analysis = JSON.parse(response);

      return {
        decomposition: analysis.decomposition || [],
        fundamentalTruths: analysis.fundamentalTruths || [],
        reasoningChain: analysis.reasoningChain || [],
        conclusion: analysis.conclusion || '',
        implications: analysis.implications || [],
        confidence: analysis.confidence > 0.8 ? MemoryConfidence.HIGH : MemoryConfidence.MODERATE
      };
    } catch (error) {
      logger.error('第一性原理分析失败', error);
      return {
        decomposition: [],
        fundamentalTruths: [],
        reasoningChain: [],
        conclusion: '分析失败',
        implications: [],
        confidence: MemoryConfidence.LOW
      };
    }
  }

  private async analyzeExperience(
    taskDescription: string,
    executionResult: any
  ): Promise<{
    summary: string;
    whatWorked: string[];
    whatDidntWork: string[];
    rootCauses: string[];
    insights: string[];
    lessons: string[];
    reusable: boolean;
    applicableContexts: string[];
    improvements: any[];
    importance: number;
    confidence: MemoryConfidence;
  }> {
    const prompt = `请分析以下任务执行经验：

任务：${taskDescription}
结果：${executionResult.success ? '成功' : '失败'}
行动：${executionResult.actions.join(', ')}
产出：${executionResult.outcome}
学习点：${executionResult.learnings.join(', ')}

请提供：
1. 经验总结
2. 有效的方法
3. 无效的方法
4. 根本原因
5. 关键洞察
6. 教训
7. 是否可复用
8. 适用场景
9. 改进建议
10. 重要程度(0-100)

以 JSON 格式输出。`;

    try {
      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('经验分析失败', error);
      return {
        summary: '分析失败',
        whatWorked: [],
        whatDidntWork: [],
        rootCauses: [],
        insights: [],
        lessons: [],
        reusable: false,
        applicableContexts: [],
        improvements: [],
        importance: 50,
        confidence: MemoryConfidence.LOW
      };
    }
  }

  private async analyzeReview(context: any): Promise<{
    variance: string;
    surprises: string[];
    insights: string[];
    patterns: string[];
    decisions: ReviewDecision[];
    actions: ActionItem[];
  }> {
    const prompt = `请对以下执行结果进行复盘分析：

原计划：${context.originalPlan}
实际结果：${context.actualOutcome}
成功之处：${context.successes.join(', ')}
失败之处：${context.failures.join(', ')}

请提供：
1. 差异分析
2. 意外发现
3. 关键洞察
4. 模式识别
5. 决策建议（继续/停止/转向/加速/减速）
6. 行动项

以 JSON 格式输出。`;

    try {
      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('复盘分析失败', error);
      return {
        variance: '分析失败',
        surprises: [],
        insights: [],
        patterns: [],
        decisions: [],
        actions: []
      };
    }
  }

  private async adjustBasedOnReview(memoryId: string, review: ReviewRecord): Promise<void> {
    for (const decision of review.decisions) {
      switch (decision.decision) {
        case 'stop':
          await this.store.updateMemoryStatus(memoryId, MemoryStatus.DEPRECATED, decision.rationale);
          break;
        case 'pivot':
          await this.store.updateMemoryStatus(memoryId, MemoryStatus.PENDING, decision.rationale);
          break;
        case 'accelerate':
          await this.store.adjustPriority(memoryId, MemoryPriority.HIGH, decision.rationale);
          break;
        case 'decelerate':
          await this.store.adjustPriority(memoryId, MemoryPriority.LOW, decision.rationale);
          break;
      }
    }
  }

  private async rerankByRelevance(
    memories: BaseMemory[],
    _query: string,
    context: MemoryContext
  ): Promise<BaseMemory[]> {
    // 简化的重排序逻辑
    // 在实际实现中，可以使用 embedding 相似度
    return memories.sort((a, b) => {
      let scoreA = a.priority + a.confidence;
      let scoreB = b.priority + b.confidence;

      // 根据上下文调整
      if (context.agentRole && a.tags.includes(context.agentRole)) scoreA += 20;
      if (context.agentRole && b.tags.includes(context.agentRole)) scoreB += 20;

      return scoreB - scoreA;
    });
  }

  private async analyzePatterns(memories: BaseMemory[]): Promise<MemoryInsight[]> {
    const prompt = `请分析以下记忆中的模式：

${memories.map(m => `- ${m.title}: ${m.content}`).join('\n')}

请识别：
1. 重复出现的模式
2. 矛盾或冲突
3. 知识空白
4. 机会点

以 JSON 数组格式输出。`;

    try {
      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('模式分析失败', error);
      return [];
    }
  }

  private async analyzeStrategicDecision(
    goal: StrategicMemory,
    experiences: ExperienceMemory[]
  ): Promise<{
    decision: 'continue' | 'stop' | 'pivot' | 'accelerate' | 'decelerate';
    rationale: string;
    confidence: number;
    newApproach?: string;
  }> {
    const prompt = `请对以下战略目标进行决策分析：

目标：${goal.title}
描述：${goal.content}
进度：${goal.progress}%
坚持度：${goal.stickiness}
原因：${goal.rationale}

相关经验：
${experiences.map(e => `- ${e.result}: ${e.content}`).join('\n')}

请决定：
1. 继续 (continue)
2. 停止 (stop)
3. 转向 (pivot)
4. 加速 (accelerate)
5. 减速 (decelerate)

提供决策、理由、置信度和新方向（如适用）。

以 JSON 格式输出。`;

    try {
      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('战略决策分析失败', error);
      return {
        decision: 'continue',
        rationale: '分析失败，默认继续',
        confidence: 0.5
      };
    }
  }
}
