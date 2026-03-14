/**
 * 行业动态数据抓取插件 - 动作逻辑
 *
 * 具体的 HTTP 请求和数据处理逻辑
 */

import { MarketNewsParams, MarketNewsResult, IndustryDynamicsResult, ApiConfig } from './types';

/**
 * 默认 API 配置
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: process.env.MARKET_API_URL || 'https://api.example-finance.com/v1',
  apiKey: process.env.MARKET_API_KEY,
  timeout: 10000,
};

/**
 * 获取行业动态数据
 *
 * @param params - 查询参数
 * @param config - API 配置（可选）
 * @returns 行业动态结果
 */
export async function fetchIndustryDynamics(
  params: MarketNewsParams,
  config: ApiConfig = DEFAULT_CONFIG
): Promise<IndustryDynamicsResult> {
  const { query, days = 3, limit = 5 } = params;

  console.log(`[Market Plugin] Fetching data for: ${query}...`);

  try {
    // 构建请求 URL
    const apiUrl = new URL(`${config.baseUrl}/news`);
    apiUrl.searchParams.append('q', query);
    apiUrl.searchParams.append('days', days.toString());
    apiUrl.searchParams.append('limit', limit.toString());

    // 实际 HTTP 请求（当前使用模拟数据，生产环境取消注释）
    // const response = await fetch(apiUrl.toString(), {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
    //   },
    //   signal: AbortSignal.timeout(config.timeout || 10000),
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    // }
    //
    // const data = await response.json();
    // return transformApiResponse(data, query);

    // 模拟 API 返回的清洗后的结构化数据
    await simulateNetworkDelay(500);
    const mockData = generateMockData(query, days, limit);
    return transformApiResponse(mockData, query);

  } catch (error) {
    console.error(`[Market Plugin] Error fetching dynamic data:`, error);
    throw new Error(`无法获取 ${query} 的行业动态数据: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 模拟网络延迟
 */
function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成模拟数据
 */
function generateMockData(query: string, days: number, limit: number): any[] {
  const templates = [
    {
      title: `${query} 行业最新政策发布，促进行业规范化发展`,
      source: "宏观经济观察",
      summary: `相关部门出台了关于 ${query} 的最新指导意见，预计将对头部企业的市占率产生积极影响。`,
      sentimentScore: 0.8,
      relatedStocks: ["600519", "000001"],
    },
    {
      title: `某头部企业在 ${query} 领域取得关键技术突破`,
      source: "科技与资本",
      summary: `该突破有望大幅降低 ${query} 的生产成本，引发产业链上下游的重估。`,
      sentimentScore: 0.9,
      relatedStocks: ["000858"],
    },
    {
      title: `${query} 行业竞争加剧，中小企业面临生存压力`,
      source: "产业观察家",
      summary: `随着行业龙头持续扩产，${query} 领域的中小企业利润率受到挤压。`,
      sentimentScore: -0.3,
      relatedStocks: ["600000"],
    },
    {
      title: `国际市场对 ${query} 需求持续增长`,
      source: "全球财经",
      summary: `海外订单量环比上升 15%，${query} 出口企业迎来利好。`,
      sentimentScore: 0.7,
      relatedStocks: ["601318"],
    },
    {
      title: `${query} 行业迎来新一轮融资热潮`,
      source: "创投日报",
      summary: `本月已有 3 家 ${query} 相关企业完成亿元级融资，资本关注度提升。`,
      sentimentScore: 0.6,
      relatedStocks: ["000002", "600036"],
    },
  ];

  return templates.slice(0, limit).map((item, index) => ({
    ...item,
    publishDate: new Date(Date.now() - index * 86400000).toISOString(),
  }));
}

/**
 * 转换 API 响应为统一格式
 */
function transformApiResponse(data: any[], query: string): IndustryDynamicsResult {
  const news: MarketNewsResult[] = data.map(item => ({
    title: item.title,
    source: item.source,
    publishDate: item.publishDate,
    summary: item.summary,
    sentimentScore: item.sentimentScore,
    relatedStocks: item.relatedStocks,
    url: item.url,
  }));

  // 计算统计数据
  const sentimentScores = news.map(n => n.sentimentScore || 0);
  const positive = sentimentScores.filter(s => s > 0.3).length;
  const negative = sentimentScores.filter(s => s < -0.3).length;
  const neutral = sentimentScores.length - positive - negative;

  return {
    query,
    queryTime: new Date().toISOString(),
    news,
    statistics: {
      total: news.length,
      positive,
      negative,
      neutral,
    },
  };
}

/**
 * 批量获取多个行业的动态
 *
 * @param queries - 多个查询关键词
 * @param config - API 配置
 * @returns 多个行业的动态结果
 */
export async function fetchMultipleIndustries(
  queries: string[],
  config: ApiConfig = DEFAULT_CONFIG
): Promise<IndustryDynamicsResult[]> {
  const promises = queries.map(query =>
    fetchIndustryDynamics({ query, days: 7, limit: 3 }, config)
  );

  return Promise.all(promises);
}
