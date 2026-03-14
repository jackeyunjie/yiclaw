/**
 * 模型提供商基类
 *
 * 所有具体提供商实现都应继承此类
 */

import type {
  ModelProvider,
  ProviderConfig,
  ChatRequestOptions,
  ChatResponse,
  ChatStreamChunk,
} from '../types';

export abstract class BaseProvider implements ModelProvider {
  abstract readonly name: string;
  abstract readonly availableModels: string[];

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000, // 默认 60 秒超时
      ...config,
    };
  }

  /**
   * 验证配置是否有效
   * 子类应重写此方法
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * 发送聊天请求
   * 子类应重写此方法
   */
  abstract chat(options: ChatRequestOptions): Promise<ChatResponse>;

  /**
   * 发送流式聊天请求
   * 子类应重写此方法
   */
  abstract chatStream(options: ChatRequestOptions): AsyncIterable<ChatStreamChunk>;

  /**
   * 获取可用模型列表
   * 默认返回预定义的模型列表，子类可重写以动态获取
   */
  async listModels(): Promise<string[]> {
    return this.availableModels;
  }

  /**
   * 处理错误
   * @param error 原始错误
   * @param context 错误上下文
   */
  protected handleError(error: unknown, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: 未知错误`);
  }
}
