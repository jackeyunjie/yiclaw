/**
 * OpenClaw Plugin SDK - Tool Plugin Interface
 *
 * 工具插件用于扩展 AI 的能力
 * 每个工具对应一个可被 AI 调用的功能
 */

import { Plugin, PluginType } from './plugin.js';

/**
 * JSON Schema 类型定义
 */
export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface JSONSchemaProperty {
  type: JSONSchemaType;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | { type: string };
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required: string[];
}

/**
 * 工具定义
 * 用于 AI function calling
 */
export interface ToolDefinition {
  /** 工具名称（英文，用于 AI 识别） */
  name: string;

  /** 工具显示名称 */
  displayName?: string;

  /** 工具描述（告诉 AI 这个工具做什么） */
  description: string;

  /** 参数定义 */
  parameters: JSONSchema;

  /** 是否需要确认（敏感操作） */
  requireConfirmation?: boolean;

  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: unknown;

  /** 错误信息 */
  error?: string;

  /** 执行时间（毫秒） */
  executionTime?: number;

  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** 当前用户ID */
  userId: string;

  /** 当前会话ID */
  sessionId?: string;

  /** 工具执行ID */
  executionId: string;

  /** 执行时间 */
  timestamp: Date;
}

/**
 * 工具插件接口
 */
export interface ToolPlugin extends Plugin {
  readonly type: PluginType.TOOL;

  /**
   * 获取工具定义
   * AI 根据此定义决定何时调用工具
   */
  getDefinition(): ToolDefinition;

  /**
   * 执行工具
   * @param params - AI 提供的参数
   * @param context - 执行上下文
   */
  execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult>;

  /**
   * 批量执行（可选）
   */
  executeBatch?(
    paramsList: Record<string, unknown>[],
    context: ToolContext
  ): Promise<ToolResult[]>;

  /**
   * 验证参数（可选）
   * 在执行前验证参数合法性
   */
  validate?(params: Record<string, unknown>): {
    valid: boolean;
    errors?: string[];
  };
}

/**
 * 工具注册表
 * 用于在运行时查找工具
 */
export interface ToolRegistry {
  register(tool: ToolPlugin): void;
  unregister(toolId: string): void;
  getTool(name: string): ToolPlugin | undefined;
  listTools(): ToolPlugin[];
}
