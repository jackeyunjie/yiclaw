/**
 * 工具执行模块
 *
 * 提供各种工具的执行能力
 */

import { createLogger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('ToolExecutor');

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}

/**
 * 文件读取工具
 */
const fileReadTool: Tool = {
  name: 'file_read',
  description: '读取文件内容',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      encoding: { type: 'string', description: '编码格式，默认 utf-8' }
    },
    required: ['path']
  },
  async execute(params) {
    const startTime = Date.now();
    try {
      const filePath = String(params.path);
      const encoding = String(params.encoding || 'utf-8') as BufferEncoding;
      const content = await fs.readFile(filePath, encoding);
      return {
        success: true,
        data: { content, path: filePath },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: `读取文件失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 文件写入工具
 */
const fileWriteTool: Tool = {
  name: 'file_write',
  description: '写入文件内容',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      content: { type: 'string', description: '文件内容' },
      append: { type: 'boolean', description: '是否追加模式' }
    },
    required: ['path', 'content']
  },
  async execute(params) {
    const startTime = Date.now();
    try {
      const filePath = String(params.path);
      const content = String(params.content);
      const append = Boolean(params.append);

      // 确保目录存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      if (append) {
        await fs.appendFile(filePath, content, 'utf-8');
      } else {
        await fs.writeFile(filePath, content, 'utf-8');
      }

      return {
        success: true,
        data: { path: filePath, bytesWritten: content.length },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: `写入文件失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 文件列表工具
 */
const fileListTool: Tool = {
  name: 'file_list',
  description: '列出目录文件',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '目录路径' },
      recursive: { type: 'boolean', description: '是否递归' }
    },
    required: ['path']
  },
  async execute(params) {
    const startTime = Date.now();
    try {
      const dirPath = String(params.path);
      const recursive = Boolean(params.recursive);

      const files: string[] = [];

      async function listDir(currentPath: string, prefix: string = '') {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const displayPath = prefix ? `${prefix}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            files.push(`${displayPath}/`);
            if (recursive) {
              await listDir(fullPath, displayPath);
            }
          } else {
            files.push(displayPath);
          }
        }
      }

      await listDir(dirPath);

      return {
        success: true,
        data: { path: dirPath, files },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: `列出文件失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * Shell 命令工具
 */
const shellCommandTool: Tool = {
  name: 'shell_command',
  description: '执行 shell 命令',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '命令' },
      cwd: { type: 'string', description: '工作目录' },
      timeout: { type: 'number', description: '超时时间（毫秒）' }
    },
    required: ['command']
  },
  async execute(params) {
    const startTime = Date.now();
    try {
      const command = String(params.command);
      const cwd = params.cwd ? String(params.cwd) : process.cwd();
      const timeout = Number(params.timeout || 60000);

      logger.info(`执行命令: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        encoding: 'utf-8'
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: `命令执行失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 等待工具
 */
const waitTool: Tool = {
  name: 'wait',
  description: '等待一段时间',
  parameters: {
    type: 'object',
    properties: {
      milliseconds: { type: 'number', description: '等待毫秒数' }
    },
    required: ['milliseconds']
  },
  async execute(params) {
    const startTime = Date.now();
    const ms = Number(params.milliseconds);

    await new Promise(resolve => setTimeout(resolve, ms));

    return {
      success: true,
      data: { waited: ms },
      executionTime: Date.now() - startTime
    };
  }
};

/**
 * HTTP 请求工具
 */
const httpRequestTool: Tool = {
  name: 'http_request',
  description: '发送 HTTP 请求',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: '请求 URL' },
      method: { type: 'string', description: '请求方法 (GET/POST/PUT/DELETE)' },
      headers: { type: 'object', description: '请求头' },
      body: { type: 'string', description: '请求体' }
    },
    required: ['url']
  },
  async execute(params) {
    const startTime = Date.now();
    try {
      const url = String(params.url);
      const method = String(params.method || 'GET').toUpperCase();
      const headers = params.headers as Record<string, string> || {};
      const body = params.body ? String(params.body) : undefined;

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      const responseBody = await response.text();

      return {
        success: response.ok,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: (() => {
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              headers[key] = value;
            });
            return headers;
          })(),
          body: responseBody
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: `HTTP 请求失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 工具注册表
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // 注册默认工具
    this.register(fileReadTool);
    this.register(fileWriteTool);
    this.register(fileListTool);
    this.register(shellCommandTool);
    this.register(waitTool);
    this.register(httpRequestTool);

    // 注册消息通知工具
    this.registerMessagingTools();

    // 注册数据库工具
    this.registerDatabaseTools();

    // 注册文件处理工具
    this.registerFileProcessorTools();

    // 注册浏览器自动化工具
    this.registerBrowserTools();
  }

  /**
   * 注册消息通知工具
   */
  private registerMessagingTools(): void {
    import('./tools/messaging.js').then(({ sendMessageTool, broadcastMessageTool, sendTaskNotificationTool }) => {
      this.register(sendMessageTool);
      this.register(broadcastMessageTool);
      this.register(sendTaskNotificationTool);
    }).catch(error => {
      logger.error('注册消息工具失败', error);
    });
  }

  /**
   * 注册数据库工具
   */
  private registerDatabaseTools(): void {
    import('./tools/database.js').then(({ sqlQueryTool, getTableSchemaTool, exportDataTool, generateReportTool, dbHealthCheckTool }) => {
      this.register(sqlQueryTool);
      this.register(getTableSchemaTool);
      this.register(exportDataTool);
      this.register(generateReportTool);
      this.register(dbHealthCheckTool);
    }).catch(error => {
      logger.error('注册数据库工具失败', error);
    });
  }

  /**
   * 注册文件处理工具
   */
  private registerFileProcessorTools(): void {
    import('./tools/file-processor.js').then(({ parseExcelTool, generateExcelTool, parsePdfTool, parseWordTool, getFileInfoTool, csvToJsonTool }) => {
      this.register(parseExcelTool);
      this.register(generateExcelTool);
      this.register(parsePdfTool);
      this.register(parseWordTool);
      this.register(getFileInfoTool);
      this.register(csvToJsonTool);
    }).catch(error => {
      logger.error('注册文件处理工具失败', error);
    });
  }

  /**
   * 注册浏览器自动化工具
   */
  private registerBrowserTools(): void {
    import('./tools/browser.js').then(({ browserNavigateTool, browserScreenshotTool, browserClickTool, browserFillTool, browserEvaluateTool, browserGetContentTool, browserWaitTool, browserCloseTool }) => {
      this.register(browserNavigateTool);
      this.register(browserScreenshotTool);
      this.register(browserClickTool);
      this.register(browserFillTool);
      this.register(browserEvaluateTool);
      this.register(browserGetContentTool);
      this.register(browserWaitTool);
      this.register(browserCloseTool);
    }).catch(error => {
      logger.error('注册浏览器工具失败', error);
    });
  }

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    logger.info(`工具已注册: ${tool.name}`);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    const tools: Tool[] = [];
    this.tools.forEach((tool) => {
      tools.push(tool);
    });
    return tools;
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取工具列表（用于 AI 提示）
   */
  getToolDescriptions(): string {
    return this.getAll()
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }
}

export const toolRegistry = new ToolRegistry();

/**
 * 执行工具
 */
export async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<ToolResult> {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    return {
      success: false,
      error: `未知工具: ${toolName}`
    };
  }

  logger.info(`执行工具: ${toolName}`, parameters);

  try {
    const result = await tool.execute(parameters);
    logger.info(`工具执行完成: ${toolName}, 成功: ${result.success}`);
    return result;
  } catch (error) {
    logger.error(`工具执行异常: ${toolName}`, error);
    return {
      success: false,
      error: `执行异常: ${(error as Error).message}`
    };
  }
}
