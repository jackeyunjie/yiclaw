/**
 * OpenClaw Plugin SDK - Channel Plugin Interface
 *
 * 通道插件用于接入各种消息平台（Web、微信、Telegram等）
 */

import { Plugin, PluginType } from './plugin.js';

/**
 * 通道状态
 */
export enum ChannelStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * 消息发送者
 */
export interface MessageSender {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * 接入消息（用户发送给 AI）
 */
export interface IncomingMessage {
  /** 消息唯一标识 */
  id: string;

  /** 通道标识 */
  channel: string;

  /** 用户标识 */
  userId: string;

  /** 发送者信息 */
  sender: MessageSender;

  /** 消息内容 */
  content: string;

  /** 消息类型 */
  contentType: 'text' | 'image' | 'file' | 'voice';

  /** 消息时间 */
  timestamp: Date;

  /** 会话标识 */
  sessionId?: string;

  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 发出消息（AI 回复给用户）
 */
export interface OutgoingMessage {
  /** 目标通道 */
  channel: string;

  /** 目标用户 */
  userId: string;

  /** 消息内容 */
  content: string;

  /** 消息类型 */
  contentType?: 'text' | 'image' | 'file' | 'voice';

  /** 目标会话 */
  sessionId?: string;

  /** 回复的消息ID */
  replyTo?: string;

  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 消息处理器
 */
export type MessageHandler = (message: IncomingMessage) => void | Promise<void>;

/**
 * 通道插件接口
 */
export interface ChannelPlugin extends Plugin {
  readonly type: PluginType.CHANNEL;

  /**
   * 发送消息
   */
  send(message: OutgoingMessage): Promise<void>;

  /**
   * 批量发送消息
   */
  sendBatch?(messages: OutgoingMessage[]): Promise<void>;

  /**
   * 注册消息处理器
   * 当收到用户消息时调用 handler
   */
  onMessage(handler: MessageHandler): void;

  /**
   * 获取通道状态
   */
  getStatus(): ChannelStatus;

  /**
   * 获取通道统计信息（可选）
   */
  getStats?(): {
    messagesReceived: number;
    messagesSent: number;
    usersCount: number;
  };
}
