/**
 * 记忆系统数据迁移脚本
 *
 * 将现有的 memory 表数据迁移到新的 MemoryPlugin 格式
 */

import { PrismaClient } from '@prisma/client';
import { PluginManager } from '../apps/gateway/src/core/plugin-manager.js';
import { MemoryType as PluginMemoryType } from '../packages/plugin-sdk/src/types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 彩色日志
const log = {
  info: (msg: string) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg: string) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg: string) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  section: (msg: string) => console.log(`\n\x1b[35m📦 ${msg}\x1b[0m\n${'='.repeat(50)}`),
};

/**
 * 旧 MemoryType 映射到新 MemoryType
 */
function mapMemoryType(oldType: string): PluginMemoryType {
  const typeMap: Record<string, PluginMemoryType> = {
    'strategic': PluginMemoryType.GOAL,
    'first_principle': PluginMemoryType.FACT,
    'fundamental': PluginMemoryType.FACT,
    'experience': PluginMemoryType.FACT,
    'preference': PluginMemoryType.PREFERENCE,
    'knowledge': PluginMemoryType.FACT,
    'conversation': PluginMemoryType.CONVERSATION,
    'skill': PluginMemoryType.SKILL,
  };

  return typeMap[oldType] || PluginMemoryType.FACT;
}

/**
 * 执行迁移
 */
async function migrate() {
  log.section('OpenClaw Memory Migration');

  // 1. 连接旧数据库
  log.info('Connecting to database...');
  const prisma = new PrismaClient();

  // 2. 初始化新插件系统
  log.info('Initializing new plugin system...');
  const pluginManager = new PluginManager({
    pluginDirs: [path.resolve(__dirname, '../plugins/memories')],
    appConfig: {
      database: {
        url: process.env.DATABASE_URL,
      },
    },
    logger: {
      debug: () => {},
      info: log.info,
      warn: log.warn,
      error: log.error,
    },
  });

  // 加载插件
  await pluginManager.loadAll();
  await pluginManager.startAll();

  const memoryPlugin = pluginManager.getPlugin('memory-database');
  if (!memoryPlugin) {
    throw new Error('Memory database plugin not found');
  }

  // 3. 统计旧数据
  const oldCount = await prisma.memory.count();
  log.info(`Found ${oldCount} memories in old database`);

  if (oldCount === 0) {
    log.warn('No memories to migrate');
    return;
  }

  // 4. 批量迁移
  log.section('Starting Migration');

  const batchSize = 100;
  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  // 获取所有记忆
  const memories = await prisma.memory.findMany({
    orderBy: { createdAt: 'asc' },
  });

  for (let i = 0; i < memories.length; i += batchSize) {
    const batch = memories.slice(i, i + batchSize);
    log.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(memories.length / batchSize)}...`);

    for (const oldMemory of batch) {
      try {
        // 检查是否已迁移（通过 memoryId 去重）
        const existing = await (memoryPlugin as any).getById(oldMemory.id);
        if (existing) {
          log.warn(`Memory ${oldMemory.memoryId} already migrated, skipping`);
          skipped++;
          continue;
        }

        // 转换数据
        const newMemory = {
          userId: oldMemory.userId || 'system',
          type: mapMemoryType(oldMemory.type),
          content: `${oldMemory.title}\n\n${oldMemory.content}`,
          importance: oldMemory.priority / 100, // 0-100 -> 0-1
          source: oldMemory.source,
          expiresAt: oldMemory.expiresAt || undefined,
          metadata: {
            oldId: oldMemory.id,
            memoryId: oldMemory.memoryId,
            status: oldMemory.status,
            category: oldMemory.category,
            tags: oldMemory.tags,
            confidence: oldMemory.confidence,
            accessCount: oldMemory.accessCount,
            agentId: oldMemory.agentId,
            taskId: oldMemory.taskId,
            parentMemoryId: oldMemory.parentMemoryId,
            relatedMemoryIds: oldMemory.relatedMemoryIds,
            typeData: oldMemory.typeData,
            migratedAt: new Date().toISOString(),
          },
        };

        // 存储到新系统
        await (memoryPlugin as any).store(newMemory);
        migrated++;

        if (migrated % 10 === 0) {
          log.success(`Migrated ${migrated} memories...`);
        }
      } catch (error) {
        log.error(`Failed to migrate memory ${oldMemory.memoryId}: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }
  }

  // 5. 验证迁移结果
  log.section('Migration Results');

  const newCount = await (memoryPlugin as any).getStats();
  log.info(`Old database: ${oldCount} memories`);
  log.info(`New database: ${newCount.totalCount} memories`);
  log.success(`Migrated: ${migrated}`);
  if (skipped > 0) log.warn(`Skipped: ${skipped}`);
  if (failed > 0) log.error(`Failed: ${failed}`);

  // 6. 数据完整性检查
  if (migrated + skipped + failed !== oldCount) {
    log.warn('Count mismatch! Please review the logs.');
  }

  if (failed === 0) {
    log.success('\n🎉 Migration completed successfully!');
  } else {
    log.error(`\n⚠️ Migration completed with ${failed} failures.`);
  }

  // 7. 清理
  await pluginManager.stopAll();
  await prisma.$disconnect();
}

// 运行迁移
migrate().catch((error) => {
  log.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
