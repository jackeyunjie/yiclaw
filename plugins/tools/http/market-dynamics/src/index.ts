/**
 * 行业动态数据抓取插件 - 主入口
 *
 * 提供宏观与行业动态数据的 HTTP 抓取能力
 */

import { Plugin, PluginType, Tool, Runtime } from '@openclaw/plugin-sdk';
import { fetchIndustryDynamics, fetchMultipleIndustries } from './actions';
import { MarketNewsParams } from './types';

/**
 * 获取行业动态工具
 *
 * 用于获取特定市场、行业或企业的最新动态、新闻和基本面事件
 */
const getIndustryDynamicsTool: Tool = {
  name: 'get_industry_dynamics',
  description: `获取特定市场、行业或企业的最新动态、新闻和基本面事件。

适用场景：
- 行业分析和宏观数据收集
- 投资研究和估值分析
- 市场情绪监测
- 竞争情报收集

示例：
- query: "新能源" → 获取新能源行业最新动态
- query: "半导体" → 获取半导体行业新闻
- query: "人工智能" → 获取 AI 行业资讯`,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '需要查询的行业或企业名称，如 "智能驾驶"、"固态电池"、"宁德时代"',
      },
      days: {
        type: 'number',
        description: '查询过去几天的信息，默认 3 天，最大 30 天',
        minimum: 1,
        maximum: 30,
        default: 3,
      },
      limit: {
        type: 'number',
        description: '返回的新闻条数限制，默认 5 条，最大 20 条',
        minimum: 1,
        maximum: 20,
        default: 5,
      },
    },
    required: ['query'],
  },

  /**
   * 工具执行逻辑
   */
  execute: async (args: MarketNewsParams, context: { runtime: Runtime }) => {
    try {
      const result = await fetchIndustryDynamics(args);
      return {
        success: true,
        data: result,
        summary: `成功获取 ${args.query} 的行业动态，共 ${result.statistics.total} 条新闻（正面: ${result.statistics.positive}, 负面: ${result.statistics.negative}, 中性: ${result.statistics.neutral}）`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取数据失败',
        data: null,
      };
    }
  },
};

/**
 * 批量获取行业动态工具
 *
 * 用于同时获取多个行业的动态数据
 */
const getMultipleIndustriesTool: Tool = {
  name: 'get_multiple_industries_dynamics',
  description: `批量获取多个行业的动态数据，用于行业对比分析。

适用场景：
- 行业轮动分析
- 投资组合监控
- 宏观经济研究

示例：
- queries: ["新能源", "半导体", "医药"] → 对比三个行业的热度`,
  parameters: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: '需要查询的多个行业或企业名称列表',
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ['queries'],
  },

  /**
   * 工具执行逻辑
   */
  execute: async (args: { queries: string[] }, context: { runtime: Runtime }) => {
    try {
      const results = await fetchMultipleIndustries(args.queries);
      const summary = results.map(r =>
        `${r.query}: ${r.statistics.total}条(正${r.statistics.positive}/负${r.statistics.negative})`
      ).join(', ');

      return {
        success: true,
        data: results,
        summary: `批量获取完成: ${summary}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量获取数据失败',
        data: null,
      };
    }
  },
};

/**
 * 行业动态数据抓取插件
 */
const marketDynamicsPlugin: Plugin = {
  id: 'market-dynamics',
  name: '行业动态数据抓取插件',
  version: '1.0.0',
  description: '提供宏观与行业动态数据的 HTTP 抓取能力，支持新闻获取、情感分析和多行业对比',
  type: PluginType.TOOL,

  /**
   * 插件提供的工具列表
   */
  tools: [getIndustryDynamicsTool, getMultipleIndustriesTool],

  /**
   * 插件初始化钩子
   */
  onInit: async (runtime: Runtime) => {
    const logger = runtime.logger;
    logger.info('[Plugin:market-dynamics] 行业动态数据抓取插件初始化成功');
    logger.debug('[Plugin:market-dynamics] 可用工具:', ['get_industry_dynamics', 'get_multiple_industries_dynamics']);

    // 可以在这里进行配置检查
    const apiKey = runtime.getConfig<string>('MARKET_API_KEY');
    if (!apiKey) {
      logger.warn('[Plugin:market-dynamics] 未配置 MARKET_API_KEY，将使用模拟数据模式');
    }
  },

  /**
   * 插件卸载钩子
   */
  onDestroy: async (runtime: Runtime) => {
    runtime.logger.info('[Plugin:market-dynamics] 插件已卸载');
  },
};

export default marketDynamicsPlugin;
