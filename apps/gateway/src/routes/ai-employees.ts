/**
 * AI员工管理路由
 * 
 * 提供灵魂注入、训练、评估等核心功能的API接口
 */

import { Router } from 'express';
import { soulInjector } from '../services/soul/soul-injector';
import { competencyModel } from '../services/soul/competency-model';
import { personalityCore } from '../services/soul/personality-core';
import { scenarioBuilder } from '../services/training/scenario-builder';
import { trainingFeedback } from '../services/training/feedback-loop';
import { practiceExtractor } from '../services/training/practice-extractor';
import { agentRegistry } from '../services/multi-agent/AgentRegistry';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('AIEmployeesRouter');

/**
 * POST /api/ai-employees/:roleId/inject
 * 
 * 灵魂注入: 为指定角色注入灵魂,创建AI员工
 */
router.post('/:roleId/inject', async (req, res) => {
  try {
    const { roleId } = req.params;
    const { employeeName } = req.body;

    logger.info(`开始灵魂注入: ${roleId}`);

    // 1. 注入灵魂
    const agentConfig = await soulInjector.injectRole(roleId);

    // 2. 创建人格记忆
    const template = soulInjector.getTemplate(roleId);
    if (template?.personality) {
      personalityCore.createPersonalityMemory(roleId, template.personality);
    }

    // 3. 注册到Agent系统
    const agent = agentRegistry.registerAgent({
      ...agentConfig,
      name: employeeName || agentConfig.name
    });

    logger.info(`灵魂注入完成: ${agent.name}`);

    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        roleId,
        soulInjected: true,
        systemPromptLength: agent.systemPrompt.length,
        tools: agent.capabilities.tools,
        createdAt: agent.createdAt
      }
    });
  } catch (error: any) {
    logger.error('灵魂注入失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-employees/:agentId/train
 * 
 * 启动训练: 为AI员工执行场景训练
 */
router.post('/:agentId/train', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { scenarioId } = req.body;

    logger.info(`启动训练: ${agentId}, 场景: ${scenarioId}`);

    // 获取场景
    const scenario = scenarioBuilder.getScenario(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: `场景不存在: ${scenarioId}`
      });
    }

    // TODO: 实际训练需要调用AI执行场景
    // 这里模拟训练结果
    const result = scenarioBuilder.evaluateTraining(scenario, [
      '使用结构化框架分析',
      '提供数据支撑',
      '给出明确建议'
    ]);

    // 记录训练结果
    trainingFeedback.evaluate(agentId, scenario, result);

    logger.info(`训练完成: ${scenarioId}, 得分: ${result.score}`);

    res.json({
      success: true,
      data: {
        agentId,
        scenarioId,
        score: result.score,
        passed: result.passed,
        breakdown: result.breakdown,
        feedback: result.feedback,
        duration: result.duration
      }
    });
  } catch (error: any) {
    logger.error('训练失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-employees/:agentId/status
 * 
 * 获取AI员工状态和训练进度
 */
router.get('/:agentId/status', (req, res) => {
  try {
    const { agentId } = req.params;

    // 获取Agent信息
    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'AI员工不存在'
      });
    }

    // 获取训练历史
    const history = trainingFeedback.getTrainingHistory(agentId);

    // 计算训练进度
    const roleId = (agent.metadata as any)?.roleId || '';
    const scenarios = scenarioBuilder.getScenariosByRole(roleId);
    const progress = trainingFeedback.calculateTrainingProgress(
      roleId,
      scenarios.map(s => s.id),
      history
    );

    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        roleId: (agent.metadata as any)?.roleId,
        trainingStatus: progress.percentage === 100 ? 'completed' : 'in_progress',
        trainingProgress: progress,
        totalTrainingTime: history.length * 8, // 估算
        lastTrainedAt: history.length > 0 ? history[history.length - 1].completedAt : null
      }
    });
  } catch (error: any) {
    logger.error('获取状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-employees/:agentId/report
 * 
 * 获取AI员工能力报告
 */
router.get('/:agentId/report', async (req, res) => {
  try {
    const { agentId } = req.params;

    // 获取训练历史
    const history = trainingFeedback.getTrainingHistory(agentId);
    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: '暂无训练记录'
      });
    }

    // 获取角色信息
    const agent = agentRegistry.getAgent(agentId);
    const roleId = (agent?.metadata as any)?.roleId || '';

    // 识别能力缺口
    const gapAnalysis = trainingFeedback.identifyGaps(roleId, history);

    // 获取能力模型
    const competencyTree = competencyModel.getCompetencyTree(roleId);

    // 人格评估
    const personalityAssessment = personalityCore.assessPersonality(roleId);

    res.json({
      success: true,
      data: {
        agentId,
        roleId,
        overallScore: gapAnalysis.overallReadiness,
        competencyGaps: gapAnalysis.gaps,
        strengths: personalityAssessment?.strengths || [],
        weaknesses: [],
        recommendations: gapAnalysis.recommendedActions,
        personalityConsistency: personalityAssessment?.consistencyScore,
        trainingCount: history.length,
        assessedAt: new Date()
      }
    });
  } catch (error: any) {
    logger.error('获取报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-employees/templates
 * 
 * 获取所有可用的灵魂模板
 */
router.get('/templates', (req, res) => {
  try {
    const templates = soulInjector.getAllTemplates();

    res.json({
      success: true,
      data: templates.map(t => ({
        roleId: t.roleId,
        roleName: t.roleName,
        mission: t.mission,
        firstPrinciplesCount: t.firstPrinciples.length,
        bestPracticesCount: t.bestPractices.length,
        requiredTools: t.requiredTools
      }))
    });
  } catch (error: any) {
    logger.error('获取模板失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-employees/scenarios/:roleId
 * 
 * 获取指定角色的训练场景
 */
router.get('/scenarios/:roleId', (req, res) => {
  try {
    const { roleId } = req.params;
    const scenarios = scenarioBuilder.getScenariosByRole(roleId);

    res.json({
      success: true,
      data: scenarios.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        difficulty: s.difficulty,
        estimatedDuration: s.estimatedDuration,
        tags: s.tags
      }))
    });
  } catch (error: any) {
    logger.error('获取场景失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-employees/best-practices/:domain
 * 
 * 获取指定领域的最佳实践
 */
router.get('/best-practices/:domain', (req, res) => {
  try {
    const { domain } = req.params;
    const practices = practiceExtractor.extract(domain);

    res.json({
      success: true,
      data: practices,
      total: practices.length
    });
  } catch (error: any) {
    logger.error('获取最佳实践失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-employees/:agentId/optimize
 * 
 * 优化AI员工: 根据训练结果生成优化建议
 */
router.post('/:agentId/optimize', async (req, res) => {
  try {
    const { agentId } = req.params;

    // 获取训练历史
    const history = trainingFeedback.getTrainingHistory(agentId);
    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: '暂无训练记录,无法优化'
      });
    }

    // 获取角色信息
    const agent = agentRegistry.getAgent(agentId);
    const roleId = (agent?.metadata as any)?.roleId || '';

    // 识别能力缺口
    const gapAnalysis = trainingFeedback.identifyGaps(roleId, history);

    // 生成优化建议
    const optimization = await trainingFeedback.optimize(roleId, gapAnalysis);

    res.json({
      success: true,
      data: {
        agentId,
        gapAnalysis: {
          overallReadiness: gapAnalysis.overallReadiness,
          gapsCount: gapAnalysis.gaps.length,
          estimatedTrainingTime: gapAnalysis.estimatedTrainingTime
        },
        optimization
      }
    });
  } catch (error: any) {
    logger.error('优化失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
