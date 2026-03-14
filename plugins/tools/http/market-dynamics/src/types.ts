/**
 * 行业动态数据抓取插件 - 类型定义
 *
 * 定义外部 API 返回的数据结构和插件内部使用的类型
 */

/**
 * 市场新闻查询参数
 */
export interface MarketNewsParams {
  /** 行业或市场关键词，例如 "AI芯片" */
  query: string;
  /** 获取过去几天的动态，默认 3 天 */
  days?: number;
  /** 返回的新闻/数据条数限制，默认 5 条 */
  limit?: number;
}

/**
 * 市场新闻结果项
 */
export interface MarketNewsResult {
  /** 新闻标题 */
  title: string;
  /** 新闻来源 */
  source: string;
  /** 发布日期 */
  publishDate: string;
  /** 内容摘要 */
  summary: string;
  /** 情感得分（如果 API 提供） */
  sentimentScore?: number;
  /** 相关股票代码（可选） */
  relatedStocks?: string[];
  /** 新闻 URL（可选） */
  url?: string;
}

/**
 * 行业动态聚合结果
 */
export interface IndustryDynamicsResult {
  /** 查询关键词 */
  query: string;
  /** 查询时间 */
  queryTime: string;
  /** 新闻列表 */
  news: MarketNewsResult[];
  /** 统计信息 */
  statistics: {
    /** 总条数 */
    total: number;
    /** 正面新闻数 */
    positive: number;
    /** 负面新闻数 */
    negative: number;
    /** 中性新闻数 */
    neutral: number;
  };
}

/**
 * 外部 API 配置
 */
export interface ApiConfig {
  /** API 基础 URL */
  baseUrl: string;
  /** API 密钥 */
  apiKey?: string;
  /** 请求超时（毫秒） */
  timeout?: number;
}
