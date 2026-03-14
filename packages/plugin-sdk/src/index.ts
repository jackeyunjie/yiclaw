/**
 * OpenClaw Plugin SDK
 *
 * 用于开发 OpenClaw 插件的官方 SDK
 *
 * @example
 * ```typescript
 * import { Plugin, PluginType, Runtime } from '@openclaw/plugin-sdk';
 *
 * export default class MyPlugin implements Plugin {
 *   readonly id = 'my-plugin';
 *   readonly name = 'My Plugin';
 *   readonly version = '1.0.0';
 *   readonly type = PluginType.TOOL;
 *
 *   init(runtime: Runtime) {
 *     runtime.logger.info('My plugin initialized');
 *   }
 *
 *   async start() {
 *     // 启动逻辑
 *   }
 *
 *   async stop() {
 *     // 清理逻辑
 *   }
 * }
 * ```
 */

export * from './types/index.js';
export * from './runtime.js';
export * from './loader.js';
