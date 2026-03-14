/**
 * Feishu (Lark) Channel Plugin for OpenClaw
 *
 * 飞书/钉钉通道插件，支持 Bot 消息收发
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

/**
 * 飞书 Bot 配置
 */
interface FeishuConfig {
  /** App ID */
  appId: string;
  /** App Secret */
  appSecret: string;
  /** Encrypt Key（可选） */
  encryptKey?: string;
  /** Verification Token（可选） */
  verificationToken?: string;
  /** Webhook 端口 */
  webhookPort: number;
  /** Webhook 路径 */
  webhookPath: string;
}

/**
 * 飞书消息发送者
 */
interface FeishuSender {
  union_id: string;
  user_id?: string;
  open_id?: string;
  name?: string;
}

/**
 * 飞书事件消息
 */
interface FeishuEvent {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender?: FeishuSender;
    message?: {
      message_id: string;
      chat_id: string;
      chat_type: string;
      message_type: string;
      content: string;
      mentions?: Array<{
        key: string;
        id: {
          union_id: string;
          user_id: string;
          open_id: string;
        };
        name: string;
        tenant_key: string;
      }>;
    };
    [key: string]: unknown;
  };
}

/**
 * 飞书通道插件
 */
export default class FeishuChannel implements ChannelPlugin {
  readonly id = 'feishu';
  readonly name = 'Feishu (Lark)';
  readonly version = '1.0.0';
  readonly type = PluginType.CHANNEL;
  readonly description = '飞书/钉钉 Bot 消息通道';

  private runtime?: Runtime;
  private config?: FeishuConfig;
  private messageHandler?: MessageHandler;
  private status = ChannelStatus.DISCONNECTED;

  /** 用户会话映射 */
  private sessions = new Map<string, string>(); // userId -> sessionId

  /** 统计 */
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    usersCount: 0,
  };

  /** 访问令牌 */
  private accessToken?: string;
  private tokenExpiresAt?: number;

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    // 读取配置
    this.config = runtime.getConfig<FeishuConfig>('feishu') || runtime.getConfig<FeishuConfig>('channels.feishu');

    if (!this.config?.appId || !this.config?.appSecret) {
      runtime.logger.warn('Feishu config not found, plugin will be disabled');
      return;
    }

    // 设置默认值
    this.config = {
      ...this.config,
      webhookPort: this.config.webhookPort || 3002,
      webhookPath: this.config.webhookPath || '/webhook/feishu',
    };

    runtime.logger.info('FeishuChannel initialized');
  }

  async start(): Promise<void> {
    if (!this.config?.appId) {
      this.runtime?.logger.warn('FeishuChannel not configured, skipping start');
      return;
    }

    // 获取访问令牌
    await this.refreshAccessToken();

    // 启动 Webhook 服务器
    await this.startWebhookServer();

    this.status = ChannelStatus.CONNECTED;
    this.runtime?.logger.info('🤖 FeishuChannel started');
  }

  async stop(): Promise<void> {
    this.status = ChannelStatus.DISCONNECTED;
    this.runtime?.logger.info('FeishuChannel stopped');
  }

  /**
   * 刷新访问令牌
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.config) return;

    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
      });

      const data = await response.json() as { code: number; tenant_access_token?: string; expire?: number; msg?: string };

      if (data.code === 0) {
        this.accessToken = data.tenant_access_token;
        this.tokenExpiresAt = Date.now() + ((data.expire || 3600) - 60) * 1000; // 提前 60 秒过期
        this.runtime?.logger.debug('Feishu access token refreshed');
      } else {
        throw new Error(`Failed to get access token: ${data.msg}`);
      }
    } catch (error) {
      this.runtime?.logger.error('Failed to refresh Feishu access token:', error);
      throw error;
    }
  }

  /**
   * 获取有效的访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= (this.tokenExpiresAt || 0)) {
      await this.refreshAccessToken();
    }
    return this.accessToken!;
  }

  /**
   * 启动 Webhook 服务器
   */
  private async startWebhookServer(): Promise<void> {
    if (!this.config) return;

    // 使用 Express 创建简单的 webhook 服务器
    const { createServer } = await import('http');

    const server = createServer(async (req, res) => {
      const url = req.url || '';
      const method = req.method || '';

      if (url === this.config!.webhookPath && method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const event = JSON.parse(body) as FeishuEvent;
            await this.handleEvent(event);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 0, msg: 'success' }));
          } catch (error) {
            this.runtime?.logger.error('Error handling Feishu event:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 400, msg: 'bad request' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    return new Promise((resolve, reject) => {
      server.listen(this.config!.webhookPort, () => {
        this.runtime?.logger.info(
          `Feishu webhook server listening on port ${this.config!.webhookPort}`
        );
        resolve();
      });

      server.on('error', reject);
    });
  }

  /**
   * 处理飞书事件
   */
  private async handleEvent(event: FeishuEvent): Promise<void> {
    const eventType = event.header.event_type;

    switch (eventType) {
      case 'im.message.receive_v1':
        await this.handleMessageEvent(event);
        break;

      case 'url_verification':
        // 验证请求，直接返回 challenge
        break;

      default:
        this.runtime?.logger.debug(`Unhandled Feishu event type: ${eventType}`);
    }
  }

  /**
   * 处理消息事件
   */
  private async handleMessageEvent(event: FeishuEvent): Promise<void> {
    const message = event.event.message;
    const sender = event.event.sender;

    if (!message || !sender) return;

    // 解析消息内容
    let content = '';
    try {
      const parsed = JSON.parse(message.content);
      content = parsed.text || '';
    } catch {
      content = message.content;
    }

    // 忽略空消息或自己的消息
    if (!content.trim()) return;

    const userId = sender.union_id || sender.user_id || sender.open_id || 'unknown';

    // 构建标准消息格式
    const incomingMessage: IncomingMessage = {
      id: message.message_id,
      channel: this.id,
      userId,
      sender: {
        id: userId,
        name: sender.name || '未知用户',
      },
      content,
      contentType: this.mapMessageType(message.message_type),
      timestamp: new Date(parseInt(event.header.create_time)),
      sessionId: message.chat_id,
      metadata: {
        chatId: message.chat_id,
        chatType: message.chat_type,
        messageType: message.message_type,
      },
    };

    // 更新统计
    this.stats.messagesReceived++;

    // 通知处理器
    this.messageHandler?.(incomingMessage);

    this.runtime?.logger.debug(
      `Feishu message from ${sender.name}: ${content.substring(0, 50)}...`
    );
  }

  /**
   * 映射飞书消息类型到标准类型
   */
  private mapMessageType(feishuType: string): 'text' | 'image' | 'file' | 'voice' {
    switch (feishuType) {
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'file':
        return 'file';
      case 'audio':
        return 'voice';
      default:
        return 'text';
    }
  }

  /**
   * 发送消息（实现 ChannelPlugin 接口）
   */
  async send(message: OutgoingMessage): Promise<void> {
    const token = await this.getAccessToken();

    const chatId = message.sessionId || message.metadata?.chatId;
    if (!chatId) {
      throw new Error('Missing chatId in message');
    }

    const body: any = {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: message.content }),
    };

    // 根据 contentType 调整消息类型
    if (message.contentType === 'image') {
      body.msg_type = 'image';
      body.content = JSON.stringify({ image_key: message.content });
    }

    const response = await fetch(
      'https://open.feishu.cn/open-apis/im/v1/messages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json() as { code: number; msg?: string };

    if (data.code !== 0) {
      throw new Error(`Failed to send message: ${data.msg}`);
    }

    this.stats.messagesSent++;
    this.runtime?.logger.debug(`Feishu message sent to ${chatId}`);
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
    return this.status;
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
}
