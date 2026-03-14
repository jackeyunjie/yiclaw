/**
 * 数据库连接工具
 *
 * 提供 Prisma Client 单例和连接管理
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prisma Client 单例
let prisma: PrismaClient | null = null;

/**
 * 获取 Prisma Client 实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // 监听查询日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
        logger.debug(`Query: ${e.query}`, {
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // 监听错误日志
    prisma.$on('error' as never, (e: { message: string }) => {
      logger.error('Prisma Error:', e.message);
    });
  }

  return prisma;
}

/**
 * 连接数据库
 */
export async function connectDatabase(): Promise<void> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    logger.info('✅ 数据库连接成功');
  } catch (error) {
    logger.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('数据库连接已关闭');
    }
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
    throw error;
  }
}

/**
 * 检查数据库健康状态
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
}

/**
 * 执行事务
 * @param fn 事务函数
 */
export async function withTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return await client.$transaction(async (tx) => {
    return await fn(tx as unknown as PrismaClient);
  });
}

// 导出 Prisma Client 类型
export type { PrismaClient };
