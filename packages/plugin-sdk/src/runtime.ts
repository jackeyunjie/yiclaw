/**
 * OpenClaw Plugin SDK - Runtime Implementation
 *
 * 插件运行时上下文的标准实现
 */

import { Runtime, Logger, EventBus, Plugin, PluginType } from './types/index.js';

/**
 * 控制台日志实现
 */
export class ConsoleLogger implements Logger {
  private prefix: string;

  constructor(prefix: string = 'OpenClaw') {
    this.prefix = prefix;
  }

  debug(message: string, ...meta: unknown[]): void {
    console.debug(`[${this.prefix}] 🔍 ${message}`, ...meta);
  }

  info(message: string, ...meta: unknown[]): void {
    console.info(`[${this.prefix}] ℹ️ ${message}`, ...meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, ...meta);
  }

  error(message: string, ...meta: unknown[]): void {
    console.error(`[${this.prefix}] ❌ ${message}`, ...meta);
  }
}

/**
 * 简单事件总线实现
 */
export class SimpleEventBus implements EventBus {
  private handlers = new Map<string, Set<(data: unknown) => void>>();

  emit(event: string, data: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: unknown) => void): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

/**
 * 运行时配置选项
 */
export interface RuntimeOptions {
  /** 配置对象 */
  config?: Record<string, unknown>;

  /** 日志实例 */
  logger?: Logger;

  /** 事件总线实例 */
  events?: EventBus;
}

/**
 * 运行时上下文实现
 */
export class PluginRuntime implements Runtime {
  private config: Record<string, unknown>;
  private capabilities = new Map<string, unknown>();
  private plugins = new Map<string, Plugin>();
  readonly logger: Logger;
  readonly events: EventBus;

  constructor(options: RuntimeOptions = {}) {
    this.config = options.config || {};
    this.logger = options.logger || new ConsoleLogger();
    this.events = options.events || new SimpleEventBus();
  }

  /**
   * 注册插件到运行时
   * 由 PluginManager 调用
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  getConfig<T>(key: string): T | undefined {
    return this.config[key] as T | undefined;
  }

  getAllConfig(): Record<string, unknown> {
    return { ...this.config };
  }

  register<T>(name: string, capability: T): void {
    this.capabilities.set(name, capability);
    this.logger.debug(`Capability registered: ${name}`);
  }

  getCapability<T>(name: string): T | undefined {
    return this.capabilities.get(name) as T | undefined;
  }

  getPlugin<T extends Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  getPluginsByType<T extends Plugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values()).filter(
      (p): p is T => p.type === type
    );
  }
}

/**
 * 创建运行时实例
 */
export function createRuntime(options?: RuntimeOptions): Runtime {
  return new PluginRuntime(options);
}
