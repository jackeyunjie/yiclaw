/**
 * 模型路由器 - 三级配置策略实现
 *
 * 配置优先级：节点 > 板块 > 全局
 */

import type { ModelRouterConfig, RouteResult, ProviderConfig } from '../types';

// 提供商配置存储
const providerConfigs = new Map<string, ProviderConfig>();

// 路由器配置
let routerConfig: ModelRouterConfig = {};

/**
 * 初始化模型路由器
 * @param config 路由器配置
 */
export function initModelRouter(config: ModelRouterConfig): void {
  routerConfig = config;
}

/**
 * 注册提供商配置
 * @param provider 提供商名称
 * @param config 提供商配置
 */
export function registerProvider(provider: string, config: ProviderConfig): void {
  providerConfigs.set(provider, config);
}

/**
 * 根据上下文路由到合适的模型
 * @param section 板块名称（可选）
 * @param node 节点名称（可选）
 * @returns 路由结果
 */
export function routeModel(section?: string, node?: string): RouteResult {
  // 优先级：节点 > 板块 > 全局
  let provider: string | undefined;
  let model: string | undefined;

  // 检查节点级配置
  if (node && routerConfig.nodes?.[node]) {
    provider = routerConfig.nodes[node].provider;
    model = routerConfig.nodes[node].model;
  }
  // 检查板块级配置
  else if (section && routerConfig.sections?.[section]) {
    provider = routerConfig.sections[section].provider;
    model = routerConfig.sections[section].model;
  }
  // 使用全局配置
  else if (routerConfig.global) {
    provider = routerConfig.global.provider;
    model = routerConfig.global.model;
  }

  if (!provider || !model) {
    throw new Error('未找到可用的模型配置');
  }

  const config = providerConfigs.get(provider);
  if (!config) {
    throw new Error(`未找到提供商配置: ${provider}`);
  }

  return { provider, model, config };
}

/**
 * 获取当前配置
 */
export function getRouterConfig(): ModelRouterConfig {
  return { ...routerConfig };
}

/**
 * 更新配置
 * @param config 新的配置
 */
export function updateRouterConfig(config: Partial<ModelRouterConfig>): void {
  routerConfig = { ...routerConfig, ...config };
}

/**
 * 清除所有配置
 */
export function clearRouterConfig(): void {
  routerConfig = {};
  providerConfigs.clear();
}
