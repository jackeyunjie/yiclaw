/**
 * 训练反馈循环 - Training Feedback Loop
 * 
 * 评估AI员工训练效果,识别能力缺口,提供优化建议
 */

import { createLogger } from '../../utils/logger';
import { TrainingScenario, TrainingResult } from './scenario-builder';
import { SkillLevel, CompetencyGap } from '../soul/competency-model';

const logger = createLogger('TrainingFeedbackLoop');

/**
 * 能力缺口分析
 */
export interface CompetencyGapAnalysis {
  roleId: string;
  gaps: CompetencyGap[];
  overallReadiness: number;      // 整体就绪度(0-100)
  recommendedActions: string[];
  estimatedTrainingTime: number; // 预计训练时间(分钟)
}

/**
 * 训练优化建议
 */
export interface TrainingOptimization {
  focusAreas: string[];          // 重点改进领域
  practiceScenarios: string[];   // 推荐练习场景
  soulAdjustments: string[];     // 灵魂配置调整建议
  toolRecommendations: string[]; // 工具使用建议
}

/**
 * 训练反馈循环管理器
 */
export class TrainingFeedbackLoop {
  private trainingHistory: Map<string, TrainingResult[]> = new Map();

  /**
   * 评估训练表现
   */
  evaluate(agentId: string, scenario: TrainingScenario, result: TrainingResult): void {
    logger.info(`评估训练表现: ${agentId}, 场景: ${scenario.title}, 得分: ${result.score}`);

    // 记录训练历史
    const history = this.trainingHistory.get(agentId) || [];
    history.push(result);
    this.trainingHistory.set(agentId, history);

    // 评估是否通过
    if (result.passed) {
      logger.info(`✓ 训练通过: ${scenario.title}`);
    } else {
      logger.warn(`✗ 训练未通过: ${scenario.title}, 需要 ${scenario.evaluationCriteria.passingScore - result.score} 分`);
    }
  }

  /**
   * 识别能力缺口
   */
  identifyGaps(
    roleId: string,
    results: TrainingResult[]
  ): CompetencyGapAnalysis {
    logger.info(`识别能力缺口: ${roleId}, 训练次数: ${results.length}`);

    const gaps: CompetencyGap[] = [];
    let totalScore = 0;

    // 分析每个场景的表现
    for (const result of results) {
      totalScore += result.score;

      // 如果未通过或分数低于优秀线,识别缺口
      if (result.score < 85) {
        // 分析各维度表现
        for (const [criterion, score] of Object.entries(result.breakdown)) {
          if (score < 70) {
            gaps.push({
              skillId: `${result.scenarioId}-${criterion}`,
              skillName: `${result.scenarioId}: ${criterion}`,
              currentLevel: this.scoreToLevel(score),
              requiredLevel: SkillLevel.ADVANCED,
              gap: SkillLevel.ADVANCED - this.scoreToLevel(score),
              improvementSuggestions: this.generateGapSuggestions(criterion, score)
            });
          }
        }
      }
    }

    // 计算整体就绪度
    const overallReadiness = results.length > 0 
      ? Math.round(totalScore / results.length)
      : 0;

    // 生成推荐行动
    const recommendedActions = this.generateRecommendedActions(gaps, overallReadiness);

    // 估算训练时间
    const estimatedTrainingTime = this.estimateTrainingTime(gaps);

    return {
      roleId,
      gaps,
      overallReadiness,
      recommendedActions,
      estimatedTrainingTime
    };
  }

  /**
   * 优化训练配置
   */
  async optimize(
    roleId: string,
    gapAnalysis: CompetencyGapAnalysis
  ): Promise<TrainingOptimization> {
    logger.info(`生成优化建议: ${roleId}`);

    const focusAreas = gapAnalysis.gaps
      .map(gap => gap.skillName)
      .slice(0, 3);  // 最多3个重点

    const practiceScenarios = this.recommendPracticeScenarios(roleId, gapAnalysis.gaps);

    const soulAdjustments = this.generateSoulAdjustments(gapAnalysis);

    const toolRecommendations = this.recommendTools(roleId, gapAnalysis);

    return {
      focusAreas,
      practiceScenarios,
      soulAdjustments,
      toolRecommendations
    };
  }

  /**
   * 获取训练历史
   */
  getTrainingHistory(agentId: string): TrainingResult[] {
    return this.trainingHistory.get(agentId) || [];
  }

  /**
   * 计算训练进度
   */
  calculateTrainingProgress(
    roleId: string,
    requiredScenarios: string[],
    results: TrainingResult[]
  ): {
    completed: number;
    total: number;
    percentage: number;
    averageScore: number;
    passedCount: number;
  } {
    const completed = results.length;
    const total = requiredScenarios.length;
    const percentage = Math.round((completed / total) * 100);
    
    const averageScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    const passedCount = results.filter(r => r.passed).length;

    return {
      completed,
      total,
      percentage,
      averageScore,
      passedCount
    };
  }

  /**
   * 将分数转换为技能等级
   */
  private scoreToLevel(score: number): SkillLevel {
    if (score >= 90) return SkillLevel.EXPERT;
    if (score >= 75) return SkillLevel.ADVANCED;
    if (score >= 60) return SkillLevel.INTERMEDIATE;
    return SkillLevel.BEGINNER;
  }

  /**
   * 生成缺口改进建议
   */
  private generateGapSuggestions(criterion: string, score: number): string[] {
    const suggestions: string[] = [];

    suggestions.push(`加强"${criterion}"维度的训练 (当前得分: ${score})`);

    if (score < 50) {
      suggestions.push('建议从基础概念开始重新学习');
      suggestions.push('完成至少3个相关练习场景');
    } else if (score < 70) {
      suggestions.push('针对薄弱环节进行专项训练');
      suggestions.push('参考最佳实践案例');
    } else {
      suggestions.push('继续练习以达到优秀水平');
    }

    return suggestions;
  }

  /**
   * 生成推荐行动
   */
  private generateRecommendedActions(
    gaps: CompetencyGap[],
    overallReadiness: number
  ): string[] {
    const actions: string[] = [];

    if (overallReadiness < 60) {
      actions.push('整体能力不足,建议重新进行灵魂注入');
      actions.push('重点关注第一性原理和决策框架的理解');
    } else if (overallReadiness < 75) {
      actions.push('基础能力具备,需要加强实战训练');
      actions.push('优先改进得分最低的3个维度');
    } else if (overallReadiness < 85) {
      actions.push('能力良好,继续优化薄弱项');
      actions.push('尝试更高难度的场景');
    } else {
      actions.push('能力优秀,可以投入实际使用');
      actions.push('持续学习,保持能力领先');
    }

    // 针对具体缺口的建议
    if (gaps.length > 0) {
      actions.push(`发现 ${gaps.length} 个能力缺口,建议针对性训练`);
    }

    return actions;
  }

  /**
   * 估算训练时间
   */
  private estimateTrainingTime(gaps: CompetencyGap[]): number {
    // 每个缺口平均需要5分钟训练
    return gaps.length * 5;
  }

  /**
   * 推荐练习场景
   */
  private recommendPracticeScenarios(
    roleId: string,
    gaps: CompetencyGap[]
  ): string[] {
    // 根据缺口推荐相关场景
    // 简化实现: 返回包含缺口关键词的场景
    const recommended: string[] = [];

    for (const gap of gaps) {
      // 从gap名称提取关键词
      const keywords = gap.skillName.toLowerCase().split(' ');
      
      // 这里应该查询场景库,简化处理
      recommended.push(`与"${gap.skillName}"相关的训练场景`);
    }

    return [...new Set(recommended)].slice(0, 5);
  }

  /**
   * 生成灵魂配置调整建议
   */
  private generateSoulAdjustments(gapAnalysis: CompetencyGapAnalysis): string[] {
    const adjustments: string[] = [];

    if (gapAnalysis.gaps.length > 3) {
      adjustments.push('考虑增强灵魂模板中的最佳实践部分');
    }

    if (gapAnalysis.overallReadiness < 70) {
      adjustments.push('建议在灵魂注入时增加更多决策框架');
      adjustments.push('强化第一性原理的理解和应用');
    }

    return adjustments;
  }

  /**
   * 推荐工具
   */
  private recommendTools(
    roleId: string,
    gapAnalysis: CompetencyGapAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // 根据角色和缺口推荐工具
    if (roleId === 'business-consultant') {
      recommendations.push('http_request: 用于市场调研和数据收集');
      recommendations.push('parse_excel: 用于分析财务和市场数据');
    } else if (roleId === 'data-analyst') {
      recommendations.push('sql_query: 用于复杂数据查询');
      recommendations.push('generate_report: 用于生成分析报告');
    }

    return recommendations;
  }

  /**
   * 清除训练历史
   */
  clearHistory(agentId: string): void {
    this.trainingHistory.delete(agentId);
    logger.info(`清除训练历史: ${agentId}`);
  }

  /**
   * 获取所有训练历史
   */
  getAllHistory(): Map<string, TrainingResult[]> {
    return this.trainingHistory;
  }
}

// 导出单例
export const trainingFeedback = new TrainingFeedbackLoop();
