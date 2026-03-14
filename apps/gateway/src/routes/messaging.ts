/**
 * 消息通知 API 路由
 *
 * 管理消息通知配置和发送消息
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { toolRegistry } from '../services/task-automation/ToolExecutor';

const router: Router = Router();

/**
 * 消息平台配置接口
 */
interface MessagingConfig {
  id?: string;
  name: string;
  platform: 'wechat' | 'dingtalk' | 'feishu';
  webhookUrl: string;
  secret?: string;
  description?: string;
  isDefault: boolean;
  enabled: boolean;
}

/**
 * 获取消息配置列表
 * GET /api/v1/messaging/configs
 */
router.get('/configs', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // 从数据库获取配置（这里简化处理，实际应该创建 messaging_configs 表）
    // 暂时从环境变量或内存中获取
    const configs: MessagingConfig[] = [];

    // 检查环境变量中的配置
    if (process.env.WECHAT_WEBHOOK_URL) {
      configs.push({
        name: '微信默认',
        platform: 'wechat',
        webhookUrl: process.env.WECHAT_WEBHOOK_URL,
        description: '从环境变量读取',
        isDefault: true,
        enabled: true
      });
    }

    if (process.env.DINGTALK_WEBHOOK_URL) {
      configs.push({
        name: '钉钉默认',
        platform: 'dingtalk',
        webhookUrl: process.env.DINGTALK_WEBHOOK_URL,
        secret: process.env.DINGTALK_SECRET,
        description: '从环境变量读取',
        isDefault: true,
        enabled: true
      });
    }

    if (process.env.FEISHU_WEBHOOK_URL) {
      configs.push({
        name: '飞书默认',
        platform: 'feishu',
        webhookUrl: process.env.FEISHU_WEBHOOK_URL,
        secret: process.env.FEISHU_SECRET,
        description: '从环境变量读取',
        isDefault: true,
        enabled: true
      });
    }

    return res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('获取消息配置失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_CONFIGS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 发送消息
 * POST /api/v1/messaging/send
 */
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      platform,
      webhookUrl,
      content,
      msgType = 'text',
      secret,
      mentionedMobileList
    } = req.body;

    if (!platform || !webhookUrl || !content) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: platform, webhookUrl, content' }
      });
    }

    const tool = toolRegistry.get('send_message');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '消息发送工具未找到' }
      });
    }

    const result = await tool.execute({
      platform,
      webhookUrl,
      content,
      msgType,
      secret,
      mentionedMobileList
    });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        message: '消息发送成功'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'SEND_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('发送消息失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SEND_MESSAGE_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 批量发送消息
 * POST /api/v1/messaging/broadcast
 */
router.post('/broadcast', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { targets, content, msgType = 'text' } = req.body;

    if (!targets || !Array.isArray(targets) || targets.length === 0 || !content) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: targets, content' }
      });
    }

    const tool = toolRegistry.get('broadcast_message');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '批量消息工具未找到' }
      });
    }

    const result = await tool.execute({
      targets,
      content,
      msgType
    });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        message: '批量发送完成'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'BROADCAST_FAILED', message: '部分消息发送失败' },
        data: result.data
      });
    }
  } catch (error) {
    logger.error('批量发送消息失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'BROADCAST_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 发送任务通知
 * POST /api/v1/messaging/task-notification
 */
router.post('/task-notification', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      platform,
      webhookUrl,
      taskName,
      status,
      details,
      secret
    } = req.body;

    if (!platform || !webhookUrl || !taskName || !status) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段' }
      });
    }

    const tool = toolRegistry.get('send_task_notification');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '任务通知工具未找到' }
      });
    }

    const result = await tool.execute({
      platform,
      webhookUrl,
      taskName,
      status,
      details,
      secret
    });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        message: '任务通知发送成功'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'NOTIFICATION_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('发送任务通知失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'NOTIFICATION_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 测试消息配置
 * POST /api/v1/messaging/test
 */
router.post('/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { platform, webhookUrl, secret } = req.body;

    if (!platform || !webhookUrl) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: platform, webhookUrl' }
      });
    }

    const tool = toolRegistry.get('send_message');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '消息发送工具未找到' }
      });
    }

    const testContent = `🔔 测试消息\n\n这是一条来自 OpenClaw 的测试消息。\n时间: ${new Date().toLocaleString('zh-CN')}`;

    const result = await tool.execute({
      platform,
      webhookUrl,
      content: testContent,
      msgType: 'text',
      secret
    });

    if (result.success) {
      return res.json({
        success: true,
        message: '测试消息发送成功'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'TEST_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('测试消息发送失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TEST_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
