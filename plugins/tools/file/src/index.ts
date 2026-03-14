/**
 * File Tool Plugin for OpenClaw
 *
 * 提供文件操作能力：读取、写入、列出、删除
 */

import {
  ToolPlugin,
  ToolDefinition,
  ToolResult,
  ToolContext,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 文件工具插件配置
 */
interface FileToolConfig {
  /** 允许访问的基础目录 */
  baseDir: string;
  /** 是否允许写入 */
  allowWrite: boolean;
  /** 是否允许删除 */
  allowDelete: boolean;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

/**
 * 文件操作工具插件
 */
export default class FileToolPlugin implements ToolPlugin {
  readonly id = 'tool-file';
  readonly name = 'File Operations';
  readonly version = '1.0.0';
  readonly type = PluginType.TOOL;
  readonly description = '读取、写入、列出和管理文件';

  private runtime?: Runtime;
  private config: FileToolConfig = {
    baseDir: process.cwd(),
    allowWrite: true,
    allowDelete: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  };

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    const config = runtime.getConfig<Partial<FileToolConfig>>('tools.file') || {};
    this.config = {
      ...this.config,
      ...config,
    };

    runtime.logger.info('FileToolPlugin initialized');
  }

  async start(): Promise<void> {
    this.runtime?.logger.info('FileToolPlugin started');
  }

  async stop(): Promise<void> {
    this.runtime?.logger.info('FileToolPlugin stopped');
  }

  /**
   * 获取工具定义（用于 AI function calling）
   */
  getDefinition(): ToolDefinition {
    return {
      name: 'file_operations',
      displayName: '文件操作',
      description: '读取、写入、列出和管理文件。支持的操作：read（读取）、write（写入）、list（列出目录）、delete（删除）、exists（检查存在）',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: '操作类型',
            enum: ['read', 'write', 'list', 'delete', 'exists'],
          },
          path: {
            type: 'string',
            description: '文件或目录路径（相对于 baseDir）',
          },
          content: {
            type: 'string',
            description: '写入的文件内容（write 操作需要）',
          },
          encoding: {
            type: 'string',
            description: '文件编码',
            default: 'utf-8',
            enum: ['utf-8', 'base64', 'latin1'],
          },
          recursive: {
            type: 'boolean',
            description: '是否递归列出子目录（list 操作可选）',
            default: false,
          },
        },
        required: ['operation', 'path'],
      },
      requireConfirmation: true,
      timeout: 30000,
    };
  }

  /**
   * 执行文件操作
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const operation = params.operation as string;
      const filePath = this.sanitizePath(params.path as string);
      const encoding = (params.encoding as BufferEncoding) || 'utf-8';

      this.runtime?.logger.debug(`File ${operation}: ${filePath}`);

      let result: unknown;

      switch (operation) {
        case 'read':
          result = await this.readFile(filePath, encoding);
          break;

        case 'write':
          if (!this.config.allowWrite) {
            return {
              success: false,
              error: '写入操作已被禁用',
            };
          }
          result = await this.writeFile(
            filePath,
            params.content as string,
            encoding
          );
          break;

        case 'list':
          result = await this.listDirectory(filePath, params.recursive as boolean);
          break;

        case 'delete':
          if (!this.config.allowDelete) {
            return {
              success: false,
              error: '删除操作已被禁用',
            };
          }
          result = await this.deleteFile(filePath);
          break;

        case 'exists':
          result = await this.fileExists(filePath);
          break;

        default:
          return {
            success: false,
            error: `未知操作: ${operation}`,
          };
      }

      return {
        success: true,
        data: result,
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
   * 验证参数
   */
  validate(params: Record<string, unknown>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!params.operation) {
      errors.push('缺少 operation 参数');
    } else if (!['read', 'write', 'list', 'delete', 'exists'].includes(params.operation as string)) {
      errors.push(`无效的操作类型: ${params.operation}`);
    }

    if (!params.path) {
      errors.push('缺少 path 参数');
    } else if (typeof params.path !== 'string') {
      errors.push('path 必须是字符串');
    }

    if (params.operation === 'write' && !params.content) {
      errors.push('write 操作需要 content 参数');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 读取文件
   */
  private async readFile(filePath: string, encoding: BufferEncoding): Promise<unknown> {
    const fullPath = path.join(this.config.baseDir, filePath);

    // 检查文件大小
    const stats = await fs.stat(fullPath);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(
        `文件过大 (${stats.size} bytes)，最大允许 ${this.config.maxFileSize} bytes`
      );
    }

    const content = await fs.readFile(fullPath, encoding);

    return {
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime,
    };
  }

  /**
   * 写入文件
   */
  private async writeFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding
  ): Promise<unknown> {
    const fullPath = path.join(this.config.baseDir, filePath);

    // 确保目录存在
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // 解码 base64 内容
    let buffer: Buffer;
    if (encoding === 'base64') {
      buffer = Buffer.from(content, 'base64');
    } else {
      buffer = Buffer.from(content, encoding);
    }

    await fs.writeFile(fullPath, buffer);

    const stats = await fs.stat(fullPath);

    return {
      path: filePath,
      bytesWritten: stats.size,
      modified: stats.mtime,
    };
  }

  /**
   * 列出目录
   */
  private async listDirectory(dirPath: string, recursive: boolean): Promise<unknown> {
    const fullPath = path.join(this.config.baseDir, dirPath);

    if (recursive) {
      const files: Array<{ path: string; isDirectory: boolean; size: number }> = [];

      const walk = async (currentPath: string, relativePath: string) => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(relativePath, entry.name);
          const fullEntryPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            files.push({
              path: entryPath,
              isDirectory: true,
              size: 0,
            });
            await walk(fullEntryPath, entryPath);
          } else {
            const stats = await fs.stat(fullEntryPath);
            files.push({
              path: entryPath,
              isDirectory: false,
              size: stats.size,
            });
          }
        }
      };

      await walk(fullPath, dirPath);

      return {
        path: dirPath,
        files,
        count: files.length,
      };
    } else {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(dirPath, entry.name);
          const fullEntryPath = path.join(fullPath, entry.name);

          let size = 0;
          if (!entry.isDirectory()) {
            const stats = await fs.stat(fullEntryPath);
            size = stats.size;
          }

          return {
            name: entry.name,
            path: entryPath,
            isDirectory: entry.isDirectory(),
            size,
          };
        })
      );

      return {
        path: dirPath,
        files,
        count: files.length,
      };
    }
  }

  /**
   * 删除文件
   */
  private async deleteFile(filePath: string): Promise<unknown> {
    const fullPath = path.join(this.config.baseDir, filePath);

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }

    return {
      path: filePath,
      deleted: true,
    };
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<unknown> {
    const fullPath = path.join(this.config.baseDir, filePath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        path: filePath,
        exists: true,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      };
    } catch {
      return {
        path: filePath,
        exists: false,
      };
    }
  }

  /**
   * 清理路径，防止目录遍历攻击
   */
  private sanitizePath(inputPath: string): string {
    // 规范化路径
    const normalized = path.normalize(inputPath);

    // 禁止以 .. 开头的路径
    if (normalized.startsWith('..') || normalized.startsWith('/..')) {
      throw new Error('非法路径：禁止访问父目录');
    }

    // 禁止绝对路径
    if (path.isAbsolute(normalized)) {
      throw new Error('非法路径：禁止使用绝对路径');
    }

    return normalized;
  }
}
