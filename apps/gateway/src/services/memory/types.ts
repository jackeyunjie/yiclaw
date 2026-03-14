/**
 * 长期记忆系统 - 类型定义
 * 支持结构化记忆：战略目标、第一性原理、底层逻辑、复盘总结
 */

/**
 * 记忆类型枚举
 */
export enum MemoryType {
  STRATEGIC = 'strategic',      // 战略目标记忆
  FIRST_PRINCIPLE = 'first_principle',  // 第一性原理分析
  FUNDAMENTAL = 'fundamental',  // 底层逻辑
  EXPERIENCE = 'experience',    // 经验/教训
  PREFERENCE = 'preference',    // 用户偏好
  KNOWLEDGE = 'knowledge'       // 知识积累
}

/**
 * 记忆状态
 */
export enum MemoryStatus {
  ACTIVE = 'active',        // 活跃/坚持
  DEPRECATED = 'deprecated', // 已放弃/过时
  PENDING = 'pending',      // 待验证/新尝试
  ARCHIVED = 'archived'     // 已归档
}

/**
 * 记忆重要性级别
 */
export enum MemoryPriority {
  CRITICAL = 100,   // 核心战略，不可动摇
  HIGH = 75,        // 重要，需要坚持
  MEDIUM = 50,      // 一般，可调整
  LOW = 25,         // 次要，可放弃
  EXPERIMENTAL = 10 // 实验性，新尝试
}

/**
 * 记忆置信度
 */
export enum MemoryConfidence {
  CERTAIN = 100,    // 已验证，确定有效
  HIGH = 80,        // 高度可信
  MODERATE = 60,    // 中等可信
  LOW = 40,         // 低可信度
  HYPOTHESIS = 20   // 假设/推测
}

/**
 * 基础记忆接口
 */
export interface BaseMemory {
  memoryId: string;
  type: MemoryType;
  title: string;
  content: string;
  
  // 元数据
  status: MemoryStatus;
  priority: MemoryPriority;
  confidence: MemoryConfidence;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;  // 记忆过期时间
  
  // 关联
  userId?: string;
  agentId?: string;
  taskId?: string;
  parentMemoryId?: string;
  relatedMemoryIds: string[];
  
  // 标签和分类
  tags: string[];
  category: string;
  
  // 使用统计
  accessCount: number;
  successCount: number;
  failureCount: number;
  
  // 来源
  source: string;  // 如何获得这个记忆
  sourceTask?: string;
}

/**
 * 战略目标记忆
 * 核心目标、里程碑、关键结果
 */
export interface StrategicMemory extends BaseMemory {
  type: MemoryType.STRATEGIC;
  
  // 目标层级
  goalLevel: 'vision' | 'mission' | 'objective' | 'key_result' | 'milestone';
  
  // 目标详情
  vision?: string;           // 愿景
  mission?: string;          // 使命
  objective?: string;        // 目标
  keyResults: KeyResult[];   // 关键结果
  milestones: Milestone[];   // 里程碑
  
  // 时间规划
  startDate: Date;
  targetDate: Date;
  completedDate?: Date;
  
  // 进度
  progress: number;  // 0-100
  
  // 关联战略
  parentGoalId?: string;
  subGoalIds: string[];
  
  // 战略定力
  stickiness: number;  // 坚持程度 0-100
  rationale: string;   // 为什么这个目标重要
  
  // 复盘记录
  reviewHistory: ReviewRecord[];
}

export interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'achieved' | 'missed';
}

/**
 * 第一性原理分析记忆
 * 问题分解、本质洞察
 */
export interface FirstPrincipleMemory extends BaseMemory {
  type: MemoryType.FIRST_PRINCIPLE;
  
  // 问题定义
  problemStatement: string;
  problemDomain: string;
  
  // 分解过程
  decomposition: DecompositionStep[];
  
  // 本质洞察
  fundamentalTruths: FundamentalTruth[];
  
  // 推理链
  reasoningChain: ReasoningStep[];
  
  // 结论
  conclusion: string;
  implications: string[];
  
  // 验证状态
  validated: boolean;
  validationMethod?: string;
  validationDate?: Date;
}

export interface DecompositionStep {
  id: string;
  level: number;
  question: string;
  breakdown: string[];
  assumptions: string[];
  subProblems: string[];
}

export interface FundamentalTruth {
  id: string;
  truth: string;
  evidence: string[];
  certainty: number;  // 0-100
  counterArguments?: string[];
}

export interface ReasoningStep {
  id: string;
  step: number;
  premise: string;
  logic: string;
  conclusion: string;
  isValid: boolean;
}

/**
 * 底层逻辑记忆
 * 核心规律、因果关系
 */
export interface FundamentalLogicMemory extends BaseMemory {
  type: MemoryType.FUNDAMENTAL;
  
  // 规律描述
  pattern: string;
  patternType: 'causal' | 'correlation' | 'system' | 'behavioral' | 'structural';
  
  // 因果链
  causeEffectChain: CauseEffectLink[];
  
  // 适用条件
  conditions: Condition[];
  constraints: string[];
  
  // 预测能力
  predictivePower: number;  // 0-100
  
  // 反例和边界
  edgeCases: string[];
  counterExamples?: string[];
  
  // 数学表达（如果有）
  mathematicalForm?: string;
  
  // 验证历史
  validationHistory: ValidationRecord[];
}

export interface CauseEffectLink {
  id: string;
  cause: string;
  effect: string;
  mechanism: string;  // 作用机制
  strength: number;   // 因果强度 0-100
  timeLag?: string;   // 时滞
}

export interface Condition {
  id: string;
  condition: string;
  necessity: 'required' | 'preferred' | 'optional';
  impact: number;  // 对结果的影响程度 0-100
}

export interface ValidationRecord {
  id: string;
  timestamp: Date;
  context: string;
  prediction: string;
  actual: string;
  accuracy: number;
  notes: string;
}

/**
 * 经验/教训记忆
 */
export interface ExperienceMemory extends BaseMemory {
  type: MemoryType.EXPERIENCE;
  
  // 场景
  context: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  
  // 复盘分析
  whatWorked: string[];
  whatDidntWork: string[];
  rootCauses: string[];
  
  // 洞察
  insights: string[];
  lessons: string[];
  
  // 可复用性
  reusable: boolean;
  applicableContexts: string[];
  
  // 改进建议
  improvements: ImprovementSuggestion[];
}

export interface ImprovementSuggestion {
  id: string;
  suggestion: string;
  expectedImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number;
}

/**
 * 复盘记录
 */
export interface ReviewRecord {
  id: string;
  timestamp: Date;
  reviewType: 'weekly' | 'monthly' | 'quarterly' | 'milestone' | 'ad_hoc';
  
  // 回顾
  originalPlan: string;
  actualOutcome: string;
  variance: string;
  
  // 分析
  successes: string[];
  failures: string[];
  surprises: string[];
  
  // 洞察
  keyInsights: string[];
  patternRecognition: string[];
  
  // 决策
  decisions: ReviewDecision[];
  
  // 下一步
  actionItems: ActionItem[];
}

export interface ReviewDecision {
  id: string;
  item: string;
  decision: 'continue' | 'stop' | 'pivot' | 'accelerate' | 'decelerate';
  rationale: string;
  confidence: number;
}

export interface ActionItem {
  id: string;
  action: string;
  owner?: string;
  deadline?: Date;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * 用户偏好记忆
 */
export interface PreferenceMemory extends BaseMemory {
  type: MemoryType.PREFERENCE;
  
  preferenceDomain: string;
  preferenceKey: string;
  preferenceValue: unknown;
  
  // 偏好强度
  strength: number;  // 0-100
  flexibility: number;  // 可调整程度 0-100
  
  // 上下文
  applicableContexts: string[];
  exceptions?: string[];
}

/**
 * 知识积累
 */
export interface KnowledgeMemory extends BaseMemory {
  type: MemoryType.KNOWLEDGE;
  
  knowledgeType: 'fact' | 'concept' | 'procedure' | 'heuristic';
  domain: string;
  
  // 知识内容
  definition?: string;
  explanation: string;
  examples: string[];
  
  // 关联
  prerequisites: string[];
  relatedConcepts: string[];
  
  // 可信度
  sourceReliability: number;
  verificationStatus: 'unverified' | 'verified' | 'disputed';
}

/**
 * 记忆查询参数
 */
export interface MemoryQuery {
  types?: MemoryType[];
  status?: MemoryStatus[];
  priority?: MemoryPriority[];
  tags?: string[];
  category?: string;
  agentId?: string;
  userId?: string;
  taskId?: string;
  
  // 时间范围
  createdAfter?: Date;
  createdBefore?: Date;
  
  // 搜索
  searchQuery?: string;
  
  // 排序
  sortBy?: 'relevance' | 'priority' | 'confidence' | 'recency' | 'access_count';
  sortOrder?: 'asc' | 'desc';
  
  // 分页
  limit?: number;
  offset?: number;
}

/**
 * 记忆检索结果
 */
export interface MemoryRetrievalResult {
  memory: BaseMemory;
  relevanceScore: number;
  matchReason: string;
  contextSimilarity?: number;
}

/**
 * 记忆创建参数
 */
export interface CreateMemoryParams {
  type: MemoryType;
  title: string;
  content: string;
  
  priority?: MemoryPriority;
  confidence?: MemoryConfidence;
  status?: MemoryStatus;
  
  userId?: string;
  agentId?: string;
  taskId?: string;
  parentMemoryId?: string;
  relatedMemoryIds?: string[];
  
  tags?: string[];
  category?: string;
  source?: string;
  
  // 类型特定数据
  typeSpecificData?: Record<string, unknown>;
}

/**
 * 记忆更新参数
 */
export interface UpdateMemoryParams {
  title?: string;
  content?: string;
  status?: MemoryStatus;
  priority?: MemoryPriority;
  confidence?: MemoryConfidence;
  tags?: string[];
  category?: string;
  expiresAt?: Date;
  
  // 类型特定更新
  typeSpecificData?: Record<string, unknown>;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byStatus: Record<MemoryStatus, number>;
  byPriority: Record<string, number>;
  
  // 活跃度
  mostAccessed: BaseMemory[];
  recentlyCreated: BaseMemory[];
  needsReview: BaseMemory[];  // 长时间未验证或低置信度
  
  // 趋势
  creationTrend: { date: string; count: number }[];
}
