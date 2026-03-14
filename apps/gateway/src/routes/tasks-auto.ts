/**
 * 全自动任务处理 API 路由
 *
 * 提供任务自动化相关的 REST API 接口
 */

import { Router, Request, Response } from 'express';
import { taskEngine } from '../services/task-automation/TaskEngine';
import { toolRegistry } from '../services/task-automation/ToolExecutor';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('TasksAutoRoute');
const router: Router = Router();

/**
 * 创建新任务
 * POST /api/v1/tasks-auto
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { request, options } = req.body;

    if (!request || typeof request !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '请提供任务描述' }
      });
    }

    logger.info(`创建自动任务: ${request}`);

    // 启动任务
    const task = await taskEngine.startTask(request, options || {});

    return res.status(201).json({
      success: true,
      data: {
        taskId: task.taskId,
        status: task.status,
        plan: {
          goal: task.plan.goal,
          subtasks: task.plan.subtasks.map(st => ({
            id: st.id,
            name: st.name,
            description: st.description,
            tool: st.tool,
            status: st.status
          }))
        }
      },
      message: '任务已创建并开始执行'
    });

  } catch (error) {
    logger.error('创建任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'TASK_CREATION_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取任务列表
 * GET /api/v1/tasks-auto
 */
router.get('/', authMiddleware, (_req: Request, res: Response) => {
  try {
    const tasks = taskEngine.getActiveTasks();

    return res.json({
      success: true,
      data: {
        tasks: tasks.map(task => ({
          taskId: task.taskId,
          status: task.status,
          goal: task.plan.goal,
          currentStep: task.currentStep,
          totalSteps: task.plan.subtasks.length,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }))
      }
    });

  } catch (error) {
    logger.error('获取任务列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_TASKS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取任务详情
 * GET /api/v1/tasks-auto/:taskId
 */
router.get('/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = taskEngine.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '任务不存在' }
      });
    }

    return res.json({
      success: true,
      data: {
        taskId: task.taskId,
        status: task.status,
        goal: task.plan.goal,
        originalRequest: task.plan.originalRequest,
        currentStep: task.currentStep,
        totalSteps: task.plan.subtasks.length,
        subtasks: task.plan.subtasks.map(st => ({
          id: st.id,
          name: st.name,
          description: st.description,
          tool: st.tool,
          parameters: st.parameters,
          dependencies: st.dependencies,
          status: st.status,
          result: st.result,
          error: st.error
        })),
        history: task.history.map(h => ({
          stepId: h.stepId,
          status: h.status,
          startTime: h.startTime,
          endTime: h.endTime,
          aiDecision: h.aiDecision
        })),
        context: task.context,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        error: task.error
      }
    });

  } catch (error) {
    logger.error('获取任务详情失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 确认继续执行任务
 * POST /api/v1/tasks-auto/:taskId/confirm
 */
router.post('/:taskId/confirm', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    taskEngine.confirmTask(taskId);

    return res.json({
      success: true,
      message: '任务已确认，继续执行'
    });

  } catch (error) {
    logger.error('确认任务失败', error);
    return res.status(400).json({
      success: false,
      error: { code: 'CONFIRM_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 暂停任务
 * POST /api/v1/tasks-auto/:taskId/pause
 */
router.post('/:taskId/pause', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    taskEngine.pauseTask(taskId);

    return res.json({
      success: true,
      message: '任务已暂停'
    });

  } catch (error) {
    logger.error('暂停任务失败', error);
    return res.status(400).json({
      success: false,
      error: { code: 'PAUSE_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 恢复任务
 * POST /api/v1/tasks-auto/:taskId/resume
 */
router.post('/:taskId/resume', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    taskEngine.resumeTask(taskId);

    return res.json({
      success: true,
      message: '任务已恢复'
    });

  } catch (error) {
    logger.error('恢复任务失败', error);
    return res.status(400).json({
      success: false,
      error: { code: 'RESUME_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 取消任务
 * DELETE /api/v1/tasks-auto/:taskId
 */
router.delete('/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    taskEngine.cancelTask(taskId);

    return res.json({
      success: true,
      message: '任务已取消'
    });

  } catch (error) {
    logger.error('取消任务失败', error);
    return res.status(400).json({
      success: false,
      error: { code: 'CANCEL_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取任务报告
 * GET /api/v1/tasks-auto/:taskId/report
 */
router.get('/:taskId/report', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const report = taskEngine.generateReport(taskId);

    return res.json({
      success: true,
      data: { report }
    });

  } catch (error) {
    logger.error('生成任务报告失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GENERATE_REPORT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取可用工具列表
 * GET /api/v1/tasks-auto/tools
 */
router.get('/tools', authMiddleware, (_req: Request, res: Response) => {
  try {
    const tools = toolRegistry.getAll();

    return res.json({
      success: true,
      data: {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }
    });

  } catch (error) {
    logger.error('获取工具列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_TOOLS_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
