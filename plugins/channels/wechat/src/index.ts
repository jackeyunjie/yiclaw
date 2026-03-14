/**
 * WeChat Channel Plugin for OpenClaw
 *
 * 微信个人号通道插件，支持群聊和私聊
 * 基于 Wechaty + wechaty-puppet-wechat4u 实现
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
import { WechatyBuilder, Contact, Room, Message } from 'wechaty';
import { PuppetWechat4u } from 'wechaty-puppet-wechat4u';

/**
 * 微信配置
 */
interface WechatConfig {
  /** 机器人名称 */
  name?: string;
  /** 是否自动接受好友请求 */
  autoAcceptFriend?: boolean;
  /** 管理员微信号（用于接收通知） */
  adminWechatId?: string;
  /** 需要处理的群名称列表（为空则处理所有群） */
  targetRooms?: string[];
  /** 触发词（在群里需要@机器人或包含这些词） */
  triggerWords?: string[];
}

/**
 * 微信通道插件
 */
export default class WechatChannel implements ChannelPlugin {
  readonly id = 'wechat';
  readonly name = 'WeChat Personal';
  readonly version = '1.0.0';
  readonly type = PluginType.CHANNEL;
  readonly description = '微信个人号接入，支持群聊和私聊';

  private runtime?: Runtime;
  private config: WechatConfig = {
    name: 'YiClawBot',
    autoAcceptFriend: false,
    triggerWords: ['@YiClaw', '@AI', '@助手'],
  };

  private bot?: ReturnType<typeof WechatyBuilder.build>;
  private messageHandler?: MessageHandler;
  private status = ChannelStatus.DISCONNECTED;

  /** 用户/群映射表 */
  private contactMap = new Map<string, Contact>();
  private roomMap = new Map<string, Room>();

  /** 统计数据 */
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    usersCount: 0,
    roomsCount: 0,
  };

  /** 机器人自身ID */
  private selfId?: string;

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    const config = runtime.getConfig<WechatConfig>('wechat') || {};
    this.config = {
      ...this.config,
      ...config,
    };

    runtime.logger.info('WechatChannel initialized');
    runtime.logger.info(`Config: ${JSON.stringify(this.config)}`);
  }

  async start(): Promise<void> {
    if (!this.runtime) {
      throw new Error('WechatChannel not initialized');
    }

    const logger = this.runtime.logger;

    // 创建 Wechaty 实例
    this.bot = WechatyBuilder.build({
      name: this.config.name,
      puppet: new PuppetWechat4u(),
    });

    // 监听事件
    this.bot
      .on('scan', (qrcode: string, status: number) => {
        this.handleScan(qrcode, status);
      })
      .on('login', (user: Contact) => {
        this.handleLogin(user);
      })
      .on('logout', (user: Contact) => {
        this.handleLogout(user);
      })
      .on('message', (message: Message) => {
        this.handleMessage(message);
      })
      .on('friendship', (friendship) => {
        this.handleFriendship(friendship);
      })
      .on('room-join', (room, inviteeList, inviter) => {
        this.handleRoomJoin(room, inviteeList, inviter);
      })
      .on('error', (error: Error) => {
        logger.error('Wechaty error:', error.message);
        this.status = ChannelStatus.ERROR;
      });

    // 启动机器人
    await this.bot.start();
    this.status = ChannelStatus.CONNECTING;

    logger.info('🤖 WechatChannel starting...');
    logger.info('请扫描二维码登录微信');
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.runtime?.logger.info('WechatChannel stopped');
    }
    this.status = ChannelStatus.DISCONNECTED;
  }

  /**
   * 处理扫码登录
   */
  private handleScan(qrcode: string, status: number): void {
    const statusMap: Record<number, string> = {
      0: '等待扫码',
      1: '等待确认',
      2: '已确认',
      3: '已过期',
      4: '已取消',
    };

    // 在终端显示二维码
    const qrcodeUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;

    this.runtime?.logger.info('\n========================================');
    this.runtime?.logger.info('📱 微信扫码登录');
    this.runtime?.logger.info(`状态: ${statusMap[status] || '未知'}`);
    this.runtime?.logger.info(`二维码: ${qrcodeUrl}`);
    this.runtime?.logger.info('========================================\n');

    // 发送二维码给管理员（如果配置了）
    if (this.config.adminWechatId && status === 0) {
      this.runtime?.logger.info(`请发送二维码给管理员: ${this.config.adminWechatId}`);
    }
  }

  /**
   * 处理登录成功
   */
  private handleLogin(user: Contact): void {
    this.selfId = user.id;
    this.status = ChannelStatus.CONNECTED;

    this.runtime?.logger.info(`\n🎉 微信登录成功!`);
    this.runtime?.logger.info(`👤 用户: ${user.name()}`);
    this.runtime?.logger.info(`🆔 ID: ${user.id}\n`);

    // 更新统计数据
    this.updateStats();
  }

  /**
   * 处理登出
   */
  private handleLogout(user: Contact): void {
    this.status = ChannelStatus.DISCONNECTED;
    this.runtime?.logger.info(`👋 微信已登出: ${user.name()}`);
  }

  /**
   * 处理消息
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      // 忽略自己发的消息
      if (message.self()) {
        return;
      }

      const contact = message.talker();
      const room = message.room();
      const text = message.text();

      // 检查是否需要处理
      const shouldProcess = await this.shouldProcessMessage(message, room, text);
      if (!shouldProcess) {
        return;
      }

      // 保存联系人和群信息
      this.contactMap.set(contact.id, contact);
      if (room) {
        this.roomMap.set(room.id, room);
      }

      // 获取发送者信息
      const senderName = contact.name();
      const roomName = room ? await room.topic() : undefined;

      // 构建标准消息格式
      const incomingMessage: IncomingMessage = {
        id: message.id,
        channel: this.id,
        userId: contact.id,
        sender: {
          id: contact.id,
          name: senderName,
        },
        content: text,
        contentType: 'text',
        timestamp: new Date(),
        sessionId: room ? room.id : contact.id,
        metadata: {
          isRoom: !!room,
          roomName: roomName,
          roomId: room?.id,
          messageType: message.type(),
        },
      };

      // 更新统计
      this.stats.messagesReceived++;

      // 通知处理器
      this.messageHandler?.(incomingMessage);

      this.runtime?.logger.debug(
        `[WeChat] ${roomName ? `[${roomName}] ` : ''}${senderName}: ${text.substring(0, 50)}...`
      );
    } catch (error) {
      this.runtime?.logger.error('Error handling message:', error);
    }
  }

  /**
   * 判断是否处理消息
   */
  private async shouldProcessMessage(message: Message, room: Room | undefined, text: string): Promise<boolean> {
    // 私聊消息：全部处理
    if (!room) {
      return true;
    }

    // 群聊消息：需要检查触发条件
    const roomName = await room.topic();

    // 如果配置了目标群列表，只处理这些群
    if (this.config.targetRooms && this.config.targetRooms.length > 0) {
      if (!this.config.targetRooms.includes(roomName)) {
        return false;
      }
    }

    // 检查是否@了机器人
    const isMentioned = await message.mentionSelf();

    // 检查是否包含触发词
    const hasTriggerWord = this.config.triggerWords?.some(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ) || false;

    return isMentioned || hasTriggerWord;
  }

  /**
   * 处理好友请求
   */
  private async handleFriendship(friendship: any): Promise<void> {
    if (this.config.autoAcceptFriend) {
      await friendship.accept();
      this.runtime?.logger.info(`已自动接受好友请求: ${friendship.contact().name()}`);
    }
  }

  /**
   * 处理群加入事件
   */
  private async handleRoomJoin(
    room: Room,
    inviteeList: Contact[],
    inviter: Contact
  ): Promise<void> {
    const roomName = await room.topic();
    this.runtime?.logger.info(`新成员加入群 [${roomName}]: ${inviteeList.map(c => c.name()).join(', ')}`);

    // 如果是自己被邀请进群，发送欢迎消息
    const self = this.bot?.currentUser;
    if (self && inviteeList.some(c => c.id === self.id)) {
      await room.say('大家好！我是 YiClaw AI 助手，有问题随时@我 😊');
    }
  }

  /**
   * 发送消息（实现 ChannelPlugin 接口）
   */
  async send(message: OutgoingMessage): Promise<void> {
    if (!this.bot) {
      throw new Error('WechatChannel not started');
    }

    const { sessionId, content, metadata } = message;
    const messageContent = content || '';

    if (!messageContent) {
      this.runtime?.logger.error('Message content is empty');
      return;
    }

    try {
      // 判断是群消息还是私聊消息
      if (metadata?.isRoom) {
        // 群消息
        const room = this.roomMap.get(sessionId);
        if (room) {
          await room.say(messageContent);
          this.stats.messagesSent++;
          this.runtime?.logger.debug(`[WeChat] Sent to room [${metadata.roomName}]: ${messageContent.substring(0, 50)}...`);
        } else {
          // 如果缓存中没有，尝试从 bot 获取
          const roomById = await this.bot.Room.find({ id: sessionId });
          if (roomById) {
            await roomById.say(messageContent);
            this.stats.messagesSent++;
            this.roomMap.set(sessionId, roomById);
          } else {
            this.runtime?.logger.error(`Room not found: ${sessionId}`);
            return;
          }
        }
      } else {
        // 私聊消息
        const contact = this.contactMap.get(sessionId);
        if (contact) {
          await contact.say(messageContent);
          this.stats.messagesSent++;
          this.runtime?.logger.debug(`[WeChat] Sent to ${contact.name()}: ${messageContent.substring(0, 50)}...`);
        } else {
          // 如果缓存中没有，尝试从 bot 获取
          const contactById = await this.bot.Contact.find({ id: sessionId });
          if (contactById) {
            await contactById.say(messageContent);
            this.stats.messagesSent++;
            this.contactMap.set(sessionId, contactById);
          } else {
            this.runtime?.logger.error(`Contact not found: ${sessionId}`);
            return;
          }
        }
      }
    } catch (error) {
      this.runtime?.logger.error('Failed to send WeChat message:', error);
      throw error;
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
    return this.status;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    messagesReceived: number;
    messagesSent: number;
    usersCount: number;
    roomsCount: number;
  } {
    return { ...this.stats };
  }

  /**
   * 更新统计数据
   */
  private async updateStats(): Promise<void> {
    if (!this.bot) return;

    // 获取联系人数量
    const contacts = await this.bot.Contact.findAll();
    this.stats.usersCount = contacts.length;

    // 获取群数量
    const rooms = await this.bot.Room.findAll();
    this.stats.roomsCount = rooms.length;

    this.runtime?.logger.info(`📊 统计: ${contacts.length} 个联系人, ${rooms.length} 个群`);
  }

  /**
   * 获取联系人列表
   */
  async getContacts(): Promise<Array<{ id: string; name: string }>> {
    if (!this.bot) return [];

    const contacts = await this.bot.Contact.findAll();
    return contacts.map(c => ({ id: c.id, name: c.name() }));
  }

  /**
   * 获取群列表
   */
  async getRooms(): Promise<Array<{ id: string; name: string }>> {
    if (!this.bot) return [];

    const rooms = await this.bot.Room.findAll();
    const result: Array<{ id: string; name: string }> = [];

    for (const room of rooms) {
      const topic = await room.topic();
      result.push({ id: room.id, name: topic });
    }

    return result;
  }
}
