/**
 * Shell Tool Plugin for OpenClaw
 *
 * 执行安全的系统命令
 */

import {
  ToolPlugin,
  ToolDefinition,
  ToolResult,
  ToolContext,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

/**
 * Shell 工具配置
 */
interface ShellToolConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 允许执行的命令白名单 */
  allowedCommands: string[];
  /** 禁止执行的命令黑名单 */
  blockedCommands: string[];
  /** 最大输出长度 */
  maxOutputLength: number;
  /** 工作目录 */
  workingDirectory?: string;
}

/**
 * Shell 命令执行工具
 */
export default class ShellToolPlugin implements ToolPlugin {
  readonly id = 'tool-shell';
  readonly name = 'Shell Commands';
  readonly version = '1.0.0';
  readonly type = PluginType.TOOL;
  readonly description = '安全地执行系统命令（ls, cat, grep, find 等）';

  private runtime?: Runtime;
  private config: ShellToolConfig = {
    enabled: true,
    timeout: 30000,
    allowedCommands: ['ls', 'cat', 'grep', 'find', 'pwd', 'echo', 'head', 'tail', 'wc', 'date', 'whoami'],
    blockedCommands: ['rm', 'mv', 'cp', 'chmod', 'chown', 'sudo', 'su', 'sh', 'bash', 'zsh'],
    maxOutputLength: 10000,
    workingDirectory: process.cwd(),
  };

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;

    const config = runtime.getConfig<Partial<ShellToolConfig>>('tools.shell') || {};
    this.config = {
      ...this.config,
      ...config,
    };

    runtime.logger.info('ShellToolPlugin initialized');
    runtime.logger.info(`Allowed commands: ${this.config.allowedCommands.join(', ')}`);
  }

  async start(): Promise<void> {
    this.runtime?.logger.info('ShellToolPlugin started');
  }

  async stop(): Promise<void> {
    this.runtime?.logger.info('ShellToolPlugin stopped');
  }

  getDefinition(): ToolDefinition {
    return {
      name: 'shell_execute',
      displayName: '执行命令',
      description: '执行安全的系统命令。支持的命令：ls, cat, grep, find, pwd, echo, head, tail, wc, date, whoami 等',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的命令（仅允许白名单中的命令）',
          },
          args: {
            type: 'array',
            description: '命令参数',
            items: { type: 'string' },
            default: [],
          },
          workingDir: {
            type: 'string',
            description: '工作目录（可选，默认使用配置的工作目录）',
          },
        },
        required: ['command'],
      },
      requireConfirmation: true,
      timeout: this.config.timeout,
    };
  }

  async execute(
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!this.config.enabled) {
        return {
          success: false,
          error: 'Shell 工具已被禁用',
        };
      }

      const command = params.command as string;
      const args = (params.args as string[]) || [];
      const workingDir = (params.workingDir as string) || this.config.workingDirectory;

      // 安全检查
      const security = this.validateCommand(command, args);
      if (!security.valid) {
        return {
          success: false,
          error: security.error,
        };
      }

      this.runtime?.logger.info(`Executing: ${command} ${args.join(' ')}`);

      // 执行命令
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd: workingDir,
        timeout: this.config.timeout,
        maxBuffer: this.config.maxOutputLength,
      });

      // 截断输出
      let output = stdout || stderr;
      if (output.length > this.config.maxOutputLength) {
        output = output.substring(0, this.config.maxOutputLength) + '\n... (output truncated)';
      }

      return {
        success: true,
        data: {
          command,
          args,
          output,
          stderr: stderr || undefined,
          workingDir,
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
   * 验证命令安全性
   */
  private validateCommand(
    command: string,
    args: string[]
  ): { valid: boolean; error?: string } {
    // 检查命令是否在黑名单
    const baseCommand = command.split(' ')[0];
    if (this.config.blockedCommands.includes(baseCommand)) {
      return {
        valid: false,
        error: `命令 "${baseCommand}" 在黑名单中，禁止执行`,
      };
    }

    // 检查命令是否在白名单
    if (!this.config.allowedCommands.includes(baseCommand)) {
      return {
        valid: false,
        error: `命令 "${baseCommand}" 不在允许列表中。允许的命令: ${this.config.allowedCommands.join(', ')}`,
      };
    }

    // 检查参数中是否包含危险字符
    const dangerousChars = [';', '&', '|', '>', '<', '`', '$', '(', ')'];
    for (const arg of args) {
      for (const char of dangerousChars) {
        if (arg.includes(char)) {
          return {
            valid: false,
            error: `参数中包含危险字符 "${char}"，禁止执行`,
          };
        }
      }
    }

    return { valid: true };
  }
}
