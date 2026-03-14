/**
 * 共享类型定义
 */

// 通道类型枚举
export enum ChannelType {
  WEB = 'web',
  WECHAT = 'wechat',
  WECHAT_WORK = 'wechat_work',
  TELEGRAM = 'telegram',
  FEISHU = 'feishu',
  DINGTALK = 'dingtalk',
}

// 模型提供商枚举
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  QWEN = 'qwen',
  BAICHUAN = 'baichuan',
  OLLAMA = 'ollama',
}

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// 消息角色枚举
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

// 会话状态枚举
export enum SessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

// 基础模型配置接口
export interface ModelConfig {
  id?: string;
  provider: ModelProvider;
  modelId: string;
  name: string;
  apiKey?: string; // 加密存储
  baseUrl?: string;
  isDefault?: boolean;
  parameters?: ModelParameters;
  createdAt?: Date;
  updatedAt?: Date;
}

// 模型参数接口
export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// 消息接口
export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// 工具调用接口
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// 会话接口
export interface Session {
  id: string;
  userId: string;
  channelType: ChannelType;
  channelId: string;
  title?: string;
  status: SessionStatus;
  modelConfigId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户接口
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API 响应统一格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket 消息格式
export interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
  requestId: string;
}

// 工具定义接口
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// 工具执行结果接口
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
