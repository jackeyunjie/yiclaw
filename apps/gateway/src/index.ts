/**
 * OpenClaw 网关服务入口
 *
 * 主要功能：
 * - Express HTTP 服务器
 * - Socket.io WebSocket 服务器
 * - REST API 路由
 * - 数据库连接
 * - 插件系统
 */

import { createServer } from './server';
import { logger } from './utils/logger';
import { initAIClients } from './services/ai';
import { PluginManager } from './core/plugin-manager';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 中的 __dirname 替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量读取配置
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * 启动服务器
 */
async function main() {
  try {
    // 初始化 AI 客户端
    initAIClients();

    // 创建插件管理器
    const pluginManager = new PluginManager({
      pluginDirs: [
        path.resolve(__dirname, '../../../plugins/channels'),  // 通道插件
        path.resolve(__dirname, '../../../plugins/memories'),  // 记忆插件
        path.resolve(__dirname, '../../../plugins/tools'),     // 工具插件
      ],
      appConfig: {
        web: {
          port: Number(PORT),
          cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
            credentials: true,
          },
        },
      },
      logger: {
        debug: (msg, ...meta) => logger.debug(`[Plugin] ${msg}`, ...meta),
        info: (msg, ...meta) => logger.info(`[Plugin] ${msg}`, ...meta),
        warn: (msg, ...meta) => logger.warn(`[Plugin] ${msg}`, ...meta),
        error: (msg, ...meta) => logger.error(`[Plugin] ${msg}`, ...meta),
      },
    });

    // 加载所有插件
    const { loaded, failed } = await pluginManager.loadAll();
    logger.info(`插件加载完成: ${loaded} 个成功, ${failed} 个失败`);

    // 启动所有插件
    await pluginManager.startAll();

    // 配置通道插件的消息处理
    setupChannelHandlers(pluginManager);

    // 创建 Express + Socket.io 服务器（保留现有 HTTP API）
    const { httpServer } = await createServer();

    // 启动 HTTP 服务器
    httpServer.listen(Number(PORT), HOST, () => {
      logger.info(`🚀 OpenClaw Gateway 服务已启动`);
      logger.info(`📡 HTTP 服务器: http://${HOST}:${PORT}`);
      logger.info(`🔌 WebSocket 服务器: ws://${HOST}:${PORT}`);
      logger.info(`📚 API 文档: http://${HOST}:${PORT}/api/v1/docs`);
    });

    // 优雅关闭处理
    process.on('SIGTERM', () => gracefulShutdown(httpServer, pluginManager));
    process.on('SIGINT', () => gracefulShutdown(httpServer, pluginManager));
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

/**
 * 配置通道插件的消息处理
 */
function setupChannelHandlers(pluginManager: PluginManager): void {
  const channels = pluginManager.getPluginsByType('channel');

  for (const channel of channels) {
    if ('onMessage' in channel) {
      (channel as any).onMessage((message: any) => {
        logger.debug(`收到 ${channel.name} 的消息:`, message.content.substring(0, 50));

        // TODO: 集成 AI 处理流程
        // 这里应该调用 AI 服务，然后将回复通过 channel.send() 发送回去
      });

      logger.info(`已配置 ${channel.name} 的消息处理器`);
    }
  }
}

/**
 * 优雅关闭服务器
 */
async function gracefulShutdown(
  server: import('http').Server,
  pluginManager: PluginManager
) {
  logger.info('正在关闭服务器...');

  // 停止所有插件
  await pluginManager.stopAll();

  server.close(() => {
    logger.info('HTTP 服务器已关闭');
    process.exit(0);
  });

  // 强制关闭超时
  setTimeout(() => {
    logger.error('强制关闭服务器');
    process.exit(1);
  }, 30000);
}

// 启动应用
main();
