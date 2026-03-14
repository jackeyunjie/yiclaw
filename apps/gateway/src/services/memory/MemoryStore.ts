/**
 * 长期记忆存储服务
 * 负责记忆的持久化、检索和管理
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import {
  BaseMemory,
  MemoryType,
  MemoryStatus,
  MemoryPriority,
  MemoryConfidence,
  MemoryQuery,
  MemoryRetrievalResult,
  CreateMemoryParams,
  UpdateMemoryParams,
  MemoryStats,
  ReviewRecord
} from './types';

export class MemoryStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建记忆
   */
  async createMemory(params: CreateMemoryParams): Promise<BaseMemory> {
    const now = new Date();
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info(`创建记忆: ${params.title} [${params.type}]`);

    const memoryData = {
      memoryId,
      type: params.type,
      title: params.title,
      content: params.content,
      status: params.status || MemoryStatus.ACTIVE,
      priority: params.priority || MemoryPriority.MEDIUM,
      confidence: params.confidence || MemoryConfidence.MODERATE,
      createdAt: now,
      updatedAt: now,
      userId: params.userId,
      agentId: params.agentId,
      taskId: params.taskId,
      parentMemoryId: params.parentMemoryId,
      relatedMemoryIds: params.relatedMemoryIds || [],
      tags: params.tags || [],
      category: params.category || 'general',
      accessCount: 0,
      successCount: 0,
      failureCount: 0,
      source: params.source || 'manual',
      // 类型特定数据存储在 JSON 中
      typeData: params.typeSpecificData || {}
    };

    // 存储到数据库
    await this.prisma.memory.create({
      data: memoryData as any
    });

    return this.mapToBaseMemory(memoryData);
  }

  /**
   * 获取记忆
   */
  async getMemory(memoryId: string): Promise<BaseMemory | null> {
    const record = await this.prisma.memory.findUnique({
      where: { memoryId }
    });

    if (!record) {
      return null;
    }

    // 更新访问统计
    await this.prisma.memory.update({
      where: { memoryId },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });

    return this.mapToBaseMemory(record);
  }

  /**
   * 更新记忆
   */
  async updateMemory(memoryId: string, params: UpdateMemoryParams): Promise<BaseMemory> {
    logger.info(`更新记忆: ${memoryId}`);

    const updateData: any = {
      updatedAt: new Date()
    };

    if (params.title !== undefined) updateData.title = params.title;
    if (params.content !== undefined) updateData.content = params.content;
    if (params.status !== undefined) updateData.status = params.status;
    if (params.priority !== undefined) updateData.priority = params.priority;
    if (params.confidence !== undefined) updateData.confidence = params.confidence;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.expiresAt !== undefined) updateData.expiresAt = params.expiresAt;
    if (params.typeSpecificData !== undefined) {
      updateData.typeData = params.typeSpecificData;
    }

    const record = await this.prisma.memory.update({
      where: { memoryId },
      data: updateData
    });

    return this.mapToBaseMemory(record);
  }

  /**
   * 删除记忆
   */
  async deleteMemory(memoryId: string): Promise<void> {
    logger.info(`删除记忆: ${memoryId}`);
    await this.prisma.memory.delete({
      where: { memoryId }
    });
  }

  /**
   * 搜索记忆
   */
  async searchMemories(query: MemoryQuery): Promise<MemoryRetrievalResult[]> {
    const where: any = {};

    if (query.types?.length) where.type = { in: query.types };
    if (query.status?.length) where.status = { in: query.status };
    if (query.priority?.length) where.priority = { in: query.priority };
    if (query.tags?.length) where.tags = { hasSome: query.tags };
    if (query.category) where.category = query.category;
    if (query.agentId) where.agentId = query.agentId;
    if (query.userId) where.userId = query.userId;
    if (query.taskId) where.taskId = query.taskId;

    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) where.createdAt.gte = query.createdAfter;
      if (query.createdBefore) where.createdAt.lte = query.createdBefore;
    }

    // 文本搜索
    if (query.searchQuery) {
      where.OR = [
        { title: { contains: query.searchQuery, mode: 'insensitive' } },
        { content: { contains: query.searchQuery, mode: 'insensitive' } },
        { tags: { has: query.searchQuery } }
      ];
    }

    // 排序
    let orderBy: any = {};
    switch (query.sortBy) {
      case 'priority':
        orderBy = { priority: query.sortOrder || 'desc' };
        break;
      case 'confidence':
        orderBy = { confidence: query.sortOrder || 'desc' };
        break;
      case 'access_count':
        orderBy = { accessCount: query.sortOrder || 'desc' };
        break;
      case 'recency':
      default:
        orderBy = { updatedAt: query.sortOrder || 'desc' };
        break;
    }

    const records = await this.prisma.memory.findMany({
      where,
      orderBy,
      take: query.limit || 50,
      skip: query.offset || 0
    });

    // 计算相关性分数
    return records.map(record => ({
      memory: this.mapToBaseMemory(record),
      relevanceScore: this.calculateRelevance(record, query),
      matchReason: this.generateMatchReason(record, query)
    }));
  }

  /**
   * 获取相关记忆
   */
  async getRelatedMemories(memoryId: string, limit: number = 10): Promise<BaseMemory[]> {
    const memory = await this.getMemory(memoryId);
    if (!memory) return [];

    // 获取直接关联的记忆
    const relatedIds = memory.relatedMemoryIds || [];
    
    // 获取同类型的其他记忆
    const sameType = await this.prisma.memory.findMany({
      where: {
        type: memory.type,
        memoryId: { not: memoryId },
        status: MemoryStatus.ACTIVE
      },
      orderBy: { priority: 'desc' },
      take: limit
    });

    // 获取同标签的记忆
    // 查找具有相同标签的记忆（使用 OR 条件）
    let sameTags: any[] = [];
    if (memory.tags.length > 0) {
      // 使用 any 类型绕过 Prisma 的类型检查
      const tagConditions: any[] = memory.tags.map(tag => ({
        tags: { contains: `"${tag}"` }
      }));
      sameTags = await this.prisma.memory.findMany({
        where: {
          OR: tagConditions,
          memoryId: { not: memoryId },
          status: MemoryStatus.ACTIVE
        },
        orderBy: { priority: 'desc' },
        take: limit
      });
    }

    // 合并并去重
    const allRelated = [
      ...relatedIds.map(id => ({ memoryId: id })),
      ...sameType,
      ...sameTags
    ];
    
    const uniqueIds = [...new Set(allRelated.map(m => m.memoryId))].slice(0, limit);
    
    const memories = await Promise.all(
      uniqueIds.map(id => this.getMemory(id))
    );

    return memories.filter((m): m is BaseMemory => m !== null);
  }

  /**
   * 记录记忆使用结果
   */
  async recordUsage(memoryId: string, success: boolean, _context?: string): Promise<void> {
    const updateData: any = {};
    if (success) {
      updateData.successCount = { increment: 1 };
    } else {
      updateData.failureCount = { increment: 1 };
    }

    await this.prisma.memory.update({
      where: { memoryId },
      data: updateData
    });

    logger.debug(`记录记忆使用: ${memoryId} - ${success ? '成功' : '失败'}`);
  }

  /**
   * 添加复盘记录
   */
  async addReviewRecord(memoryId: string, review: ReviewRecord): Promise<void> {
    const memory = await this.prisma.memory.findUnique({
      where: { memoryId }
    });

    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    const typeData = (memory.typeData as any) || {};
    const reviewHistory = typeData.reviewHistory || [];
    reviewHistory.push(review);

    await this.prisma.memory.update({
      where: { memoryId },
      data: {
        typeData: {
          ...typeData,
          reviewHistory
        },
        updatedAt: new Date()
      }
    });

    logger.info(`添加复盘记录: ${memoryId}`);
  }

  /**
   * 获取需要复盘的记忆
   */
  async getMemoriesNeedingReview(daysSinceLastReview: number = 30): Promise<BaseMemory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastReview);

    const records = await this.prisma.memory.findMany({
      where: {
        OR: [
          { updatedAt: { lt: cutoffDate } },
          { confidence: { lt: MemoryConfidence.MODERATE } },
          { status: MemoryStatus.PENDING }
        ],
        status: { not: MemoryStatus.ARCHIVED }
      },
      orderBy: { priority: 'desc' }
    });

    return records.map(r => this.mapToBaseMemory(r));
  }

  /**
   * 获取记忆统计
   */
  async getStats(): Promise<MemoryStats> {
    const [
      totalMemories,
      byType,
      byStatus,
      byPriority,
      mostAccessed,
      recentlyCreated,
      needsReview
    ] = await Promise.all([
      this.prisma.memory.count(),
      this.getCountByType(),
      this.getCountByStatus(),
      this.getCountByPriority(),
      this.prisma.memory.findMany({
        orderBy: { accessCount: 'desc' },
        take: 10
      }),
      this.prisma.memory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      this.getMemoriesNeedingReview()
    ]);

    // 获取创建趋势（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const creationTrend = await this.prisma.memory.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true
    });

    return {
      totalMemories,
      byType,
      byStatus,
      byPriority,
      mostAccessed: mostAccessed.map(m => this.mapToBaseMemory(m)),
      recentlyCreated: recentlyCreated.map(m => this.mapToBaseMemory(m)),
      needsReview,
      creationTrend: creationTrend.map(t => ({
        date: t.createdAt.toISOString().split('T')[0],
        count: t._count
      }))
    };
  }

  /**
   * 更新记忆状态（坚持/放弃/新尝试）
   */
  async updateMemoryStatus(
    memoryId: string, 
    status: MemoryStatus, 
    reason: string
  ): Promise<BaseMemory> {
    logger.info(`更新记忆状态: ${memoryId} -> ${status}, 原因: ${reason}`);

    const record = await this.prisma.memory.update({
      where: { memoryId },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    return this.mapToBaseMemory(record);
  }

  /**
   * 提升或降低记忆优先级
   */
  async adjustPriority(memoryId: string, newPriority: MemoryPriority, reason: string): Promise<BaseMemory> {
    logger.info(`调整记忆优先级: ${memoryId} -> ${newPriority}, 原因: ${reason}`);

    const record = await this.prisma.memory.update({
      where: { memoryId },
      data: {
        priority: newPriority,
        updatedAt: new Date()
      }
    });

    return this.mapToBaseMemory(record);
  }

  // 私有辅助方法

  private mapToBaseMemory(record: any): BaseMemory {
    return {
      memoryId: record.memoryId,
      type: record.type as MemoryType,
      title: record.title,
      content: record.content,
      status: record.status as MemoryStatus,
      priority: record.priority as MemoryPriority,
      confidence: record.confidence as MemoryConfidence,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastAccessedAt: record.lastAccessedAt,
      expiresAt: record.expiresAt,
      userId: record.userId,
      agentId: record.agentId,
      taskId: record.taskId,
      parentMemoryId: record.parentMemoryId,
      relatedMemoryIds: record.relatedMemoryIds || [],
      tags: record.tags || [],
      category: record.category,
      accessCount: record.accessCount,
      successCount: record.successCount,
      failureCount: record.failureCount,
      source: record.source,
      // 合并类型特定数据
      ...(record.typeData || {})
    } as BaseMemory;
  }

  private calculateRelevance(record: any, _query: MemoryQuery): number {
    let score = 0;

    // 优先级权重
    score += (record.priority || 50) * 0.3;

    // 置信度权重
    score += (record.confidence || 50) * 0.2;

    // 活跃度权重
    score += Math.min(record.accessCount * 2, 20);

    // 时效性权重
    const daysSinceUpdate = (Date.now() - record.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceUpdate);

    return Math.min(score, 100);
  }

  private generateMatchReason(record: any, query: MemoryQuery): string {
    const reasons: string[] = [];

    if (query.types?.includes(record.type)) {
      reasons.push(`类型匹配: ${record.type}`);
    }

    if (query.tags?.some(tag => record.tags?.includes(tag))) {
      reasons.push('标签匹配');
    }

    if (query.searchQuery && 
        (record.title.includes(query.searchQuery) || record.content.includes(query.searchQuery))) {
      reasons.push('内容匹配');
    }

    if (record.priority >= MemoryPriority.HIGH) {
      reasons.push('高优先级');
    }

    return reasons.join(', ') || '综合匹配';
  }

  private async getCountByType(): Promise<Record<MemoryType, number>> {
    const counts = await this.prisma.memory.groupBy({
      by: ['type'],
      _count: true
    });

    const result = {} as Record<MemoryType, number>;
    for (const c of counts) {
      result[c.type as MemoryType] = c._count;
    }
    return result;
  }

  private async getCountByStatus(): Promise<Record<MemoryStatus, number>> {
    const counts = await this.prisma.memory.groupBy({
      by: ['status'],
      _count: true
    });

    const result = {} as Record<MemoryStatus, number>;
    for (const c of counts) {
      result[c.status as MemoryStatus] = c._count;
    }
    return result;
  }

  private async getCountByPriority(): Promise<Record<string, number>> {
    const counts = await this.prisma.memory.groupBy({
      by: ['priority'],
      _count: true
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[String(c.priority)] = c._count;
    }
    return result;
  }
}
