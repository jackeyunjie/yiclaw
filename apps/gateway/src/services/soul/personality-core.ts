/**
 * 人格核心 - Personality Core
 * 
 * 管理AI员工的价值观、决策原则、行为边界等人格特质
 * 确保AI员工在不同场景下保持一致的"灵魂"
 */

import { createLogger } from '../../utils/logger';
import { PersonalityProfile } from './soul-injector';

const logger = createLogger('PersonalityCore');

/**
 * 人格记忆
 */
export interface PersonalityMemory {
  id: string;
  roleId: string;
  profile: PersonalityProfile;
  experiences: PersonalityExperience[];  // 人格相关的经验
  consistencyScore: number;              // 一致性得分(0-100)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 人格经验
 */
export interface PersonalityExperience {
  id: string;
  scenario: string;                      // 场景描述
  action: string;                        // 采取的行动
  aligned: boolean;                      // 是否符合人格
  reflection: string;                    // 反思
  timestamp: Date;
}

/**
 * 人格评估结果
 */
export interface PersonalityAssessment {
  roleId: string;
  consistencyScore: number;              // 一致性得分
  valueAlignment: Record<string, number>; // 价值观对齐度
  decisionQuality: number;               // 决策质量
  boundaryCompliance: number;            // 边界遵守率
  strengths: string[];
  violations: string[];                  // 违反人格的行为
  recommendations: string[];
}

/**
 * 人格核心管理器
 */
export class PersonalityCoreManager {
  private personalities: Map<string, PersonalityMemory> = new Map();

  /**
   * 创建人格记忆
   */
  createPersonalityMemory(
    roleId: string,
    profile: PersonalityProfile
  ): PersonalityMemory {
    logger.info(`创建人格记忆: ${roleId}`);

    const memory: PersonalityMemory = {
      id: `personality-${roleId}-${Date.now()}`,
      roleId,
      profile,
      experiences: [],
      consistencyScore: 100,  // 初始完美一致性
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.personalities.set(roleId, memory);
    return memory;
  }

  /**
   * 获取人格记忆
   */
  getPersonalityMemory(roleId: string): PersonalityMemory | null {
    return this.personalities.get(roleId) || null;
  }

  /**
   * 记录人格经验
   */
  recordPersonalityExperience(
    roleId: string,
    experience: Omit<PersonalityExperience, 'id' | 'timestamp'>
  ): void {
    const memory = this.personalities.get(roleId);
    if (!memory) {
      logger.warn(`人格记忆不存在: ${roleId}`);
      return;
    }

    const fullExperience: PersonalityExperience = {
      ...experience,
      id: `exp-${Date.now()}`,
      timestamp: new Date()
    };

    memory.experiences.push(fullExperience);
    memory.updatedAt = new Date();

    // 重新计算一致性得分
    memory.consistencyScore = this.calculateConsistencyScore(memory);

    logger.debug(`记录人格经验: ${roleId}, 一致性: ${memory.consistencyScore}`);
  }

  /**
   * 评估人格一致性
   */
  assessPersonality(roleId: string): PersonalityAssessment | null {
    const memory = this.personalities.get(roleId);
    if (!memory) {
      return null;
    }

    const { profile, experiences } = memory;

    // 计算价值观对齐度
    const valueAlignment = this.assessValueAlignment(profile, experiences);

    // 计算决策质量
    const decisionQuality = this.assessDecisionQuality(profile, experiences);

    // 计算边界遵守率
    const boundaryCompliance = this.assessBoundaryCompliance(profile, experiences);

    // 识别优势和违规
    const strengths = this.identifyStrengths(profile, experiences);
    const violations = this.identifyViolations(profile, experiences);

    // 生成建议
    const recommendations = this.generatePersonalityRecommendations(
      profile,
      valueAlignment,
      boundaryCompliance,
      violations
    );

    return {
      roleId,
      consistencyScore: memory.consistencyScore,
      valueAlignment,
      decisionQuality,
      boundaryCompliance,
      strengths,
      violations,
      recommendations
    };
  }

  /**
   * 检查行为是否符合人格
   */
  checkBehaviorAlignment(
    roleId: string,
    behavior: {
      action: string;
      decision: string;
      communication: string;
    }
  ): {
    aligned: boolean;
    score: number;
    issues: string[];
  } {
    const memory = this.personalities.get(roleId);
    if (!memory) {
      return { aligned: true, score: 100, issues: [] };
    }

    const { profile } = memory;
    const issues: string[] = [];
    let score = 100;

    // 检查价值观
    for (const value of profile.values) {
      if (!this.isBehaviorAlignedWithvalue(behavior, value)) {
        issues.push(`行为可能与价值观"${value}"不一致`);
        score -= 10;
      }
    }

    // 检查决策原则
    for (const principle of profile.decisionPrinciples) {
      if (!this.isDecisionAlignedWithPrinciple(behavior.decision, principle)) {
        issues.push(`决策可能违反原则"${principle}"`);
        score -= 15;
      }
    }

    // 检查行为边界
    for (const boundary of profile.boundaries) {
      if (this.violatesBoundary(behavior, boundary)) {
        issues.push(`行为违反边界"${boundary}"`);
        score -= 20;
      }
    }

    return {
      aligned: issues.length === 0,
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * 计算一致性得分
   */
  private calculateConsistencyScore(memory: PersonalityMemory): number {
    if (memory.experiences.length === 0) {
      return 100;
    }

    const alignedCount = memory.experiences.filter(exp => exp.aligned).length;
    return Math.round((alignedCount / memory.experiences.length) * 100);
  }

  /**
   * 评估价值观对齐度
   */
  private assessValueAlignment(
    profile: PersonalityProfile,
    experiences: PersonalityExperience[]
  ): Record<string, number> {
    const alignment: Record<string, number> = {};

    for (const value of profile.values) {
      const relevantExps = experiences.filter(exp =>
        this.isExperienceRelatedToValue(exp, value)
      );

      if (relevantExps.length === 0) {
        alignment[value] = 100;  // 无数据,默认完美
      } else {
        const alignedCount = relevantExps.filter(exp => exp.aligned).length;
        alignment[value] = Math.round((alignedCount / relevantExps.length) * 100);
      }
    }

    return alignment;
  }

  /**
   * 评估决策质量
   */
  private assessDecisionQuality(
    profile: PersonalityProfile,
    experiences: PersonalityExperience[]
  ): number {
    if (experiences.length === 0) return 100;

    const decisionExps = experiences.filter(exp =>
      exp.action.includes('决策') || exp.action.includes('决定')
    );

    if (decisionExps.length === 0) return 100;

    const alignedCount = decisionExps.filter(exp => exp.aligned).length;
    return Math.round((alignedCount / decisionExps.length) * 100);
  }

  /**
   * 评估边界遵守率
   */
  private assessBoundaryCompliance(
    profile: PersonalityProfile,
    experiences: PersonalityExperience[]
  ): number {
    if (experiences.length === 0) return 100;

    // 简化实现: 假设所有经验都涉及边界检查
    const compliantCount = experiences.filter(exp => exp.aligned).length;
    return Math.round((compliantCount / experiences.length) * 100);
  }

  /**
   * 识别优势
   */
  private identifyStrengths(
    profile: PersonalityProfile,
    experiences: PersonalityExperience[]
  ): string[] {
    const strengths: string[] = [];

    // 识别 consistently aligned values
    for (const value of profile.values) {
      const relevantExps = experiences.filter(exp =>
        this.isExperienceRelatedToValue(exp, value)
      );

      if (relevantExps.length >= 3) {
        const alignedCount = relevantExps.filter(exp => exp.aligned).length;
        if (alignedCount / relevantExps.length >= 0.9) {
          strengths.push(`价值观"${value}"高度一致`);
        }
      }
    }

    return strengths;
  }

  /**
   * 识别违规
   */
  private identifyViolations(
    profile: PersonalityProfile,
    experiences: PersonalityExperience[]
  ): string[] {
    const violations: string[] = [];

    const misalignedExps = experiences.filter(exp => !exp.aligned);
    
    for (const exp of misalignedExps) {
      violations.push(`场景"${exp.scenario}": ${exp.reflection}`);
    }

    return violations.slice(-5);  // 只返回最近5个
  }

  /**
   * 生成人格建议
   */
  private generatePersonalityRecommendations(
    profile: PersonalityProfile,
    valueAlignment: Record<string, number>,
    boundaryCompliance: number,
    violations: string[]
  ): string[] {
    const recommendations: string[] = [];

    // 检查价值观对齐
    for (const [value, score] of Object.entries(valueAlignment)) {
      if (score < 80) {
        recommendations.push(`加强价值观"${value}"的践行`);
      }
    }

    // 检查边界遵守
    if (boundaryCompliance < 90) {
      recommendations.push('严格遵守行为边界,避免违规');
    }

    // 如果有违规,建议复盘
    if (violations.length > 0) {
      recommendations.push(`对${violations.length}次违规行为进行复盘反思`);
    }

    // 通用建议
    recommendations.push('定期进行人格一致性自检');
    recommendations.push('在复杂场景中有意识地遵循决策原则');

    return recommendations;
  }

  /**
   * 检查行为是否与价值观一致
   */
  private isBehaviorAlignedWithvalue(
    behavior: { action: string; decision: string; communication: string },
    value: string
  ): boolean {
    // 简化实现: 关键词匹配
    const valueKeywords: Record<string, string[]> = {
      '数据驱动': ['数据', '分析', '统计', '量化'],
      '客户至上': ['客户', '用户', '需求', '满意度'],
      '客观分析': ['客观', '事实', '证据', '中立']
    };

    const keywords = valueKeywords[value] || [];
    const combinedText = `${behavior.action} ${behavior.decision} ${behavior.communication}`;

    return keywords.some(keyword => combinedText.includes(keyword));
  }

  /**
   * 检查决策是否与原则一致
   */
  private isDecisionAlignedWithPrinciple(decision: string, principle: string): boolean {
    // 简化实现: 原则关键词检查
    const principleKeywords: Record<string, string[]> = {
      '先分析后建议': ['分析', '评估', '调研'],
      '客户满意度优先': ['满意', '体验', '反馈'],
      '数据质量第一': ['验证', '清洗', '质量']
    };

    const keywords = principleKeywords[principle] || [];
    return keywords.some(keyword => decision.includes(keyword));
  }

  /**
   * 检查是否违反边界
   */
  private violatesBoundary(
    behavior: { action: string; decision: string; communication: string },
    boundary: string
  ): boolean {
    // 简化实现: 检查边界关键词是否被违反
    const violationKeywords: Record<string, string[]> = {
      '不做无根据的预测': ['预测', '预计', '将会'],
      '不隐瞒风险': ['风险', '问题', '隐患'],
      '不过度承诺': ['保证', '一定', '绝对']
    };

    const keywords = violationKeywords[boundary] || [];
    const combinedText = `${behavior.action} ${behavior.decision} ${behavior.communication}`;

    // 如果包含关键词但没有相应的谨慎表达,可能违反边界
    return keywords.some(keyword => 
      combinedText.includes(keyword) && 
      !combinedText.includes('可能') && 
      !combinedText.includes('需要验证')
    );
  }

  /**
   * 检查经验是否与价值观相关
   */
  private isExperienceRelatedToValue(experience: PersonalityExperience, value: string): boolean {
    const combinedText = `${experience.scenario} ${experience.action}`;
    return combinedText.includes(value);
  }

  /**
   * 更新人格配置
   */
  updatePersonalityProfile(
    roleId: string,
    updates: Partial<PersonalityProfile>
  ): PersonalityMemory | null {
    const memory = this.personalities.get(roleId);
    if (!memory) {
      return null;
    }

    memory.profile = { ...memory.profile, ...updates };
    memory.updatedAt = new Date();

    logger.info(`更新人格配置: ${roleId}`);
    return memory;
  }

  /**
   * 获取所有人格记忆
   */
  getAllPersonalities(): PersonalityMemory[] {
    return Array.from(this.personalities.values());
  }
}

// 导出单例
export const personalityCore = new PersonalityCoreManager();
