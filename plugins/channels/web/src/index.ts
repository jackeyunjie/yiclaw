/**
 * Web Channel Plugin for OpenClaw
 *
 * 提供基于 WebSocket 的网页聊天功能
 */

import {
  ChannelPlugin,
  ChannelStatus,
  IncomingMessage,
  OutgoingMessage,
  MessageHandler,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';

/**
 * Web 通道配置
 */
interface WebChannelConfig {
  /** 服务器端口 */
  port: number;

  /** CORS 配置 */
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

/**
 * 用户信息
 */
interface UserInfo {
  userId: string;
  username: string;
  sessionId?: string;
}

/**
 * Web 聊天通道插件
 */
export default class WebChannel implements ChannelPlugin {
  readonly id = 'web';
  readonly name = 'Web Chat';
  readonly version = '1.0.0';
  readonly type = PluginType.CHANNEL;
  readonly description = '基于 WebSocket 的网页聊天通道';

  private io?: SocketIOServer;
  private httpServer?: HttpServer;
  private messageHandler?: MessageHandler;
  private runtime?: Runtime;
  private config: WebChannelConfig = {
    port: 3000,
    cors: {
      origin: ['http://localhost:5173'],
      credentials: true,
    },
  };

  /** 在线用户映射：socket.id -> UserInfo */
  private users = new Map<string, UserInfo>();

  /** 统计 */
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    usersCount: 0,
  };

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    // 从配置中读取
    const config = runtime.getConfig<Partial<WebChannelConfig>>('web') || {};
    this.config = {
      ...this.config,
      ...config,
      cors: {
        ...this.config.cors,
        ...config.cors,
      },
    };

    runtime.logger.info(`WebChannel initialized with config:`, this.config);
  }

  async start(): Promise<void> {
    if (!this.runtime) {
      throw new Error('WebChannel not initialized');
    }

    const logger = this.runtime.logger;

    // 创建 HTTP 服务器
    this.httpServer = createServer();

    // 创建 Socket.io 服务器
    this.io = new SocketIOServer(this.httpServer, {
      cors: this.config.cors,
    });

    // 配置事件处理
    this.setupSocketHandlers();

    // 启动服务器
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.port, () => {
        logger.info(`🌐 WebChannel listening on port ${this.config.port}`);
        resolve();
      });

      this.httpServer!.on('error', (err) => {
        logger.error('WebChannel server error:', err);
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.io) {
      this.io.close();
      this.runtime?.logger.info('WebChannel Socket.io closed');
    }

    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.runtime?.logger.info('WebChannel HTTP server closed');
          resolve();
        });
      });
    }
  }

  /**
   * 配置 Socket.io 事件处理
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.runtime?.logger.debug(`Client connected: ${socket.id}`);

      // 用户认证
      socket.on('auth', (data: { userId: string; username: string; token?: string }) => {
        this.handleAuth(socket, data);
      });

      // 加入会话
      socket.on('session:join', (data: { sessionId: string }) => {
        this.handleJoinSession(socket, data);
      });

      // 离开会话
      socket.on('session:leave', (data: { sessionId: string }) => {
        this.handleLeaveSession(socket, data);
      });

      // 接收消息
      socket.on('message', (data: { content: string; contentType?: string }) => {
        this.handleMessage(socket, data);
      });

      // 打字指示器
      socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
        socket.to(`session:${data.sessionId}`).emit('typing', {
          userId: this.users.get(socket.id)?.userId,
          isTyping: data.isTyping,
        });
      });

      // 断开连接
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * 处理用户认证
   */
  private handleAuth(socket: Socket, data: { userId: string; username: string; token?: string }): void {
    // TODO: 验证 token

    this.users.set(socket.id, {
      userId: data.userId,
      username: data.username,
    });

    this.stats.usersCount = this.users.size;

    socket.emit('auth:success', {
      userId: data.userId,
      socketId: socket.id,
    });

    this.runtime?.logger.info(`User ${data.username} (${data.userId}) authenticated on socket ${socket.id}`);
  }

  /**
   * 处理加入会话
   */
  private handleJoinSession(socket: Socket, data: { sessionId: string }): void {
    const user = this.users.get(socket.id);
    if (!user) {
      socket.emit('error', { code: 'NOT_AUTHENTICATED', message: '请先认证' });
      return;
    }

    // 更新用户当前会话
    user.sessionId = data.sessionId;

    // 加入房间
    socket.join(`session:${data.sessionId}`);

    socket.emit('session:joined', {
      sessionId: data.sessionId,
      userId: user.userId,
    });

    this.runtime?.logger.debug(`User ${user.userId} joined session ${data.sessionId}`);
  }

  /**
   * 处理离开会话
   */
  private handleLeaveSession(socket: Socket, data: { sessionId: string }): void {
    const user = this.users.get(socket.id);
    if (!user) return;

    socket.leave(`session:${data.sessionId}`);
    user.sessionId = undefined;

    socket.emit('session:left', { sessionId: data.sessionId });

    this.runtime?.logger.debug(`User ${user.userId} left session ${data.sessionId}`);
  }

  /**
   * 处理用户消息
   */
  private handleMessage(socket: Socket, data: { content: string; contentType?: string }): void {
    const user = this.users.get(socket.id);
    if (!user) {
      socket.emit('error', { code: 'NOT_AUTHENTICATED', message: '请先认证' });
      return;
    }

    if (!user.sessionId) {
      socket.emit('error', { code: 'NO_SESSION', message: '请先加入会话' });
      return;
    }

    // 构建消息对象
    const message: IncomingMessage = {
      id: this.generateId(),
      channel: this.id,
      userId: user.userId,
      sender: {
        id: user.userId,
        name: user.username,
      },
      content: data.content,
      contentType: (data.contentType as any) || 'text',
      timestamp: new Date(),
      sessionId: user.sessionId,
    };

    // 更新统计
    this.stats.messagesReceived++;

    // 通知处理器
    this.messageHandler?.(message);

    this.runtime?.logger.debug(`Message from ${user.userId}: ${data.content.substring(0, 50)}...`);
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(socket: Socket): void {
    const user = this.users.get(socket.id);
    if (user) {
      this.runtime?.logger.info(`User ${user.username} (${user.userId}) disconnected`);
      this.users.delete(socket.id);
      this.stats.usersCount = this.users.size;
    }
  }

  /**
   * 发送消息（实现 ChannelPlugin 接口）
   */
  async send(message: OutgoingMessage): Promise<void> {
    if (!this.io) {
      throw new Error('WebChannel not started');
    }

    // 发送到会话房间
    if (message.sessionId) {
      this.io.to(`session:${message.sessionId}`).emit('message', {
        id: this.generateId(),
        channel: this.id,
        content: message.content,
        contentType: message.contentType || 'text',
        timestamp: new Date(),
        metadata: message.metadata,
      });

      this.stats.messagesSent++;
    }

    // 或者发送到特定用户
    else if (message.userId) {
      // 找到用户的 socket
      for (const [socketId, user] of this.users) {
        if (user.userId === message.userId) {
          this.io.to(socketId).emit('message', {
            id: this.generateId(),
            channel: this.id,
            content: message.content,
            contentType: message.contentType || 'text',
            timestamp: new Date(),
            metadata: message.metadata,
          });

          this.stats.messagesSent++;
          break;
        }
      }
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * 获取通道状态
   */
  getStatus(): ChannelStatus {
    if (!this.io) {
      return ChannelStatus.DISCONNECTED;
    }

    // 简单状态检查
    if (this.httpServer?.listening) {
      return ChannelStatus.CONNECTED;
    }

    return ChannelStatus.ERROR;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    messagesReceived: number;
    messagesSent: number;
    usersCount: number;
  } {
    return { ...this.stats };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
