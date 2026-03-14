/**
 * 定时任务 API 路由
 *
 * 提供定时任务管理的 REST API 接口
 */

import { Router, Request, Response } from 'express';
import { cronScheduler } from '../services/scheduler/CronScheduler';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('SchedulerRoute');
const router: Router = Router();

/**
 * 获取所有定时任务
 * GET /api/v1/scheduler/tasks
 */
router.get('/tasks', authMiddleware, (_req: Request, res: Response) => {
  try {
    const tasks = cronScheduler.getAllTasks();

    return res.json({
      success: true,
      data: {
        tasks: tasks.map(task => ({
          taskId: task.taskId,
          name: task.name,
          description: task.description,
          cronExpression: task.cronExpression,
          type: task.type,
          enabled: task.enabled,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          lastRunAt: task.lastRunAt,
          nextRunAt: task.nextRunAt,
          runCount: task.runCount,
          failCount: task.failCount
        }))
      }
    });
  } catch (error) {
    logger.error('获取定时任务列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_TASKS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建定时任务
 * POST /api/v1/scheduler/tasks
 */
router.post('/tasks', authMiddleware, (req: Request, res: Response) => {
  try {
    const { name, description, cronExpression, type, payload, options, notification } = req.body;

    // 验证必填字段
    if (!name || !cronExpression || !type || !payload) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: name, cronExpression, type, payload' }
      });
    }

    // 验证任务类型
    if (!['react', 'command', 'http'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: '无效的任务类型，必须是 react, command 或 http' }
      });
    }

    const task = cronScheduler.createTask({
      name,
      description,
      cronExpression,
      type,
      payload,
      options,
      notification,
      enabled: true
    });

    logger.info(`创建定时任务: ${task.name} (${task.taskId})`);

    return res.status(201).json({
      success: true,
      data: {
        taskId: task.taskId,
        name: task.name,
        description: task.description,
        cronExpression: task.cronExpression,
        type: task.type,
        enabled: task.enabled,
        createdAt: task.createdAt,
        nextRunAt: task.nextRunAt
      },
      message: '定时任务创建成功'
    });
  } catch (error) {
    logger.error('创建定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取单个定时任务
 * GET /api/v1/scheduler/tasks/:taskId
 */
router.get('/tasks/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = cronScheduler.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '定时任务不存在' }
      });
    }

    return res.json({
      success: true,
      data: {
        taskId: task.taskId,
        name: task.name,
        description: task.description,
        cronExpression: task.cronExpression,
        type: task.type,
        payload: task.payload,
        options: task.options,
        notification: task.notification,
        enabled: task.enabled,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        lastRunAt: task.lastRunAt,
        nextRunAt: task.nextRunAt,
        runCount: task.runCount,
        failCount: task.failCount
      }
    });
  } catch (error) {
    logger.error('获取定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 更新定时任务
 * PUT /api/v1/scheduler/tasks/:taskId
 */
router.put('/tasks/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = cronScheduler.updateTask(taskId, updates);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '定时任务不存在' }
      });
    }

    logger.info(`更新定时任务: ${task.name}`);

    return res.json({
      success: true,
      data: {
        taskId: task.taskId,
        name: task.name,
        description: task.description,
        cronExpression: task.cronExpression,
        type: task.type,
        enabled: task.enabled,
        updatedAt: task.updatedAt,
        nextRunAt: task.nextRunAt
      },
      message: '定时任务更新成功'
    });
  } catch (error) {
    logger.error('更新定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 删除定时任务
 * DELETE /api/v1/scheduler/tasks/:taskId
 */
router.delete('/tasks/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const success = cronScheduler.deleteTask(taskId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '定时任务不存在' }
      });
    }

    logger.info(`删除定时任务: ${taskId}`);

    return res.json({
      success: true,
      message: '定时任务删除成功'
    });
  } catch (error) {
    logger.error('删除定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 启用定时任务
 * POST /api/v1/scheduler/tasks/:taskId/enable
 */
router.post('/tasks/:taskId/enable', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const success = cronScheduler.enableTask(taskId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '定时任务不存在' }
      });
    }

    const task = cronScheduler.getTask(taskId);

    return res.json({
      success: true,
      data: {
        taskId,
        enabled: true,
        nextRunAt: task?.nextRunAt
      },
      message: '定时任务已启用'
    });
  } catch (error) {
    logger.error('启用定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'ENABLE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 禁用定时任务
 * POST /api/v1/scheduler/tasks/:taskId/disable
 */
router.post('/tasks/:taskId/disable', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const success = cronScheduler.disableTask(taskId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '定时任务不存在' }
      });
    }

    return res.json({
      success: true,
      data: { taskId, enabled: false },
      message: '定时任务已禁用'
    });
  } catch (error) {
    logger.error('禁用定时任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DISABLE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 立即执行任务
 * POST /api/v1/scheduler/tasks/:taskId/run
 */
router.post('/tasks/:taskId/run', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const record = await cronScheduler.runTaskNow(taskId);

    return res.json({
      success: true,
      data: {
        executionId: record.executionId,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        duration: record.duration,
        result: record.result,
        error: record.error
      },
      message: record.status === 'success' ? '任务执行成功' : '任务执行失败'
    });
  } catch (error) {
    logger.error('立即执行任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'RUN_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取任务执行历史
 * GET /api/v1/scheduler/tasks/:taskId/history
 */
router.get('/tasks/:taskId/history', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const history = cronScheduler.getExecutionHistory(taskId);

    return res.json({
      success: true,
      data: {
        taskId,
        history: history.map(record => ({
          executionId: record.executionId,
          status: record.status,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          duration: record.duration,
          result: record.result,
          error: record.error
        }))
      }
    });
  } catch (error) {
    logger.error('获取执行历史失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_HISTORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取调度器状态
 * GET /api/v1/scheduler/status
 */
router.get('/status', authMiddleware, (_req: Request, res: Response) => {
  try {
    const tasks = cronScheduler.getAllTasks();
    const activeTasks = tasks.filter(t => t.enabled);
    const totalRuns = tasks.reduce((sum, t) => sum + t.runCount, 0);
    const totalFails = tasks.reduce((sum, t) => sum + t.failCount, 0);

    return res.json({
      success: true,
      data: {
        isRunning: true, // 调度器状态
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        totalRuns,
        totalFails,
        successRate: totalRuns > 0 ? ((totalRuns - totalFails) / totalRuns * 100).toFixed(2) + '%' : 'N/A'
      }
    });
  } catch (error) {
    logger.error('获取调度器状态失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_STATUS_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
