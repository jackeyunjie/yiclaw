/**
 * OpenClaw Plugin SDK - Plugin Loader
 *
 * 插件扫描和加载器
 */

import {
  Plugin,
  Runtime,
  Logger,
} from './types/index.js';

/**
 * 插件加载选项
 */
export interface LoaderOptions {
  /** 日志实例 */
  logger?: Logger;

  /** 文件扫描模式 */
  pattern?: string;

  /** 是否递归扫描子目录 */
  recursive?: boolean;
}

/**
 * 插件加载结果
 */
export interface LoadResult {
  /** 成功加载的插件 */
  loaded: Plugin[];

  /** 加载失败的插件 */
  failed: { path: string; error: Error }[];
}

/**
 * 插件加载器
 */
export class PluginLoader {
  private logger: Logger;
  private options: LoaderOptions;

  constructor(options: LoaderOptions = {}) {
    this.options = options;
    this.logger = options.logger ?? console as unknown as Logger;
  }

  /**
   * 从目录加载插件
   *
   * @param directory - 插件目录路径
   * @param runtime - 运行时上下文
   * @returns 加载结果
   *
   * @example
   * ```typescript
   * const loader = new PluginLoader();
   * const result = await loader.loadFromDirectory('./plugins', runtime);
   * console.log(`Loaded ${result.loaded.length} plugins`);
   * ```
   */
  async loadFromDirectory(
    directory: string,
    runtime: Runtime
  ): Promise<LoadResult> {
    const result: LoadResult = { loaded: [], failed: [] };

    try {
      // Node.js 环境使用 glob 扫描
      const { glob } = await import('glob');
      const pattern = this.options.pattern ?? '*/index.{ts,js,mjs}';
      const files = await glob(pattern, {
        cwd: directory,
        absolute: true,
      });

      this.logger.debug(`Found ${files.length} potential plugins in ${directory}`);

      for (const file of files) {
        try {
          const plugin = await this.loadPlugin(file, runtime);
          if (plugin) {
            result.loaded.push(plugin);
            this.logger.info(`✅ Loaded plugin: ${plugin.name}@${plugin.version}`);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          result.failed.push({ path: file, error: err });
          this.logger.error(`❌ Failed to load plugin from ${file}:`, err.message);
        }
      }
    } catch (error) {
      this.logger.error('Plugin loading error:', error);
    }

    return result;
  }

  /**
   * 加载单个插件文件
   */
  private async loadPlugin(
    filePath: string,
    runtime: Runtime
  ): Promise<Plugin | null> {
    // 将路径转换为 file:// URL（Windows 兼容）
    const modulePath = await import('path');
    const resolvedPath = modulePath.resolve(filePath);

    // 使用 fileURLToPath 的反向操作，将绝对路径转为 file:// URL
    const fileUrl = 'file://' + resolvedPath.replace(/\\/g, '/');

    // 动态导入模块
    const module = await import(fileUrl);

    // 获取插件类
    const PluginClass = module.default;

    if (!PluginClass) {
      throw new Error(`Module ${filePath} has no default export`);
    }

    // 实例化插件
    const plugin: Plugin = new PluginClass();

    // 验证插件接口
    this.validatePlugin(plugin, filePath);

    // 初始化插件
    await plugin.init(runtime);

    return plugin;
  }

  /**
   * 验证插件是否实现必要接口
   */
  private validatePlugin(plugin: Plugin, filePath: string): void {
    const required = ['id', 'name', 'version', 'type', 'init', 'start', 'stop'];

    for (const prop of required) {
      if (!(prop in plugin)) {
        throw new Error(
          `Plugin from ${filePath} missing required property: ${prop}`
        );
      }
    }

    // 验证 ID 格式（kebab-case）
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.id)) {
      throw new Error(
        `Plugin ID "${plugin.id}" must be kebab-case (e.g., "my-plugin")`
      );
    }

    // 验证版本格式（semver-like）
    if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
      throw new Error(
        `Plugin version "${plugin.version}" must follow semver (e.g., "1.0.0")`
      );
    }
  }
}

/**
 * 创建插件加载器
 */
export function createLoader(options?: LoaderOptions): PluginLoader {
  return new PluginLoader(options);
}
