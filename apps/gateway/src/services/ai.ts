/**
 * AI 服务模块
 *
 * 支持多模型提供商：OpenAI、Anthropic、DashScope、DeepSeek、Moonshot
 * 统一接口，兼容 OpenAI API 格式
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIService');

// 系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是 OpenClaw，一个智能 AI 助手。你可以：
1. 回答用户的问题
2. 帮助用户完成各种任务
3. 进行友好的对话

请用中文回复用户。`;

/**
 * 模型提供商配置
 */
export interface ModelProvider {
  id: string;
  name: string;
  models: ModelConfig[];
  client?: OpenAI | Anthropic;
  isAnthropic?: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  defaultTemperature: number;
}

/**
 * 消息类型
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 聊天完成选项
 */
export interface ChatCompletionOptions {
  model?: string;
  provider?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * 聊天完成结果
 */
export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * 流式聊天完成回调
 */
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (result: ChatCompletionResult) => void;
  onError: (error: Error) => void;
}

// 模型提供商配置映射
const modelProviders: Map<string, ModelProvider> = new Map();

/**
 * 初始化 AI 客户端
 */
export function initAIClients(): void {
  logger.info('初始化 AI 客户端...');

  // 1. OpenAI
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    modelProviders.set('openai', {
      id: 'openai',
      name: 'OpenAI',
      client,
      models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速、经济的模型', maxTokens: 4096, defaultTemperature: 0.7 },
        { id: 'gpt-4', name: 'GPT-4', description: '强大的模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '最新的 GPT-4', maxTokens: 128000, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ OpenAI 客户端已初始化');
  }

  // 2. Anthropic (Claude) - 使用代理
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    });
    modelProviders.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      client,
      isAnthropic: true,
      models: [
        { id: 'claude-4-6-opus-20251101', name: 'Claude 4.6 Opus', description: 'Claude 4 系列最新最强大的模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'claude-4-5-opus-20251001', name: 'Claude 4.5 Opus', description: 'Claude 4.5 系列最强模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'claude-4-5-sonnet-20251001', name: 'Claude 4.5 Sonnet', description: '下一代智能与效率的结合', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '平衡性能和速度', maxTokens: 4096, defaultTemperature: 0.7 },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最强大的 Claude 3', maxTokens: 4096, defaultTemperature: 0.7 },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '最快的 Claude', maxTokens: 4096, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ Anthropic (Claude) 客户端已初始化');
  }

  // 3. DashScope (阿里云百炼 - Qwen)
  if (process.env.DASHSCOPE_API_KEY) {
    const client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    modelProviders.set('dashscope', {
      id: 'dashscope',
      name: '阿里云百炼 (Qwen)',
      client,
      models: [
        { id: 'qwen-turbo', name: '通义千问 Turbo', description: '快速响应', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'qwen-plus', name: '通义千问 Plus', description: '平衡的模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'qwen3.5-plus', name: '通义千问 3.5 Plus', description: '通义千问 3.5 增强版', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'qwen-max', name: '通义千问 Max', description: '最强的通义模型', maxTokens: 8192, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ 阿里云百炼 (DashScope) 客户端已初始化');
  }

  // 4. DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
    modelProviders.set('deepseek', {
      id: 'deepseek',
      name: 'DeepSeek',
      client,
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话', maxTokens: 4096, defaultTemperature: 0.7 },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码专用', maxTokens: 4096, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ DeepSeek 客户端已初始化');
  }

  // 5. Moonshot (Kimi)
  if (process.env.MOONSHOT_API_KEY) {
    const client = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1',
    });
    modelProviders.set('moonshot', {
      id: 'moonshot',
      name: 'Moonshot (Kimi)',
      client,
      models: [
        { id: 'kimi-k2-5', name: 'Kimi K2-2.5', description: 'Moonshot 最新旗舰模型', maxTokens: 256000, defaultTemperature: 0.7 },
        { id: 'moonshot-v1-8k', name: 'Kimi 8K', description: '8K 上下文', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'moonshot-v1-32k', name: 'Kimi 32K', description: '32K 上下文', maxTokens: 32000, defaultTemperature: 0.7 },
        { id: 'moonshot-v1-128k', name: 'Kimi 128K', description: '128K 上下文', maxTokens: 128000, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ Moonshot (Kimi) 客户端已初始化');
  }

  // 6. Zhipu AI (智谱 AI - GLM)
  if (process.env.ZHIPU_API_KEY) {
    const client = new OpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    });
    modelProviders.set('zhipu', {
      id: 'zhipu',
      name: '智谱 AI (GLM)',
      client,
      models: [
        { id: 'glm-5', name: 'GLM 5', description: '智谱最新旗舰模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'glm-4-plus', name: 'GLM-4 Plus', description: 'GLM-4 增强版', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'glm-4', name: 'GLM-4', description: '强大的多模态模型', maxTokens: 8192, defaultTemperature: 0.7 },
        { id: 'glm-4-flash', name: 'GLM-4 Flash', description: '快速响应模型', maxTokens: 8192, defaultTemperature: 0.7 },
      ],
    });
    logger.info('✅ 智谱 AI (Zhipu) 客户端已初始化');
  }

  logger.info(`总共初始化了 ${modelProviders.size} 个 AI 提供商`);
}

/**
 * 检查是否有 AI 配置
 */
export function isAIConfigured(): boolean {
  return modelProviders.size > 0;
}

/**
 * 获取默认模型（优先使用国产模型）
 */
export function getDefaultModel(): { provider: string; model: string } {
  // 优先级：DeepSeek > DashScope > Moonshot > Zhipu > Anthropic > OpenAI
  const priority = ['deepseek', 'dashscope', 'moonshot', 'zhipu', 'anthropic', 'openai'];

  for (const providerId of priority) {
    const provider = modelProviders.get(providerId);
    if (provider && provider.models.length > 0) {
      return { provider: providerId, model: provider.models[0].id };
    }
  }

  throw new Error('没有可用的 AI 模型');
}

/**
 * 解析模型选择
 * 支持格式："provider:model" 或 "model"
 */
function parseModelSelection(modelInput?: string): { provider: string; model: string } {
  if (!modelInput) {
    return getDefaultModel();
  }

  // 格式: "provider:model"
  if (modelInput.includes(':')) {
    const [provider, model] = modelInput.split(':');
    return { provider, model };
  }

  // 只有 model，查找对应的 provider
  for (const [providerId, provider] of modelProviders) {
    if (provider.models.some(m => m.id === modelInput)) {
      return { provider: providerId, model: modelInput };
    }
  }

  // 未找到，使用默认
  logger.warn(`未找到模型 ${modelInput}，使用默认模型`);
  return getDefaultModel();
}

/**
 * 非流式聊天完成
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  try {
    if (!isAIConfigured()) {
      throw new Error('没有配置任何 AI 模型');
    }

    const { provider: providerId, model } = parseModelSelection(options.model);
    const provider = modelProviders.get(providerId);

    if (!provider) {
      throw new Error(`未知的模型提供商: ${providerId}`);
    }

    const messages = [...options.messages];

    // 如果没有系统消息，添加默认系统提示
    if (!messages.some(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
      });
    }

    logger.info(`调用 AI: ${provider.name} / ${model}`);

    // Anthropic 特殊处理
    if (provider.isAnthropic && provider.client instanceof Anthropic) {
      return await callAnthropic(provider.client, model, messages, options);
    }

    // OpenAI 兼容格式
    const client = provider.client as OpenAI;
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    });

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('AI 返回空响应');
    }

    const result: ChatCompletionResult = {
      content: choice.message.content || '',
      model: response.model,
      provider: providerId,
      tokens: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
    };

    logger.info(`AI 响应完成，使用 token: ${result.tokens.total}`);
    return result;

  } catch (error) {
    logger.error('AI 调用失败:', error);
    // 打印更详细的错误信息
    if (error instanceof Error) {
      logger.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    throw error;
  }
}

/**
 * 调用 Anthropic API
 */
async function callAnthropic(
  client: Anthropic,
  model: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  // 转换消息格式
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    system: systemMessage,
    messages: conversationMessages,
  });

  const content = response.content
    .filter(c => c.type === 'text')
    .map(c => (c as Anthropic.TextBlock).text)
    .join('');

  return {
    content,
    model: response.model,
    provider: 'anthropic',
    tokens: {
      prompt: response.usage?.input_tokens || 0,
      completion: response.usage?.output_tokens || 0,
      total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    },
  };
}

/**
 * 流式聊天完成
 */
export async function chatCompletionStream(
  options: ChatCompletionOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    if (!isAIConfigured()) {
      throw new Error('没有配置任何 AI 模型');
    }

    const { provider: providerId, model } = parseModelSelection(options.model);
    const provider = modelProviders.get(providerId);

    if (!provider) {
      throw new Error(`未知的模型提供商: ${providerId}`);
    }

    const messages = [...options.messages];

    // 如果没有系统消息，添加默认系统提示
    if (!messages.some(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
      });
    }

    logger.info(`开始流式调用 AI: ${provider.name} / ${model}`);

    // Anthropic 流式处理
    if (provider.isAnthropic && provider.client instanceof Anthropic) {
      await callAnthropicStream(provider.client, model, messages, options, callbacks, providerId);
      return;
    }

    // OpenAI 兼容流式处理
    const client = provider.client as OpenAI;
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      stream: true,
    });

    let fullContent = '';
    let responseModel = model;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        callbacks.onChunk(delta);
      }
      if (chunk.model) {
        responseModel = chunk.model;
      }
    }

    // 估算 token
    const estimatedTokens = {
      prompt: estimateTokens(messages.map(m => m.content).join('')),
      completion: estimateTokens(fullContent),
      total: 0,
    };
    estimatedTokens.total = estimatedTokens.prompt + estimatedTokens.completion;

    const result: ChatCompletionResult = {
      content: fullContent,
      model: responseModel,
      provider: providerId,
      tokens: estimatedTokens,
    };

    logger.info(`流式 AI 响应完成，估算 token: ${result.tokens.total}`);
    callbacks.onComplete(result);

  } catch (error) {
    logger.error('流式 AI 调用失败:', error);
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Anthropic 流式调用
 */
async function callAnthropicStream(
  client: Anthropic,
  model: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  callbacks: StreamCallbacks,
  providerId: string
): Promise<void> {
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const stream = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    system: systemMessage,
    messages: conversationMessages,
    stream: true,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      const text = chunk.delta.text;
      fullContent += text;
      callbacks.onChunk(text);
    }
  }

  const result: ChatCompletionResult = {
    content: fullContent,
    model,
    provider: providerId,
    tokens: {
      prompt: estimateTokens(messages.map(m => m.content).join('')),
      completion: estimateTokens(fullContent),
      total: 0,
    },
  };
  result.tokens.total = result.tokens.prompt + result.tokens.completion;

  callbacks.onComplete(result);
}

/**
 * 估算 token 数量
 */
function estimateTokens(text: string): number {
  // 中文字符按 1.5 token，英文按 0.25 token 估算
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
}

/**
 * 获取可用模型列表
 */
export function getAvailableModels(): { id: string; name: string; provider: string; description: string }[] {
  const models: { id: string; name: string; provider: string; description: string }[] = [];

  for (const [providerId, provider] of modelProviders) {
    for (const model of provider.models) {
      models.push({
        id: `${providerId}:${model.id}`,
        name: `${provider.name} - ${model.name}`,
        provider: providerId,
        description: model.description,
      });
    }
  }

  return models;
}

/**
 * 获取 AI 服务状态
 */
export function getAIStatus(): { available: boolean; providers: string[]; modelCount: number } {
  const providers = Array.from(modelProviders.keys());
  let modelCount = 0;

  for (const provider of modelProviders.values()) {
    modelCount += provider.models.length;
  }

  return {
    available: providers.length > 0,
    providers,
    modelCount,
  };
}
