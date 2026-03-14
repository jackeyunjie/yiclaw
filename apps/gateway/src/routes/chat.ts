/**
 * 聊天路由
 *
 * 提供 AI 对话功能，整合会话管理和 AI 服务
 */

import { Router } from 'express';
import { getPrismaClient } from '../utils/db';
import { createLogger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import {
  chatCompletion,
  chatCompletionStream,
  isAIConfigured,
  getAvailableModels,
  getAIStatus,
  type ChatMessage,
} from '../services/ai';
import type { Request, Response } from 'express';

const logger = createLogger('ChatRoute');
const router: Router = Router();

/**
 * 检查 AI 服务状态
 * GET /api/v1/chat/status
 * 公开接口，无需认证
 */
router.get('/status', (_req: Request, res: Response) => {
  const status = getAIStatus();

  return res.json({
    success: true,
    data: {
      ...status,
      message: status.available
        ? `AI 服务已配置，可用提供商: ${status.providers.join(', ')}`
        : 'AI 服务未配置，请设置 ANTHROPIC_API_KEY、DASHSCOPE_API_KEY、DEEPSEEK_API_KEY 或 MOONSHOT_API_KEY',
    },
  });
});

/**
 * 获取可用模型列表
 * GET /api/v1/chat/models
 * 公开接口，无需认证
 */
router.get('/models', (_req: Request, res: Response) => {
  const models = getAvailableModels();
  const configured = isAIConfigured();

  return res.json({
    success: true,
    data: {
      models,
      configured,
    },
  });
});

/**
 * 发送消息并获取 AI 回复
 * POST /api/v1/chat/:sessionId
 * 需要认证
 */
router.post('/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content, model, stream = false } = req.body;
    const userId = req.user!.userId;

    // 检查 AI 是否配置
    if (!isAIConfigured()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: 'AI 服务未配置，请设置 ANTHROPIC_API_KEY、DASHSCOPE_API_KEY、DEEPSEEK_API_KEY 或 MOONSHOT_API_KEY',
        },
      });
    }

    // 参数验证
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT',
          message: '消息内容不能为空',
        },
      });
    }

    if (content.length > 4000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONTENT_TOO_LONG',
          message: '消息内容不能超过 4000 个字符',
        },
      });
    }

    const prisma = getPrismaClient();

    // 检查会话是否存在且属于当前用户
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        status: 'ACTIVE',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // 只取最近 20 条作为上下文
          select: {
            role: true,
            content: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在或已关闭',
        },
      });
    }

    // 保存用户消息
    const userMessage = await prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: content.trim(),
      },
    });

    // 构建消息上下文
    const messages: ChatMessage[] = session.messages.map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: content.trim(),
    });

    // 流式响应
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let assistantContent = '';

      await chatCompletionStream(
        {
          model,
          messages,
        },
        {
          onChunk: (chunk) => {
            assistantContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          },
          onComplete: async (result) => {
            // 保存 AI 回复
            await prisma.message.create({
              data: {
                sessionId,
                role: 'ASSISTANT',
                content: result.content,
                metadata: {
                  model: result.model,
                  tokens: result.tokens,
                },
              },
            });

            // 更新会话时间
            await prisma.session.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            });

            res.write(`data: ${JSON.stringify({
              type: 'complete',
              data: {
                userMessage,
                assistantMessage: {
                  content: result.content,
                  model: result.model,
                  tokens: result.tokens,
                },
              },
            })}\n\n`);
            res.end();
          },
          onError: (error) => {
            logger.error('流式 AI 响应错误:', error);
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: {
                code: 'AI_ERROR',
                message: error.message,
              },
            })}\n\n`);
            res.end();
          },
        }
      );

      return;
    }

    // 非流式响应
    const result = await chatCompletion({
      model,
      messages,
    });

    // 保存 AI 回复
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: result.content,
        metadata: {
          model: result.model,
          tokens: result.tokens,
        },
      },
    });

    // 更新会话时间
    await prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    logger.info(`用户 ${userId} 在会话 ${sessionId} 完成对话`);

    return res.json({
      success: true,
      data: {
        userMessage,
        assistantMessage: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: result.content,
          model: result.model,
          tokens: result.tokens,
          createdAt: assistantMessage.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('聊天失败:', error);

    // 判断错误类型
    if (error instanceof Error) {
      if (error.message.includes('API Key')) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'AI_NOT_CONFIGURED',
            message: 'AI 服务未配置',
          },
        });
      }

      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'AI 服务请求过于频繁，请稍后再试',
          },
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '聊天服务暂时不可用',
      },
    });
  }
});

export default router;
