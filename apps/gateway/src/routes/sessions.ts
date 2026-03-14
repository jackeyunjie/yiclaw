/**
 * 会话路由
 *
 * 提供会话的 CRUD 操作和消息管理
 */

import { Router } from 'express';
import { getPrismaClient } from '../utils/db';
import { createLogger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import type { Request, Response } from 'express';

const logger = createLogger('SessionRoute');
const router: Router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 获取当前用户的所有会话
 * GET /api/v1/sessions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const userId = req.user!.userId;

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            role: true,
          },
        },
      },
    });

    // 格式化响应
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      channelType: session.channelType,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastMessage: session.messages[0] || null,
    }));

    return res.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    logger.error('获取会话列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取会话列表失败',
      },
    });
  }
});

/**
 * 创建新会话
 * POST /api/v1/sessions
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, channelType = 'webchat' } = req.body;
    const userId = req.user!.userId;

    // 参数验证
    if (title && (title.length < 1 || title.length > 200)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TITLE',
          message: '会话标题长度必须在 1-200 个字符之间',
        },
      });
    }

    const prisma = getPrismaClient();

    const session = await prisma.session.create({
      data: {
        userId,
        title: title || '新会话',
        channelType,
        channelId: userId, // 使用 userId 作为 channelId（Web 场景）
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        channelType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`用户 ${userId} 创建会话: ${session.id}`);

    return res.status(201).json({
      success: true,
      data: session,
      message: '会话创建成功',
    });
  } catch (error) {
    logger.error('创建会话失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建会话失败',
      },
    });
  }
});

/**
 * 获取单个会话详情
 * GET /api/v1/sessions/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const prisma = getPrismaClient();

    const session = await prisma.session.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在',
        },
      });
    }

    return res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('获取会话详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取会话详情失败',
      },
    });
  }
});

/**
 * 更新会话
 * PUT /api/v1/sessions/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;
    const userId = req.user!.userId;

    // 参数验证
    if (title && (title.length < 1 || title.length > 200)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TITLE',
          message: '会话标题长度必须在 1-200 个字符之间',
        },
      });
    }

    const prisma = getPrismaClient();

    // 检查会话是否存在且属于当前用户
    const existingSession = await prisma.session.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在',
        },
      });
    }

    const updateData: { title?: string; status?: 'ACTIVE' | 'CLOSED' | 'ARCHIVED' } = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status as 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        channelType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`用户 ${userId} 更新会话: ${id}`);

    return res.json({
      success: true,
      data: session,
      message: '会话更新成功',
    });
  } catch (error) {
    logger.error('更新会话失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新会话失败',
      },
    });
  }
});

/**
 * 删除会话
 * DELETE /api/v1/sessions/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const prisma = getPrismaClient();

    // 检查会话是否存在且属于当前用户
    const existingSession = await prisma.session.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在',
        },
      });
    }

    // 删除会话（级联删除消息）
    await prisma.session.delete({
      where: { id },
    });

    logger.info(`用户 ${userId} 删除会话: ${id}`);

    return res.json({
      success: true,
      message: '会话删除成功',
    });
  } catch (error) {
    logger.error('删除会话失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除会话失败',
      },
    });
  }
});

/**
 * 发送消息
 * POST /api/v1/sessions/:id/messages
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.userId;

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
        id,
        userId,
        status: 'ACTIVE',
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

    // 创建用户消息
    const message = await prisma.message.create({
      data: {
        sessionId: id,
        role: 'USER',
        content: content.trim(),
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // 更新会话的 updatedAt
    await prisma.session.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    logger.info(`用户 ${userId} 在会话 ${id} 发送消息`);

    return res.status(201).json({
      success: true,
      data: message,
      message: '消息发送成功',
    });
  } catch (error) {
    logger.error('发送消息失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '发送消息失败',
      },
    });
  }
});

/**
 * 获取会话的消息列表
 * GET /api/v1/sessions/:id/messages
 */
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const prisma = getPrismaClient();

    // 检查会话是否存在且属于当前用户
    const session = await prisma.session.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: '会话不存在',
        },
      });
    }

    // 分页查询消息
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.message.count({
        where: { sessionId: id },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        messages: messages.reverse(), // 按时间正序返回
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('获取消息列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取消息列表失败',
      },
    });
  }
});

export default router;
