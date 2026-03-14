/**
 * HTTP Tool Plugin for OpenClaw
 *
 * 发送 HTTP 请求
 */

import {
  ToolPlugin,
  ToolDefinition,
  ToolResult,
  ToolContext,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';

/**
 * HTTP 工具配置
 */
interface HttpToolConfig {
  /** 超时时间（毫秒） */
  timeout: number;
  /** 最大响应体大小（字节） */
  maxResponseSize: number;
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 允许的 URL 模式 */
  allowedUrls?: string[];
  /** 禁止的 URL 模式 */
  blockedUrls?: string[];
  /** 是否允许发送请求体 */
  allowBody: boolean;
}

/**
 * HTTP 请求工具
 */
export default class HttpToolPlugin implements ToolPlugin {
  readonly id = 'tool-http';
  readonly name = 'HTTP Requests';
  readonly version = '1.0.0';
  readonly type = PluginType.TOOL;
  readonly description = '发送 HTTP GET/POST/PUT/DELETE 请求';

  private runtime?: Runtime;
  private config: HttpToolConfig = {
    timeout: 30000,
    maxResponseSize: 1024 * 1024, // 1MB
    allowBody: true,
  };

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    const config = runtime.getConfig<Partial<HttpToolConfig>>('tools.http') || {};
    this.config = {
      ...this.config,
      ...config,
    };

    runtime.logger.info('HttpToolPlugin initialized');
  }

  async start(): Promise<void> {
    this.runtime?.logger.info('HttpToolPlugin started');
  }

  async stop(): Promise<void> {
    this.runtime?.logger.info('HttpToolPlugin stopped');
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'http_request',
      displayName: 'HTTP 请求',
      description: '发送 HTTP 请求到指定 URL。支持 GET、POST、PUT、DELETE 方法。可用于调用 API、获取网页内容等。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '请求 URL',
          },
          method: {
            type: 'string',
            description: 'HTTP 方法',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
            default: 'GET',
          },
          headers: {
            type: 'object',
            description: '请求头（可选）',
            additionalProperties: { type: 'string' },
          },
          body: {
            type: 'string',
            description: '请求体（POST/PUT 使用，可选）',
          },
          contentType: {
            type: 'string',
            description: '内容类型',
            default: 'application/json',
            enum: ['application/json', 'application/x-www-form-urlencoded', 'text/plain', 'text/html'],
          },
        },
        required: ['url'],
      },
      requireConfirmation: false,
      timeout: this.config.timeout,
    };
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const url = params.url as string;
      const method = (params.method as string) || 'GET';
      const headers = (params.headers as Record<string, string>) || {};
      const body = params.body as string | undefined;
      const contentType = (params.contentType as string) || 'application/json';

      // URL 安全检查
      const urlCheck = this.validateUrl(url);
      if (!urlCheck.valid) {
        return {
          success: false,
          error: urlCheck.error,
        };
      }

      // 构建请求头
      const requestHeaders: Record<string, string> = {
        ...this.config.defaultHeaders,
        ...headers,
      };

      if (body && !requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = contentType;
      }

      this.runtime?.logger.debug(`${method} ${url}`);

      // 发送请求
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body || undefined,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      // 读取响应
      const responseText = await response.text();

      // 检查响应大小
      if (responseText.length > this.config.maxResponseSize) {
        return {
          success: false,
          error: `响应体过大 (${responseText.length} bytes)，最大允许 ${this.config.maxResponseSize} bytes`,
        };
      }

      // 尝试解析 JSON
      let responseData: unknown;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
          size: responseText.length,
          url: response.url,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 验证 URL 安全性
   */
  private validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);

      // 只允许 HTTP 和 HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          error: `不支持的协议: ${parsed.protocol}，仅支持 HTTP 和 HTTPS`,
        };
      }

      // 检查禁止的内部地址
      const hostname = parsed.hostname.toLowerCase();
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '[::1]',
      ];

      if (blockedHosts.includes(hostname)) {
        return {
          valid: false,
          error: '禁止访问内部网络地址',
        };
      }

      // 检查私有 IP
      const privateIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.)/;
      if (privateIpPattern.test(hostname)) {
        return {
          valid: false,
          error: '禁止访问私有网络地址',
        };
      }

      // 检查允许的 URL 列表
      if (this.config.allowedUrls && this.config.allowedUrls.length > 0) {
        const isAllowed = this.config.allowedUrls.some((pattern) =>
          url.includes(pattern)
        );
        if (!isAllowed) {
          return {
            valid: false,
            error: 'URL 不在允许列表中',
          };
        }
      }

      // 检查禁止的 URL 列表
      if (this.config.blockedUrls) {
        const isBlocked = this.config.blockedUrls.some((pattern) =>
          url.includes(pattern)
        );
        if (isBlocked) {
          return {
            valid: false,
            error: 'URL 在禁止列表中',
          };
        }
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: '无效的 URL',
      };
    }
  }
}
