/**
 * 长期记忆 API 路由
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { MemoryStore } from '../services/memory/MemoryStore';
import { MemoryEngine } from '../services/memory/MemoryEngine';
import { getPrismaClient } from '../utils/db';
import { logger } from '../utils/logger';
import {
  MemoryType,
  MemoryStatus,
  MemoryPriority,
  CreateMemoryParams
} from '../services/memory/types';

const router: Router = Router();

// 初始化服务
const prisma = getPrismaClient();
const memoryStore = new MemoryStore(prisma);
const memoryEngine = new MemoryEngine(memoryStore);

/**
 * 创建记忆
 * POST /api/v1/memory
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const params: CreateMemoryParams = req.body;
    const userId = req.user?.userId;

    if (!params.type || !params.title || !params.content) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: type, title, content' }
      });
    }

    const memory = await memoryStore.createMemory({
      ...params,
      userId
    });

    return res.status(201).json({
      success: true,
      data: memory,
      message: '记忆创建成功'
    });
  } catch (error) {
    logger.error('创建记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取记忆列表
 * GET /api/v1/memory
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      type,
      status,
      priority,
      tags,
      category,
      search,
      limit = '50',
      offset = '0'
    } = req.query;

    const query = {
      types: type ? (Array.isArray(type) ? type : [type]) as MemoryType[] : undefined,
      status: status ? (Array.isArray(status) ? status : [status]) as MemoryStatus[] : undefined,
      priority: priority ? [parseInt(priority as string) as MemoryPriority] : undefined,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
      category: category as string,
      searchQuery: search as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: 'relevance' as const
    };

    const results = await memoryStore.searchMemories(query);

    return res.json({
      success: true,
      data: {
        items: results.map(r => r.memory),
        total: results.length
      }
    });
  } catch (error) {
    logger.error('获取记忆列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_MEMORIES_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取单个记忆
 * GET /api/v1/memory/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const memory = await memoryStore.getMemory(id);

    if (!memory) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMORY_NOT_FOUND', message: '记忆不存在' }
      });
    }

    // 获取相关记忆
    const relatedMemories = await memoryStore.getRelatedMemories(id, 5);

    return res.json({
      success: true,
      data: {
        ...memory,
        relatedMemories
      }
    });
  } catch (error) {
    logger.error('获取记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 更新记忆
 * PUT /api/v1/memory/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const memory = await memoryStore.updateMemory(id, updates);

    return res.json({
      success: true,
      data: memory,
      message: '记忆更新成功'
    });
  } catch (error) {
    logger.error('更新记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 删除记忆
 * DELETE /api/v1/memory/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await memoryStore.deleteMemory(id);

    return res.json({
      success: true,
      message: '记忆删除成功'
    });
  } catch (error) {
    logger.error('删除记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建战略目标
 * POST /api/v1/memory/strategic
 */
router.post('/strategic', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      title,
      vision,
      mission,
      objective,
      keyResults,
      milestones,
      startDate,
      targetDate,
      rationale,
      stickiness,
      tags
    } = req.body;

    if (!title || !objective || !keyResults || !milestones) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段' }
      });
    }

    const memory = await memoryEngine.createStrategicMemory({
      title,
      vision,
      mission,
      objective,
      keyResults,
      milestones,
      startDate: new Date(startDate),
      targetDate: new Date(targetDate),
      rationale: rationale || '',
      stickiness: stickiness || 80,
      userId: req.user?.userId,
      tags
    });

    return res.status(201).json({
      success: true,
      data: memory,
      message: '战略目标创建成功'
    });
  } catch (error) {
    logger.error('创建战略目标失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_STRATEGIC_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建第一性原理分析
 * POST /api/v1/memory/first-principle
 */
router.post('/first-principle', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, problemStatement, problemDomain, tags } = req.body;

    if (!title || !problemStatement) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: title, problemStatement' }
      });
    }

    const memory = await memoryEngine.createFirstPrincipleMemory({
      title,
      problemStatement,
      problemDomain: problemDomain || 'general',
      userId: req.user?.userId,
      tags
    });

    return res.status(201).json({
      success: true,
      data: memory,
      message: '第一性原理分析创建成功'
    });
  } catch (error) {
    logger.error('创建第一性原理分析失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_FIRST_PRINCIPLE_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建底层逻辑记忆
 * POST /api/v1/memory/fundamental
 */
router.post('/fundamental', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, pattern, patternType, causeEffectChain, conditions, tags } = req.body;

    if (!title || !pattern || !causeEffectChain) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段' }
      });
    }

    const memory = await memoryEngine.createFundamentalLogicMemory({
      title,
      pattern,
      patternType: patternType || 'causal',
      causeEffectChain,
      conditions: conditions || [],
      userId: req.user?.userId,
      tags
    });

    return res.status(201).json({
      success: true,
      data: memory,
      message: '底层逻辑记忆创建成功'
    });
  } catch (error) {
    logger.error('创建底层逻辑记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_FUNDAMENTAL_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 执行复盘
 * POST /api/v1/memory/:id/review
 */
router.post('/:id/review', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewType, originalPlan, actualOutcome, successes, failures } = req.body;

    if (!reviewType || !originalPlan || !actualOutcome) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段' }
      });
    }

    const review = await memoryEngine.conductReview(id, reviewType, {
      originalPlan,
      actualOutcome,
      successes: successes || [],
      failures: failures || []
    });

    return res.json({
      success: true,
      data: review,
      message: '复盘完成'
    });
  } catch (error) {
    logger.error('执行复盘失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CONDUCT_REVIEW_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 检索相关记忆
 * POST /api/v1/memory/retrieve
 */
router.post('/retrieve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, context, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少查询内容' }
      });
    }

    const memories = await memoryEngine.retrieveRelevantMemories(
      query,
      context || {},
      limit
    );

    return res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    logger.error('检索记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'RETRIEVE_MEMORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 生成洞察
 * GET /api/v1/memory/insights
 */
router.get('/insights/all', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const insights = await memoryEngine.generateInsights();

    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('生成洞察失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GENERATE_INSIGHTS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取记忆统计
 * GET /api/v1/memory/stats/overview
 */
router.get('/stats/overview', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const stats = await memoryStore.getStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取记忆统计失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_STATS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 更新记忆状态（坚持/放弃/新尝试）
 * POST /api/v1/memory/:id/status
 */
router.post('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: status, reason' }
      });
    }

    const memory = await memoryStore.updateMemoryStatus(id, status as MemoryStatus, reason);

    return res.json({
      success: true,
      data: memory,
      message: '记忆状态更新成功'
    });
  } catch (error) {
    logger.error('更新记忆状态失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_STATUS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 战略决策分析
 * POST /api/v1/memory/:id/decision
 */
router.post('/:id/decision', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decision = await memoryEngine.makeStrategicDecision(id);

    return res.json({
      success: true,
      data: decision
    });
  } catch (error) {
    logger.error('战略决策分析失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'STRATEGIC_DECISION_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取需要复盘的记忆
 * GET /api/v1/memory/review/pending
 */
router.get('/review/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const memories = await memoryStore.getMemoriesNeedingReview(parseInt(days as string));

    return res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    logger.error('获取待复盘记忆失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_PENDING_REVIEW_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
