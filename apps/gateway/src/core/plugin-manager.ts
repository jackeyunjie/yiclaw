/**
 * OpenClaw Gateway - Plugin Manager
 *
 * 插件管理器：负责插件的加载、生命周期管理和协调
 */

import {
  Plugin,
  Runtime,
  PluginType,
  Logger,
  EventBus,
  PluginLoader,
  createRuntime,
  createLoader,
} from '@openclaw/plugin-sdk';

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  /** 插件目录列表 */
  pluginDirs: string[];

  /** 应用配置 */
  appConfig?: Record<string, unknown>;

  /** 日志实例 */
  logger?: Logger;

  /** 事件总线 */
  events?: EventBus;
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private runtime: Runtime;
  private loader: PluginLoader;
  private logger: Logger;
  private config: PluginManagerConfig;

  constructor(config: PluginManagerConfig) {
    this.config = config;
    this.logger = config.logger ?? (console as unknown as Logger);

    // 创建运行时上下文
    this.runtime = createRuntime({
      config: config.appConfig,
      logger: this.logger,
      events: config.events,
    });

    // 创建插件加载器（使用 dist/index.js 模式）
    this.loader = createLoader({
      logger: this.logger,
      pattern: '*/dist/index.js',
    });
  }

  /**
   * 加载所有插件
   */
  async loadAll(): Promise<{ loaded: number; failed: number }> {
    let totalLoaded = 0;
    let totalFailed = 0;

    for (const dir of this.config.pluginDirs) {
      this.logger.info(`Loading plugins from: ${dir}`);

      const result = await this.loader.loadFromDirectory(dir, this.runtime);

      totalLoaded += result.loaded.length;
      totalFailed += result.failed.length;

      // 将加载的插件注册到管理器
      for (const plugin of result.loaded) {
        this.plugins.set(plugin.id, plugin);
        (this.runtime as any).registerPlugin?.(plugin);
      }
    }

    this.logger.info(
      `Plugin loading complete: ${totalLoaded} loaded, ${totalFailed} failed`
    );

    return { loaded: totalLoaded, failed: totalFailed };
  }

  /**
   * 启动所有插件
   */
  async startAll(): Promise<void> {
    this.logger.info('Starting all plugins...');

    for (const [id, plugin] of this.plugins) {
      try {
        await plugin.start();
        this.logger.info(`✅ Plugin started: ${plugin.name}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to start plugin ${id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  /**
   * 停止所有插件
   */
  async stopAll(): Promise<void> {
    this.logger.info('Stopping all plugins...');

    // 按相反顺序停止
    const plugins = Array.from(this.plugins.entries()).reverse();

    for (const [id, plugin] of plugins) {
      try {
        await plugin.stop();
        this.logger.info(`⏹️ Plugin stopped: ${plugin.name}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to stop plugin ${id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  /**
   * 获取指定插件
   */
  getPlugin<T extends Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  /**
   * 获取指定类型的所有插件
   */
  getPluginsByType<T extends Plugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values()).filter(
      (p): p is T => p.type === type
    );
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取运行时上下文
   */
  getRuntime(): Runtime {
    return this.runtime;
  }

  /**
   * 检查插件是否存在
   */
  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }
}
