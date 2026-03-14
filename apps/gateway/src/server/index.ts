/**
 * 服务器创建模块
 *
 * 创建并配置 Express + Socket.io 服务器
 */

import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger, securityLogger } from '../utils/logger';
import authRoutes from '../routes/auth';
import sessionRoutes from '../routes/sessions';
import chatRoutes from '../routes/chat';
import tasksAutoRoutes from '../routes/tasks-auto';
import reactRoutes from '../routes/react';
import schedulerRoutes from '../routes/scheduler';
import agentsRoutes from '../routes/agents';
import memoryRoutes from '../routes/memory';
import messagingRoutes from '../routes/messaging';
import databaseRoutes from '../routes/database';
import { cronScheduler } from '../services/scheduler/CronScheduler';

// 加载环境变量
dotenv.config();

/**
 * 创建服务器
 */
export async function createServer(): Promise<{ app: express.Application; httpServer: import('http').Server; io: SocketIOServer }> {
  // 创建 Express 应用
  const app = express();

  // 创建 HTTP 服务器
  const httpServer = createHttpServer(app);

  // 创建 Socket.io 服务器
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
    },
  });

  // 配置中间件
  setupMiddleware(app);

  // 配置路由
  setupRoutes(app);

  // 配置 Socket.io
  setupSocketIO(io);

  return { app, httpServer, io };
}

/**
 * 配置 Express 中间件
 */
function setupMiddleware(app: express.Application): void {
  // 安全响应头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  }));

  // 速率限制
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: 100, // 每 IP 100 请求
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
      },
    },
  });
  app.use(limiter);

  // 登录专用速率限制
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 5 次尝试
    message: {
      success: false,
      error: {
        code: 'LOGIN_ATTEMPTS_EXCEEDED',
        message: '登录尝试次数过多，请 15 分钟后再试',
      },
    },
  });
  app.use('/api/v1/auth/login', loginLimiter);

  // JSON 解析
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 安全请求日志（自动脱敏敏感信息）
  app.use(securityLogger);
}

/**
 * 配置路由
 */
function setupRoutes(app: express.Application): void {
  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // API 路由
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/tasks-auto', tasksAutoRoutes);
  app.use('/api/v1/react', reactRoutes);
  app.use('/api/v1/scheduler', schedulerRoutes);
  app.use('/api/v1/agents', agentsRoutes);
  app.use('/api/v1/memory', memoryRoutes);
  app.use('/api/v1/messaging', messagingRoutes);
  app.use('/api/v1/database', databaseRoutes);
  // app.use('/api/v1/model-configs', modelConfigRoutes);
  // app.use('/api/v1/tools', toolRoutes);

  // 启动定时任务调度器
  cronScheduler.start();
  logger.info('定时任务调度器已启动');

  // 404 处理
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求路径不存在',
      },
    });
  });

  // 错误处理
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('请求处理错误:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  });
}

/**
 * 配置 Socket.io
 */
function setupSocketIO(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    logger.info(`客户端连接: ${socket.id}`);

    // 连接事件将在后续添加
    // socket.on('chat:message', handleChatMessage);
    // socket.on('session:join', handleJoinSession);
    // socket.on('session:leave', handleLeaveSession);

    socket.on('disconnect', () => {
      logger.info(`客户端断开: ${socket.id}`);
    });
  });
}
