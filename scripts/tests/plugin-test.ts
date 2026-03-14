/**
 * OpenClaw 插件测试脚本
 *
 * 用于验证所有插件功能正常
 */

import { PluginManager } from '../../apps/gateway/src/core/plugin-manager.js';
import { createRuntime } from '../../packages/plugin-sdk/src/runtime.js';
import { MemoryType } from '../../packages/plugin-sdk/src/types/index.js';
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

// 测试统计
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    log.success(name);
    stats.passed++;
  } catch (error) {
    log.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    stats.failed++;
  }
}

async function main() {
  log.section('OpenClaw Plugin Test Suite');

  // 1. 测试 Plugin Manager
  log.section('Plugin Manager Tests');

  const runtime = createRuntime({
    config: {
      web: { port: 3001 },
      database: { url: process.env.DATABASE_URL },
    },
  });

  const pluginManager = new PluginManager({
    pluginDirs: [
      // 从构建后的插件目录加载（使用 */dist/index.js）
      path.resolve(__dirname, '../../plugins/channels'),
      path.resolve(__dirname, '../../plugins/memories'),
      path.resolve(__dirname, '../../plugins/tools'),
    ],
    appConfig: {},
    logger: {
      debug: (msg: string) => log.info(msg),
      info: (msg: string) => log.info(msg),
      warn: console.warn,
      error: console.error,
    },
  });

  await runTest('PluginManager 创建', async () => {
    if (!pluginManager) throw new Error('Failed to create PluginManager');
  });

  // 加载所有插件
  const loadResult = await pluginManager.loadAll();
  log.info(`Loaded ${loadResult.loaded} plugins, ${loadResult.failed} failed`);

  await runTest('加载插件', async () => {
    if (loadResult.loaded === 0) throw new Error('No plugins loaded');
  });

  // 2. 测试 Memory Database Plugin
  log.section('Memory Database Plugin Tests');

  const memoryPlugin = pluginManager.getPlugin('memory-database');

  if (memoryPlugin) {
    await runTest('Memory Plugin - 存储记忆', async () => {
      const memory = await (memoryPlugin as any).store({
        userId: 'test-user',
        type: MemoryType.FACT,
        content: '这是一个测试记忆',
        importance: 0.8,
      });
      if (!memory.id) throw new Error('Memory not stored');
      log.info(`Created memory: ${memory.id}`);
    });

    await runTest('Memory Plugin - 检索记忆', async () => {
      const results = await (memoryPlugin as any).retrieve({
        userId: 'test-user',
        text: '测试',
        limit: 10,
      });
      if (results.length === 0) throw new Error('No memories found');
      log.info(`Found ${results.length} memories`);
    });

    await runTest('Memory Plugin - 获取统计', async () => {
      const stats = await (memoryPlugin as any).getStats('test-user');
      log.info(`Total memories: ${stats.totalCount}`);
    });
  } else {
    log.warn('Memory plugin not loaded, skipping tests');
    stats.skipped += 3;
  }

  // 3. 测试 File Tool Plugin
  log.section('File Tool Plugin Tests');

  const filePlugin = pluginManager.getPlugin('tool-file');

  if (filePlugin) {
    await runTest('File Plugin - 写入文件', async () => {
      const result = await (filePlugin as any).execute(
        {
          operation: 'write',
          path: 'test-file.txt',
          content: 'Hello from test!',
        },
        { userId: 'test', sessionId: 'test', executionId: '1', timestamp: new Date() }
      );
      if (!result.success) throw new Error(result.error);
    });

    await runTest('File Plugin - 读取文件', async () => {
      const result = await (filePlugin as any).execute(
        {
          operation: 'read',
          path: 'test-file.txt',
        },
        { userId: 'test', sessionId: 'test', executionId: '2', timestamp: new Date() }
      );
      if (!result.success) throw new Error(result.error);
      if (result.data.content !== 'Hello from test!') {
        throw new Error('Content mismatch');
      }
    });

    await runTest('File Plugin - 列出目录', async () => {
      const result = await (filePlugin as any).execute(
        {
          operation: 'list',
          path: '.',
          recursive: false,
        },
        { userId: 'test', sessionId: 'test', executionId: '3', timestamp: new Date() }
      );
      if (!result.success) throw new Error(result.error);
      log.info(`Found ${result.data.count} files`);
    });

    await runTest('File Plugin - 删除文件', async () => {
      // 需要先启用删除权限
      const result = await (filePlugin as any).execute(
        {
          operation: 'delete',
          path: 'test-file.txt',
        },
        { userId: 'test', sessionId: 'test', executionId: '4', timestamp: new Date() }
      );
      // 删除可能被禁用，所以不强制要求成功
      log.info(`Delete result: ${result.success ? 'success' : 'disabled'}`);
    });

    await runTest('File Plugin - 路径安全检查', async () => {
      const result = await (filePlugin as any).execute(
        {
          operation: 'read',
          path: '../../../etc/passwd',
        },
        { userId: 'test', sessionId: 'test', executionId: '5', timestamp: new Date() }
      );
      if (result.success) {
        throw new Error('Path traversal not blocked!');
      }
      log.info('Path traversal correctly blocked');
    });
  } else {
    log.warn('File plugin not loaded, skipping tests');
    stats.skipped += 5;
  }

  // 4. 测试 Web Channel Plugin
  log.section('Web Channel Plugin Tests');

  const webChannel = pluginManager.getPlugin('web-channel') || pluginManager.getPlugin('web');

  if (webChannel) {
    await runTest('WebChannel - 初始化', async () => {
      const status = (webChannel as any).getStatus();
      log.info(`WebChannel status: ${status}`);
    });

    await runTest('WebChannel - 状态检查', async () => {
      const status = (webChannel as any).getStatus();
      if (!['connected', 'disconnected', 'error'].includes(status)) {
        throw new Error('Invalid status');
      }
    });
  } else {
    log.warn('Web channel not loaded, skipping tests');
    stats.skipped += 2;
  }

  // 5. 测试 Feishu Channel Plugin
  log.section('Feishu Channel Plugin Tests');

  const feishuChannel = pluginManager.getPlugin('feishu');

  if (feishuChannel) {
    await runTest('FeishuChannel - 初始化', async () => {
      const status = (feishuChannel as any).getStatus();
      log.info(`Feishu status: ${status}`);
    });
  } else {
    log.warn('Feishu channel not loaded (expected if not configured), skipping tests');
    stats.skipped += 1;
  }

  // 测试报告
  log.section('Test Report');
  log.success(`Passed: ${stats.passed}`);
  if (stats.failed > 0) log.error(`Failed: ${stats.failed}`);
  if (stats.skipped > 0) log.warn(`Skipped: ${stats.skipped}`);

  const total = stats.passed + stats.failed + stats.skipped;
  const passRate = ((stats.passed / total) * 100).toFixed(1);
  log.info(`Total: ${total}, Pass Rate: ${passRate}%`);

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
