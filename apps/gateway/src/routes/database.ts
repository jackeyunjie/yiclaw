/**
 * 数据库工具 API 路由
 *
 * 提供 SQL 查询、数据导出、报表生成等功能
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { toolRegistry } from '../services/task-automation/ToolExecutor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router: Router = Router();

/**
 * 执行 SQL 查询
 * POST /api/v1/database/query
 */
router.post('/query', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sql, limit } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少 SQL 语句' }
      });
    }

    const tool = toolRegistry.get('sql_query');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: 'SQL 查询工具未找到' }
      });
    }

    const startTime = Date.now();
    const result = await tool.execute({ sql, limit });
    const executionTime = Date.now() - startTime;

    // 记录查询历史
    try {
      const userId = (req as any).user?.id;
      await prisma.queryHistory.create({
        data: {
          sql,
          executedBy: userId,
          rowCount: result.data?.rows?.length || 0,
          executionTime
        }
      });
    } catch (e) {
      logger.warn('记录查询历史失败', e);
    }

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        executionTime
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'QUERY_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('SQL 查询失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'QUERY_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * 获取表结构
 * GET /api/v1/database/schema/:tableName?
 */
router.get('/schema/:tableName?', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;

    const tool = toolRegistry.get('get_table_schema');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '表结构工具未找到' }
      });
    }

    const result = await tool.execute({ tableName });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'SCHEMA_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('获取表结构失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SCHEMA_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * 导出数据
 * POST /api/v1/database/export
 */
router.post('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sql, format, filename } = req.body;

    if (!sql || !format) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少 SQL 或格式参数' }
      });
    }

    const tool = toolRegistry.get('export_data');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '数据导出工具未找到' }
      });
    }

    const result = await tool.execute({ sql, format, filename });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('数据导出失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * 生成报表
 * POST /api/v1/database/report
 */
router.post('/report', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      tableName,
      dateColumn,
      startDate,
      endDate,
      groupBy,
      metrics
    } = req.body;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少表名' }
      });
    }

    const tool = toolRegistry.get('generate_report');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '报表生成工具未找到' }
      });
    }

    const result = await tool.execute({
      tableName,
      dateColumn,
      startDate,
      endDate,
      groupBy,
      metrics
    });

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'REPORT_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('生成报表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'REPORT_ERROR', message: (error as Error).message }
    });
  }
});

/**
 * 数据库健康检查
 * GET /api/v1/database/health
 */
router.get('/health', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tool = toolRegistry.get('db_health_check');
    if (!tool) {
      return res.status(500).json({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: '健康检查工具未找到' }
      });
    }

    const result = await tool.execute({});

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { code: 'HEALTH_CHECK_FAILED', message: result.error }
      });
    }
  } catch (error) {
    logger.error('健康检查失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'HEALTH_ERROR', message: (error as Error).message }
    });
  }
});

// ==================== DbSkill 管理 API ====================

/**
 * 获取所有 Skills
 * GET /api/v1/database/skills
 */
router.get('/skills', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const skills = await prisma.dbSkill.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { useCount: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
    return res.json({ success: true, data: skills });
  } catch (error) {
    logger.error('获取 Skills 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 获取单个 Skill
 * GET /api/v1/database/skills/:id
 */
router.get('/skills/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const skill = await prisma.dbSkill.findUnique({ where: { id } });
    if (!skill) {
      return res.status(404).json({ success: false, error: { message: 'Skill 不存在' } });
    }
    return res.json({ success: true, data: skill });
  } catch (error) {
    logger.error('获取 Skill 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 创建 Skill
 * POST /api/v1/database/skills
 */
router.post('/skills', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, category, skillDoc, workflows, sqlTemplate, parameters, tags } = req.body;
    const userId = (req as any).user?.id;

    const skill = await prisma.dbSkill.create({
      data: {
        name,
        description,
        category: category || 'general',
        skillDoc,
        workflows,
        sqlTemplate,
        parameters,
        tags,
        createdBy: userId
      }
    });
    return res.json({ success: true, data: skill });
  } catch (error) {
    logger.error('创建 Skill 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 更新 Skill
 * PUT /api/v1/database/skills/:id
 */
router.put('/skills/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, skillDoc, workflows, sqlTemplate, parameters, tags } = req.body;

    const skill = await prisma.dbSkill.update({
      where: { id },
      data: {
        name,
        description,
        category,
        skillDoc,
        workflows,
        sqlTemplate,
        parameters,
        tags
      }
    });
    return res.json({ success: true, data: skill });
  } catch (error) {
    logger.error('更新 Skill 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 删除 Skill
 * DELETE /api/v1/database/skills/:id
 */
router.delete('/skills/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dbSkill.delete({ where: { id } });
    return res.json({ success: true, message: 'Skill 已删除' });
  } catch (error) {
    logger.error('删除 Skill 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 执行 Skill (根据参数填充 SQL 模板)
 * POST /api/v1/database/skills/:id/execute
 */
router.post('/skills/:id/execute', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parameters, limit } = req.body;
    const userId = (req as any).user?.id;

    const skill = await prisma.dbSkill.findUnique({ where: { id } });
    if (!skill) {
      return res.status(404).json({ success: false, error: { message: 'Skill 不存在' } });
    }

    // 填充 SQL 模板
    let sql = skill.sqlTemplate;
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        sql = sql.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }

    // 执行查询
    const tool = toolRegistry.get('sql_query');
    if (!tool) {
      return res.status(500).json({ success: false, error: { message: 'SQL 查询工具未找到' } });
    }

    const startTime = Date.now();
    const result = await tool.execute({ sql, limit });
    const executionTime = Date.now() - startTime;

    if (result.success) {
      // 更新使用计数
      await prisma.dbSkill.update({
        where: { id },
        data: { useCount: { increment: 1 } }
      });

      // 记录查询历史
      await prisma.queryHistory.create({
        data: {
          sql,
          executedBy: userId,
          resultSummary: `执行 Skill: ${skill.name}`,
          rowCount: result.data?.rows?.length || 0,
          executionTime,
          skillId: id
        }
      });

      return res.json({
        success: true,
        data: result.data,
        executionTime,
        skillName: skill.name
      });
    } else {
      return res.status(400).json({ success: false, error: { message: result.error } });
    }
  } catch (error) {
    logger.error('执行 Skill 失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

// ==================== 查询历史 API ====================

/**
 * 获取查询历史
 * GET /api/v1/database/history
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { favorite, limit = 50 } = req.query;
    const userId = (req as any).user?.id;

    const where: any = {};
    if (favorite === 'true') where.isFavorite = true;
    if (userId) where.executedBy = userId;

    const histories = await prisma.queryHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        skill: {
          select: { name: true, category: true }
        }
      }
    });

    return res.json({ success: true, data: histories });
  } catch (error) {
    logger.error('获取查询历史失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 收藏/取消收藏查询历史
 * PUT /api/v1/database/history/:id/favorite
 */
router.put('/history/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;

    const history = await prisma.queryHistory.update({
      where: { id },
      data: { isFavorite }
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    logger.error('更新收藏状态失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 添加备注
 * PUT /api/v1/database/history/:id/note
 */
router.put('/history/:id/note', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const history = await prisma.queryHistory.update({
      where: { id },
      data: { note }
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    logger.error('更新备注失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 删除查询历史
 * DELETE /api/v1/database/history/:id
 */
router.delete('/history/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.queryHistory.delete({ where: { id } });
    return res.json({ success: true, message: '记录已删除' });
  } catch (error) {
    logger.error('删除历史记录失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

/**
 * 从 Skill 模板创建查询历史记录
 * POST /api/v1/database/history/from-skill
 */
router.post('/history/from-skill', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { skillId, parameters } = req.body;
    const userId = (req as any).user?.id;

    const skill = await prisma.dbSkill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(404).json({ success: false, error: { message: 'Skill 不存在' } });
    }

    // 填充模板
    let sql = skill.sqlTemplate;
    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        sql = sql.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }

    // 创建历史记录（未执行）
    const history = await prisma.queryHistory.create({
      data: {
        sql,
        executedBy: userId,
        resultSummary: `来自 Skill: ${skill.name} (未执行)`,
        skillId
      }
    });

    return res.json({ success: true, data: { history, sql } });
  } catch (error) {
    logger.error('创建历史记录失败', error);
    return res.status(500).json({ success: false, error: { message: (error as Error).message } });
  }
});

export default router;
