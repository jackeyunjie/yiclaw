/**
 * AI SDK 类型定义
 */

import type { ModelParameters, ToolDefinition } from '@openclaw/shared';

// 模型提供商配置
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

// 工具调用
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// 聊天请求选项
export interface ChatRequestOptions {
  model: string;
  messages: ChatMessage[];
  parameters?: ModelParameters;
  tools?: ToolDefinition[];
  stream?: boolean;
}

// 聊天响应
export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// 流式响应块
export interface ChatStreamChunk {
  content: string;
  isFinished: boolean;
  toolCalls?: ToolCall[];
}

// 模型提供商接口
export interface ModelProvider {
  readonly name: string;
  readonly availableModels: string[];

  /**
   * 验证配置是否有效
   */
  validateConfig(): Promise<boolean>;

  /**
   * 发送聊天请求
   */
  chat(options: ChatRequestOptions): Promise<ChatResponse>;

  /**
   * 发送流式聊天请求
   */
  chatStream(options: ChatRequestOptions): AsyncIterable<ChatStreamChunk>;

  /**
   * 获取可用模型列表
   */
  listModels(): Promise<string[]>;
}

// 模型路由器配置
export interface ModelRouterConfig {
  // 全局默认配置
  global?: {
    provider: string;
    model: string;
  };
  // 板块级配置
  sections?: Record<string, {
    provider: string;
    model: string;
  }>;
  // 节点级配置
  nodes?: Record<string, {
    provider: string;
    model: string;
  }>;
}

// 路由结果
export interface RouteResult {
  provider: string;
  model: string;
  config: ProviderConfig;
}
