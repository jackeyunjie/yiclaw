/**
 * 消息通知工具
 *
 * 支持微信、钉钉、飞书三大企业消息平台
 */

import { createLogger } from '../../../utils/logger';
import type { Tool, ToolResult } from '../ToolExecutor';

const logger = createLogger('MessagingTool');

/**
 * 消息类型
 */
export type MessageType = 'text' | 'markdown' | 'image' | 'file' | 'card';

/**
 * 消息平台
 */
export type MessagePlatform = 'wechat' | 'dingtalk' | 'feishu';

/**
 * 微信消息配置
 */
interface WechatConfig {
  webhookUrl: string;
  mentionedMobileList?: string[];
}

/**
 * 钉钉消息配置
 */
interface DingtalkConfig {
  webhookUrl: string;
  secret?: string;
  accessToken?: string;
}

/**
 * 飞书消息配置
 */
interface FeishuConfig {
  webhookUrl: string;
  secret?: string;
}

/**
 * 发送微信企业微信消息
 */
async function sendWechatMessage(
  config: WechatConfig,
  content: string,
  msgType: MessageType = 'text'
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const payload: any = {
      msgtype: msgType
    };

    if (msgType === 'text') {
      payload.text = {
        content,
        mentioned_mobile_list: config.mentionedMobileList || []
      };
    } else if (msgType === 'markdown') {
      payload.markdown = { content };
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.errcode === 0) {
      return {
        success: true,
        data: { platform: 'wechat', messageId: result.msgid },
        executionTime: Date.now() - startTime
      };
    } else {
      return {
        success: false,
        error: `微信消息发送失败: ${result.errmsg}`,
        executionTime: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `微信消息发送异常: ${(error as Error).message}`,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * 发送钉钉消息
 */
async function sendDingtalkMessage(
  config: DingtalkConfig,
  content: string,
  msgType: MessageType = 'text'
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // 如果有 secret，需要计算签名
    let url = config.webhookUrl;
    if (config.secret) {
      const timestamp = Date.now();
      const sign = await calculateDingtalkSign(timestamp, config.secret);
      url = `${url}&timestamp=${timestamp}&sign=${sign}`;
    }

    const payload: any = {
      msgtype: msgType
    };

    if (msgType === 'text') {
      payload.text = { content };
    } else if (msgType === 'markdown') {
      payload.markdown = {
        title: '消息通知',
        text: content
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.errcode === 0) {
      return {
        success: true,
        data: { platform: 'dingtalk' },
        executionTime: Date.now() - startTime
      };
    } else {
      return {
        success: false,
        error: `钉钉消息发送失败: ${result.errmsg}`,
        executionTime: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `钉钉消息发送异常: ${(error as Error).message}`,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * 计算钉钉签名
 */
async function calculateDingtalkSign(timestamp: number, secret: string): Promise<string> {
  const crypto = await import('crypto');
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = crypto.createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  return encodeURIComponent(sign);
}

/**
 * 发送飞书消息
 */
async function sendFeishuMessage(
  config: FeishuConfig,
  content: string,
  msgType: MessageType = 'text'
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // 如果有 secret，需要计算签名
    let url = config.webhookUrl;
    if (config.secret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = await calculateFeishuSign(timestamp, config.secret);
      url = `${url}?timestamp=${timestamp}&sign=${sign}`;
    }

    const payload: any = {
      msg_type: msgType
    };

    if (msgType === 'text') {
      payload.content = { text: content };
    } else if (msgType === 'markdown') {
      payload.content = { text: content };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === 0) {
      return {
        success: true,
        data: { platform: 'feishu' },
        executionTime: Date.now() - startTime
      };
    } else {
      return {
        success: false,
        error: `飞书消息发送失败: ${result.msg}`,
        executionTime: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `飞书消息发送异常: ${(error as Error).message}`,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * 计算飞书签名
 */
async function calculateFeishuSign(timestamp: number, secret: string): Promise<string> {
  const crypto = await import('crypto');
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = crypto.createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  return sign;
}

/**
 * 发送消息工具
 */
export const sendMessageTool: Tool = {
  name: 'send_message',
  description: '发送消息通知到微信、钉钉或飞书',
  parameters: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        description: '消息平台: wechat(微信), dingtalk(钉钉), feishu(飞书)'
      },
      webhookUrl: {
        type: 'string',
        description: 'Webhook URL'
      },
      content: {
        type: 'string',
        description: '消息内容'
      },
      msgType: {
        type: 'string',
        description: '消息类型: text(文本), markdown(Markdown格式)'
      },
      secret: {
        type: 'string',
        description: '签名密钥（钉钉/飞书需要）'
      },
      mentionedMobileList: {
        type: 'array',
        description: '@手机号列表（仅微信）'
      }
    },
    required: ['platform', 'webhookUrl', 'content']
  },
  async execute(params) {
    const platform = String(params.platform).toLowerCase() as MessagePlatform;
    const webhookUrl = String(params.webhookUrl);
    const content = String(params.content);
    const msgType = String(params.msgType || 'text') as MessageType;
    const secret = params.secret ? String(params.secret) : undefined;
    const mentionedMobileList = params.mentionedMobileList as string[] | undefined;

    logger.info(`发送消息: ${platform} -> ${webhookUrl.substring(0, 50)}...`);

    switch (platform) {
      case 'wechat':
        return sendWechatMessage(
          { webhookUrl, mentionedMobileList },
          content,
          msgType
        );

      case 'dingtalk':
        return sendDingtalkMessage(
          { webhookUrl, secret },
          content,
          msgType
        );

      case 'feishu':
        return sendFeishuMessage(
          { webhookUrl, secret },
          content,
          msgType
        );

      default:
        return {
          success: false,
          error: `不支持的消息平台: ${platform}`
        };
    }
  }
};

/**
 * 批量发送消息工具
 */
export const broadcastMessageTool: Tool = {
  name: 'broadcast_message',
  description: '批量发送消息到多个平台',
  parameters: {
    type: 'object',
    properties: {
      targets: {
        type: 'array',
        description: '目标平台列表'
      },
      content: {
        type: 'string',
        description: '消息内容'
      },
      msgType: {
        type: 'string',
        description: '消息类型'
      }
    },
    required: ['targets', 'content']
  },
  async execute(params) {
    const startTime = Date.now();
    const targets = params.targets as Array<{
      platform: string;
      webhookUrl: string;
      secret?: string;
    }>;
    const content = String(params.content);
    const msgType = String(params.msgType || 'text') as MessageType;

    logger.info(`批量发送消息到 ${targets.length} 个平台`);

    const results = await Promise.all(
      targets.map(async (target) => {
        const platform = target.platform.toLowerCase() as MessagePlatform;

        switch (platform) {
          case 'wechat':
            return sendWechatMessage(
              { webhookUrl: target.webhookUrl },
              content,
              msgType
            );
          case 'dingtalk':
            return sendDingtalkMessage(
              { webhookUrl: target.webhookUrl, secret: target.secret },
              content,
              msgType
            );
          case 'feishu':
            return sendFeishuMessage(
              { webhookUrl: target.webhookUrl, secret: target.secret },
              content,
              msgType
            );
          default:
            return {
              success: false,
              error: `不支持的平台: ${platform}`
            };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: failureCount === 0,
      data: {
        total: targets.length,
        success: successCount,
        failed: failureCount,
        results
      },
      executionTime: Date.now() - startTime
    };
  }
};

/**
 * 发送任务通知工具
 */
export const sendTaskNotificationTool: Tool = {
  name: 'send_task_notification',
  description: '发送任务状态通知（带格式化模板）',
  parameters: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        description: '消息平台'
      },
      webhookUrl: {
        type: 'string',
        description: 'Webhook URL'
      },
      taskName: {
        type: 'string',
        description: '任务名称'
      },
      status: {
        type: 'string',
        description: '任务状态: started, completed, failed'
      },
      details: {
        type: 'object',
        description: '任务详情'
      },
      secret: {
        type: 'string',
        description: '签名密钥'
      }
    },
    required: ['platform', 'webhookUrl', 'taskName', 'status']
  },
  async execute(params) {
    const platform = String(params.platform).toLowerCase() as MessagePlatform;
    const webhookUrl = String(params.webhookUrl);
    const taskName = String(params.taskName);
    const status = String(params.status);
    const details = params.details as Record<string, unknown> || {};
    const secret = params.secret ? String(params.secret) : undefined;

    // 根据状态选择图标和颜色
    const statusConfig: Record<string, { icon: string; color: string }> = {
      started: { icon: '🚀', color: 'blue' },
      completed: { icon: '✅', color: 'green' },
      failed: { icon: '❌', color: 'red' },
      warning: { icon: '⚠️', color: 'orange' }
    };

    const config = statusConfig[status] || statusConfig.started;

    // 构建消息内容
    let content = `${config.icon} **任务通知**\n\n`;
    content += `**任务**: ${taskName}\n`;
    content += `**状态**: ${status.toUpperCase()}\n`;

    if (details.duration) {
      content += `**耗时**: ${details.duration}s\n`;
    }

    if (details.result) {
      content += `**结果**: ${details.result}\n`;
    }

    if (details.error) {
      content += `**错误**: ${details.error}\n`;
    }

    content += `\n⏰ ${new Date().toLocaleString('zh-CN')}`;

    logger.info(`发送任务通知: ${taskName} - ${status}`);

    switch (platform) {
      case 'wechat':
        return sendWechatMessage({ webhookUrl }, content, 'markdown');
      case 'dingtalk':
        return sendDingtalkMessage({ webhookUrl, secret }, content, 'markdown');
      case 'feishu':
        return sendFeishuMessage({ webhookUrl, secret }, content, 'markdown');
      default:
        return {
          success: false,
          error: `不支持的平台: ${platform}`
        };
    }
  }
};
