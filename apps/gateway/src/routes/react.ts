/**
 * ReAct Agent API 路由
 *
 * 提供 ReAct 模式的 REST API 接口
 */

import { Router, Request, Response } from 'express';
import { ReActAgent, createReActAgent, ReActStep } from '../services/task-automation/ReActAgent';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('ReActRoute');
const router: Router = Router();

// 存储活跃的 ReAct 会话
const activeSessions: Map<string, ReActAgent> = new Map();

/**
 * 创建新的 ReAct 会话
 * POST /api/v1/react
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, config, context } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: '请提供查询内容' }
      });
    }

    logger.info(`创建 ReAct 会话: ${query}`);

    // 创建新的 Agent
    const agent = createReActAgent(config || {});
    const sessionId = `react_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    activeSessions.set(sessionId, agent);

    // 执行 ReAct
    const result = await agent.execute(query, context || {});

    // 清理会话
    activeSessions.delete(sessionId);

    return res.json({
      success: result.success,
      data: {
        sessionId,
        finalAnswer: result.finalAnswer,
        steps: result.steps.map((step: ReActStep) => ({
          type: step.type,
          content: step.content,
          toolName: step.toolName,
          toolParameters: step.toolParameters,
          timestamp: step.timestamp
        })),
        totalTokens: result.totalTokens,
        executionTime: result.executionTime
      },
      message: result.success ? '执行成功' : '执行失败'
    });

  } catch (error) {
    logger.error('ReAct 执行失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'REACT_EXECUTION_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 流式 ReAct 执行
 * POST /api/v1/react/stream
 */
router.post('/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, config, context } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: '请提供查询内容' }
      });
    }

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info(`创建流式 ReAct 会话: ${query}`);

    // 创建 Agent
    const agent = createReActAgent(config || {});
    const sessionId = `react_stream_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    activeSessions.set(sessionId, agent);

    // 发送会话 ID
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`);

    // 执行并流式返回结果
    // 注意：这里简化处理，实际应该实现真正的流式执行
    const result = await agent.execute(query, context || {});

    // 流式发送每一步
    for (const step of result.steps) {
      res.write(`data: ${JSON.stringify({
        type: 'step',
        step: {
          type: step.type,
          content: step.content,
          toolName: step.toolName,
          timestamp: step.timestamp
        }
      })}\n\n`);
    }

    // 发送最终结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        finalAnswer: result.finalAnswer,
        totalTokens: result.totalTokens,
        executionTime: result.executionTime
      }
    })}\n\n`);

    res.end();

    // 清理会话
    activeSessions.delete(sessionId);
    return;

  } catch (error) {
    logger.error('流式 ReAct 执行失败', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: (error as Error).message
    })}\n\n`);
    res.end();
    return;
  }
});

/**
 * 获取 ReAct 执行历史
 * GET /api/v1/react/:sessionId/history
 */
router.get('/:sessionId/history', authMiddleware, (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const agent = activeSessions.get(sessionId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: '会话不存在或已结束' }
      });
    }

    const history = agent.getHistory();

    return res.json({
      success: true,
      data: {
        sessionId,
        steps: history.map((step: ReActStep) => ({
          type: step.type,
          content: step.content,
          toolName: step.toolName,
          timestamp: step.timestamp
        }))
      }
    });

  } catch (error) {
    logger.error('获取 ReAct 历史失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_HISTORY_FAILED', message: (error as Error).message }
    });
  }
});

/**
 * 获取执行报告
 * GET /api/v1/react/:sessionId/report
 */
router.get('/:sessionId/report', authMiddleware, (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const agent = activeSessions.get(sessionId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: '会话不存在或已结束' }
      });
    }

    const report = agent.generateReport();

    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
    return;

  } catch (error) {
    logger.error('生成 ReAct 报告失败', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GENERATE_REPORT_FAILED', message: (error as Error).message }
    });
  }
});

export default router;
