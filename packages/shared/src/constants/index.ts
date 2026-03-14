/**
 * 共享常量定义
 */

// 应用配置常量
export const APP_CONFIG = {
  NAME: 'OpenClaw',
  VERSION: '1.0.0',
  DESCRIPTION: '个人 AI 助手 - 多通道智能对话系统',
} as const;

// 默认模型参数
export const DEFAULT_MODEL_PARAMETERS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  TOP_P: 1,
  FREQUENCY_PENALTY: 0,
  PRESENCE_PENALTY: 0,
} as const;

// 分页默认值
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// JWT 配置
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '2h',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256',
} as const;

// 加密配置
export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  IV_LENGTH: 16,
  KEY_LENGTH: 32,
} as const;

// 速率限制配置
export const RATE_LIMIT = {
  GENERAL_WINDOW_MS: 60 * 1000, // 1 分钟
  GENERAL_MAX_REQUESTS: 100,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 分钟
  LOGIN_MAX_ATTEMPTS: 5,
} as const;

// 消息限制
export const MESSAGE_LIMITS = {
  MAX_CONTENT_LENGTH: 4000,
  MAX_MESSAGES_PER_SECOND: 10,
  MAX_WEBSOCKET_CONNECTIONS_PER_USER: 5,
} as const;

// 工具超时时间（毫秒）
export const TOOL_TIMEOUT = 30 * 1000; // 30 秒

// 通道配置
export const CHANNEL_CONFIG = {
  WEB: {
    NAME: 'WebChat',
    DESCRIPTION: 'Web 聊天界面',
  },
  WECHAT: {
    NAME: '微信',
    DESCRIPTION: '微信个人号',
  },
  WECHAT_WORK: {
    NAME: '企业微信',
    DESCRIPTION: '企业微信',
  },
  TELEGRAM: {
    NAME: 'Telegram',
    DESCRIPTION: 'Telegram Bot',
  },
  FEISHU: {
    NAME: '飞书',
    DESCRIPTION: '飞书机器人',
  },
  DINGTALK: {
    NAME: '钉钉',
    DESCRIPTION: '钉钉机器人（预留）',
  },
} as const;

// 模型提供商配置
export const MODEL_PROVIDER_CONFIG = {
  OPENAI: {
    NAME: 'OpenAI',
    DEFAULT_BASE_URL: 'https://api.openai.com/v1',
    MODELS: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  ANTHROPIC: {
    NAME: 'Anthropic',
    DEFAULT_BASE_URL: 'https://api.anthropic.com',
    MODELS: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  },
  QWEN: {
    NAME: '通义千问',
    DEFAULT_BASE_URL: 'https://dashscope.aliyuncs.com/api/v1',
    MODELS: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  BAICHUAN: {
    NAME: '文心一言',
    DEFAULT_BASE_URL: 'https://aip.baidubce.com',
    MODELS: ['ernie-bot', 'ernie-bot-turbo'],
  },
  OLLAMA: {
    NAME: 'Ollama',
    DEFAULT_BASE_URL: 'http://localhost:11434',
    MODELS: [], // 动态获取
  },
} as const;
