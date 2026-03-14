/**
 * Database Memory Plugin for OpenClaw
 *
 * 使用 Prisma + PostgreSQL 存储记忆
 */

import {
  MemoryPlugin,
  Memory,
  MemoryType,
  MemoryQuery,
  MemoryRetrievalResult,
  MemoryStats,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';
import { PrismaClient, Memory as PrismaMemory } from '@prisma/client';

/**
 * 数据库记忆插件配置
 */
interface DatabaseMemoryConfig {
  /** 数据库连接字符串 */
  databaseUrl?: string;
  /** 默认检索数量 */
  defaultLimit?: number;
  /** 最大检索数量 */
  maxLimit?: number;
}

/**
 * 数据库记忆插件
 */
export default class DatabaseMemoryPlugin implements MemoryPlugin {
  readonly id = 'memory-database';
  readonly name = 'Database Memory';
  readonly version = '1.0.0';
  readonly type = PluginType.MEMORY;
  readonly description = '使用 PostgreSQL 数据库存储和检索记忆';

  private runtime?: Runtime;
  private prisma?: PrismaClient;
  private config: DatabaseMemoryConfig = {
    defaultLimit: 20,
    maxLimit: 100,
  };

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    // 读取配置
    const config = runtime.getConfig<DatabaseMemoryConfig>('memory.database') || {};
    this.config = {
      ...this.config,
      ...config,
    };

    // 初始化 Prisma
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl || runtime.getConfig<string>('database.url'),
        },
      },
    });

    runtime.logger.info('DatabaseMemoryPlugin initialized');
  }

  async start(): Promise<void> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    // 测试数据库连接
    await this.prisma.$connect();
    this.runtime?.logger.info('DatabaseMemoryPlugin connected to database');
  }

  async stop(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.runtime?.logger.info('DatabaseMemoryPlugin disconnected');
    }
  }

  /**
   * 存储记忆
   */
  async store(
    memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Memory> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const record = await this.prisma.memory.create({
      data: {
        memoryId: crypto.randomUUID(),
        userId: memory.userId,
        type: memory.type,
        status: 'active',
        priority: Math.round((memory.importance ?? 0.5) * 100),
        confidence: 50,
        title: memory.content.substring(0, 50),
        content: memory.content,
        source: memory.source || 'plugin',
        expiresAt: memory.expiresAt,
        category: 'general',
        tags: [],
        relatedMemoryIds: memory.relatedIds || [],
        typeData: memory.metadata as any,
      },
    });

    return this.toMemory(record);
  }

  /**
   * 批量存储记忆
   */
  async storeBatch(
    memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Memory[]> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const records = await this.prisma.$transaction(
      memories.map((memory) =>
        this.prisma!.memory.create({
          data: {
            memoryId: crypto.randomUUID(),
            userId: memory.userId,
            type: memory.type,
            status: 'active',
            priority: Math.round((memory.importance ?? 0.5) * 100),
            confidence: 50,
            title: memory.content.substring(0, 50),
            content: memory.content,
            source: memory.source || 'plugin',
            expiresAt: memory.expiresAt,
            category: 'general',
            tags: [],
            relatedMemoryIds: memory.relatedIds || [],
            typeData: memory.metadata as any,
          },
        })
      )
    );

    return records.map((r) => this.toMemory(r));
  }

  /**
   * 根据ID获取记忆
   */
  async getById(memoryId: string): Promise<Memory | null> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const record = await this.prisma.memory.findUnique({
      where: { id: memoryId },
    });

    return record ? this.toMemory(record) : null;
  }

  /**
   * 检索记忆
   */
  async retrieve(query: MemoryQuery): Promise<MemoryRetrievalResult[]> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const limit = Math.min(
      query.limit || this.config.defaultLimit!,
      this.config.maxLimit!
    );

    const where: any = {
      userId: query.userId,
    };

    // 类型过滤
    if (query.type) {
      where.type = query.type;
    } else if (query.types?.length) {
      where.type = { in: query.types };
    }

    // 来源过滤
    if (query.source) {
      where.source = query.source;
    }

    // 时间范围
    if (query.startTime || query.endTime) {
      where.createdAt = {};
      if (query.startTime) {
        where.createdAt.gte = query.startTime;
      }
      if (query.endTime) {
        where.createdAt.lte = query.endTime;
      }
    }

    // 文本搜索（使用 contains）
    if (query.text) {
      where.content = { contains: query.text, mode: 'insensitive' };
    }

    const records = await this.prisma.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: query.offset || 0,
    });

    // 转换为结果格式（简单实现，不涉及向量检索）
    return records.map((record) => ({
      memory: this.toMemory(record),
      score: 1.0, // 简单实现，所有结果分数相同
    }));
  }

  /**
   * 更新记忆
   */
  async update(
    memoryId: string,
    updates: Partial<Omit<Memory, 'id' | 'createdAt'>>
  ): Promise<Memory> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const record = await this.prisma.memory.update({
      where: { id: memoryId },
      data: {
        ...(updates.type && { type: updates.type }),
        ...(updates.content && { content: updates.content }),
        ...(updates.embedding && { embedding: updates.embedding as any }),
        ...(updates.importance !== undefined && { importance: updates.importance }),
        ...(updates.source && { source: updates.source }),
        ...(updates.expiresAt && { expiresAt: updates.expiresAt }),
        ...(updates.metadata && { metadata: updates.metadata as any }),
        ...(updates.relatedIds && { relatedIds: updates.relatedIds as any }),
      },
    });

    return this.toMemory(record);
  }

  /**
   * 删除记忆
   */
  async delete(memoryId: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    await this.prisma.memory.delete({
      where: { id: memoryId },
    });
  }

  /**
   * 删除用户的所有记忆
   */
  async deleteByUser(userId: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    await this.prisma.memory.deleteMany({
      where: { userId },
    });
  }

  /**
   * 获取记忆统计
   */
  async getStats(userId?: string): Promise<MemoryStats> {
    if (!this.prisma) {
      throw new Error('DatabaseMemoryPlugin not initialized');
    }

    const where = userId ? { userId } : {};

    const [totalCount, byType] = await Promise.all([
      this.prisma.memory.count({ where }),
      this.prisma.memory.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
    ]);

    const byTypeMap = byType.reduce((acc, item) => {
      acc[item.type as MemoryType] = item._count.type;
      return acc;
    }, {} as Record<MemoryType, number>);

    return {
      totalCount,
      byType: byTypeMap,
      storageSize: 0, // 暂不计算
    };
  }

  /**
   * 将 Prisma 记录转换为 Memory 对象
   */
  private toMemory(record: PrismaMemory): Memory {
    return {
      id: record.memoryId || record.id,
      userId: record.userId || 'system',
      type: record.type as MemoryType,
      content: record.content,
      importance: record.priority ? record.priority / 100 : undefined,
      relatedIds: (record.relatedMemoryIds as string[]) || undefined,
      source: record.source || undefined,
      expiresAt: record.expiresAt || undefined,
      metadata: (record.typeData as Record<string, unknown>) || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
