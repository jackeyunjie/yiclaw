/**
 * 多 Agent 协作 API 路由
 *
 * 提供 Agent 管理和协作任务的 REST API 接口
 */

import { Router, Request, Response } from 'express';
import { agentRegistry, AgentRole, PRESET_ROLES } from '../services/multi-agent/AgentRegistry';
import { multiAgentEngine } from '../services/multi-agent/MultiAgentEngine';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('AgentsRoute');
const router: Router = Router();

/**
 * 获取所有 Agent
 * GET /api/v1/agents
 */
router.get('/', authMiddleware, (_req: Request, res: Response) => {
  try {
    const agents = agentRegistry.getAllAgents();
    const instances = agentRegistry.getAllInstances();

    return res.json({
      success: true,
      data: {
        agents: agents.map(agent => {
          const instance = instances.find(i => i.agentId === agent.agentId);
          return {
            agentId: agent.agentId,
            name: agent.name,
            role: agent.role,
            description: agent.description,
            avatar: agent.avatar,
            isActive: agent.isActive,
            status: instance?.status || 'offline',
            completedTasks: instance?.completedTasks || 0,
            failedTasks: instance?.failedTasks || 0,
            currentTask: instance?.currentTask,
            lastActiveAt: instance?.lastActiveAt
          };
        })
      }
    });
  } catch (error) {
    logger.error('获取 Agent 列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_AGENTS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取预设角色
 * GET /api/v1/agents/roles
 */
router.get('/roles', authMiddleware, (_req: Request, res: Response) => {
  try {
    const roles = Object.entries(PRESET_ROLES).map(([role, config]) => ({
      role,
      name: config.name,
      description: config.description,
      capabilities: config.capabilities
    }));

    return res.json({
      success: true,
      data: { roles }
    });
  } catch (error) {
    logger.error('获取预设角色失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_ROLES_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建新 Agent
 * POST /api/v1/agents
 */
router.post('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const { name, role, description, systemPrompt, model, temperature, capabilities, metadata } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: name, role' }
      });
    }

    // 验证角色
    if (!PRESET_ROLES[role as AgentRole]) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROLE', message: '无效的角色类型' }
      });
    }

    // 从预设创建
    const agent = agentRegistry.createFromPreset(role as AgentRole, {
      name,
      description,
      systemPrompt,
      model,
      temperature,
      capabilities,
      metadata
    });

    logger.info(`创建 Agent: ${agent.name} (${agent.agentId})`);

    return res.status(201).json({
      success: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role,
        description: agent.description,
        isActive: agent.isActive,
        createdAt: agent.createdAt
      },
      message: 'Agent 创建成功'
    });
  } catch (error) {
    logger.error('创建 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取单个 Agent
 * GET /api/v1/agents/:agentId
 */
router.get('/:agentId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = agentRegistry.getAgent(agentId);
    const instance = agentRegistry.getInstance(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' }
      });
    }

    return res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role,
        description: agent.description,
        avatar: agent.avatar,
        capabilities: agent.capabilities,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        temperature: agent.temperature,
        maxIterations: agent.maxIterations,
        isActive: agent.isActive,
        metadata: agent.metadata,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        status: instance?.status || 'offline',
        completedTasks: instance?.completedTasks || 0,
        failedTasks: instance?.failedTasks || 0,
        currentTask: instance?.currentTask,
        lastActiveAt: instance?.lastActiveAt
      }
    });
  } catch (error) {
    logger.error('获取 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 更新 Agent
 * PUT /api/v1/agents/:agentId
 */
router.put('/:agentId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    const agent = agentRegistry.updateAgent(agentId, updates);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' }
      });
    }

    logger.info(`更新 Agent: ${agent.name}`);

    return res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role,
        isActive: agent.isActive,
        updatedAt: agent.updatedAt
      },
      message: 'Agent 更新成功'
    });
  } catch (error) {
    logger.error('更新 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 删除 Agent
 * DELETE /api/v1/agents/:agentId
 */
router.delete('/:agentId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const success = agentRegistry.deleteAgent(agentId);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Agent 不存在或是预设 Agent，无法删除' }
      });
    }

    logger.info(`删除 Agent: ${agentId}`);

    return res.json({
      success: true,
      message: 'Agent 删除成功'
    });
  } catch (error) {
    logger.error('删除 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 启用 Agent
 * POST /api/v1/agents/:agentId/enable
 */
router.post('/:agentId/enable', authMiddleware, (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = agentRegistry.updateAgent(agentId, { isActive: true });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' }
      });
    }

    return res.json({
      success: true,
      data: { agentId, isActive: true },
      message: 'Agent 已启用'
    });
  } catch (error) {
    logger.error('启用 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'ENABLE_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 禁用 Agent
 * POST /api/v1/agents/:agentId/disable
 */
router.post('/:agentId/disable', authMiddleware, (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = agentRegistry.updateAgent(agentId, { isActive: false });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' }
      });
    }

    return res.json({
      success: true,
      data: { agentId, isActive: false },
      message: 'Agent 已禁用'
    });
  } catch (error) {
    logger.error('禁用 Agent 失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DISABLE_AGENT_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 创建协作任务
 * POST /api/v1/agents/collaborate
 */
router.post('/collaborate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, options } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '缺少必填字段: title, description' }
      });
    }

    logger.info(`创建协作任务: ${title}`);

    const task = await multiAgentEngine.createCollaboration(title, description, options || {});

    return res.status(201).json({
      success: true,
      data: {
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        orchestratorAgentId: task.orchestratorAgentId,
        involvedAgents: task.involvedAgents,
        subTasks: task.subTasks.map(st => ({
          assignmentId: st.assignmentId,
          title: st.title,
          assignedTo: st.assignedToName,
          status: st.status
        })),
        createdAt: task.createdAt
      },
      message: '协作任务已创建并开始执行'
    });
  } catch (error) {
    logger.error('创建协作任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_COLLABORATION_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取所有协作任务
 * GET /api/v1/agents/collaborate/tasks
 */
router.get('/collaborate/tasks', authMiddleware, (_req: Request, res: Response) => {
  try {
    const tasks = multiAgentEngine.getAllTasks();

    return res.json({
      success: true,
      data: {
        tasks: tasks.map(task => ({
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          status: task.status,
          involvedAgents: task.involvedAgents,
          subTasksCount: task.subTasks.length,
          completedSubTasks: task.subTasks.filter(st => st.status === 'completed').length,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          completedAt: task.completedAt
        }))
      }
    });
  } catch (error) {
    logger.error('获取协作任务列表失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'LIST_TASKS_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取单个协作任务
 * GET /api/v1/agents/collaborate/tasks/:taskId
 */
router.get('/collaborate/tasks/:taskId', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = multiAgentEngine.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '协作任务不存在' }
      });
    }

    return res.json({
      success: true,
      data: {
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        orchestratorAgentId: task.orchestratorAgentId,
        involvedAgents: task.involvedAgents,
        subTasks: task.subTasks.map(st => ({
          assignmentId: st.assignmentId,
          subTaskId: st.subTaskId,
          title: st.title,
          description: st.description,
          assignedTo: st.assignedTo,
          assignedToName: st.assignedToName,
          status: st.status,
          result: st.result,
          error: st.error,
          startedAt: st.startedAt,
          completedAt: st.completedAt
        })),
        finalResult: task.finalResult,
        executionLog: task.executionLog,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt
      }
    });
  } catch (error) {
    logger.error('获取协作任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 取消协作任务
 * POST /api/v1/agents/collaborate/tasks/:taskId/cancel
 */
router.post('/collaborate/tasks/:taskId/cancel', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const success = multiAgentEngine.cancelTask(taskId);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANCEL_FAILED', message: '任务不存在或已完成/失败' }
      });
    }

    return res.json({
      success: true,
      message: '协作任务已取消'
    });
  } catch (error) {
    logger.error('取消协作任务失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'CANCEL_TASK_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取协作任务报告
 * GET /api/v1/agents/collaborate/tasks/:taskId/report
 */
router.get('/collaborate/tasks/:taskId/report', authMiddleware, (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const report = multiAgentEngine.generateReport(taskId);

    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
    return;
  } catch (error) {
    logger.error('生成报告失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GENERATE_REPORT_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
