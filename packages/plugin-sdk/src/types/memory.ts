/**
 * OpenClaw Plugin SDK - Memory Plugin Interface
 *
 * 记忆插件用于存储和检索 AI 的记忆
 * 支持向量检索、语义搜索等高级功能
 */

import { Plugin, PluginType } from './plugin.js';

/**
 * 记忆类型
 */
export enum MemoryType {
  /** 对话记录 */
  CONVERSATION = 'conversation',

  /** 用户目标 */
  GOAL = 'goal',

  /** 事实知识 */
  FACT = 'fact',

  /** 技能/工具使用记录 */
  SKILL = 'skill',

  /** 用户偏好 */
  PREFERENCE = 'preference',
}

/**
 * 记忆条目
 */
export interface Memory {
  /** 记忆唯一标识 */
  id: string;

  /** 用户标识 */
  userId: string;

  /** 记忆类型 */
  type: MemoryType;

  /** 记忆内容 */
  content: string;

  /** 向量嵌入（用于语义检索） */
  embedding?: number[];

  /** 重要性评分（0-1） */
  importance?: number;

  /** 关联的记忆ID */
  relatedIds?: string[];

  /** 记忆来源 */
  source?: string;

  /** 过期时间 */
  expiresAt?: Date;

  /** 额外元数据 */
  metadata?: Record<string, unknown>;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 记忆查询条件
 */
export interface MemoryQuery {
  /** 用户标识 */
  userId: string;

  /** 记忆类型过滤 */
  type?: MemoryType;

  /** 类型列表（或关系） */
  types?: MemoryType[];

  /** 文本搜索（关键词） */
  text?: string;

  /** 语义搜索（自然语言） */
  semantic?: string;

  /** 关联记忆ID */
  relatedTo?: string;

  /** 来源过滤 */
  source?: string;

  /** 最大返回数量 */
  limit?: number;

  /** 跳过数量（分页） */
  offset?: number;

  /** 时间范围开始 */
  startTime?: Date;

  /** 时间范围结束 */
  endTime?: Date;
}

/**
 * 记忆检索结果
 */
export interface MemoryRetrievalResult {
  /** 记忆条目 */
  memory: Memory;

  /** 相关性评分（0-1） */
  score: number;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  /** 总记忆数 */
  totalCount: number;

  /** 按类型统计 */
  byType: Record<MemoryType, number>;

  /** 存储占用（字节） */
  storageSize: number;
}

/**
 * 记忆插件接口
 */
export interface MemoryPlugin extends Plugin {
  readonly type: PluginType.MEMORY;

  /**
   * 存储记忆
   */
  store(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Memory>;

  /**
   * 批量存储记忆
   */
  storeBatch(memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Memory[]>;

  /**
   * 根据ID获取记忆
   */
  getById(memoryId: string): Promise<Memory | null>;

  /**
   * 检索记忆
   * 支持关键词搜索和语义搜索
   */
  retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult[]>;

  /**
   * 更新记忆
   */
  update(memoryId: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): Promise<Memory>;

  /**
   * 删除记忆
   */
  delete(memoryId: string): Promise<void>;

  /**
   * 删除用户的所有记忆
   */
  deleteByUser(userId: string): Promise<void>;

  /**
   * 获取记忆统计
   */
  getStats(userId?: string): Promise<MemoryStats>;
}
