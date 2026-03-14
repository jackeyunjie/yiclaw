/**
 * OpenClaw Plugin SDK - Core Plugin Interface
 *
 * 所有插件必须实现此接口
 */

/**
 * 插件类型枚举
 */
export enum PluginType {
  CHANNEL = 'channel',
  MEMORY = 'memory',
  TOOL = 'tool',
  AGENT = 'agent',
  SKILL = 'skill',
}

/**
 * 日志接口
 */
export interface Logger {
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

/**
 * 运行时上下文
 * 插件通过此接口与核心系统交互
 */
export interface Runtime {
  /** 获取配置项 */
  getConfig<T>(key: string): T | undefined;

  /** 获取完整配置对象 */
  getAllConfig(): Record<string, unknown>;

  /** 注册能力 */
  register<T>(name: string, capability: T): void;

  /** 获取已注册的能力 */
  getCapability<T>(name: string): T | undefined;

  /** 获取其他插件实例 */
  getPlugin<T extends Plugin>(id: string): T | undefined;

  /** 获取指定类型的所有插件 */
  getPluginsByType<T extends Plugin>(type: PluginType): T[];

  /** 事件总线 */
  events: EventBus;

  /** 日志 */
  logger: Logger;
}

/**
 * 插件基接口
 * 所有插件必须实现
 */
export interface Plugin {
  /** 插件唯一标识（kebab-case） */
  readonly id: string;

  /** 插件显示名称 */
  readonly name: string;

  /** 插件版本（semver） */
  readonly version: string;

  /** 插件类型 */
  readonly type: PluginType;

  /** 插件描述 */
  readonly description?: string;

  /**
   * 初始化插件
   * 在 start() 之前调用，用于准备资源
   */
  init(runtime: Runtime): Promise<void> | void;

  /**
   * 启动插件
   * 此时插件开始对外提供服务
   */
  start(): Promise<void> | void;

  /**
   * 停止插件
   * 优雅关闭，释放资源
   */
  stop(): Promise<void> | void;
}

/**
 * 插件构造函数
 */
export interface PluginConstructor {
  new (): Plugin;
}

/**
 * 插件模块导出
 */
export interface PluginModule {
  default: PluginConstructor;
}
