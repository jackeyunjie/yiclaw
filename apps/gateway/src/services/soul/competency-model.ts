/**
 * 能力模型 - Competency Model
 * 
 * 定义AI员工的专业技能图谱,包括核心技能、工具掌握、场景应用等
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger('CompetencyModel');

/**
 * 技能等级
 */
export enum SkillLevel {
  BEGINNER = 1,        // 初学者: 了解基本概念
  INTERMEDIATE = 2,    // 中级: 可以独立完成常规任务
  ADVANCED = 3,        // 高级: 可以处理复杂场景
  EXPERT = 4           // 专家: 可以指导和优化他人
}

/**
 * 技能定义
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;              // 技能分类
  level: SkillLevel;             // 当前等级
  maxLevel: SkillLevel;          // 最高等级
  prerequisites?: string[];      // 前置技能ID
  relatedTools?: string[];       // 相关工具
}

/**
 * 能力树
 */
export interface CompetencyTree {
  domain: string;                // 领域: 如"商业咨询"
  roleId: string;                // 关联角色
  coreSkills: Skill[];           // 核心技能
  tools: string[];               // 需要掌握的工具
  scenarios: string[];           // 典型场景
  evaluation: EvaluationRubric;  // 评估标准
}

/**
 * 评估标准
 */
export interface EvaluationRubric {
  criteria: EvaluationCriterion[];
  passingScore: number;          // 及格分数(0-100)
  excellentScore: number;        // 优秀分数(0-100)
}

/**
 * 评估维度
 */
export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;                // 权重(0-1)
  indicators: string[];          // 评估指标
}

/**
 * 能力缺口
 */
export interface CompetencyGap {
  skillId: string;
  skillName: string;
  currentLevel: SkillLevel;
  requiredLevel: SkillLevel;
  gap: number;
  improvementSuggestions: string[];
}

/**
 * 能力报告
 */
export interface CompetencyReport {
  roleId: string;
  roleName: string;
  overallScore: number;          // 总体得分(0-100)
  skillScores: Record<string, number>;  // 各技能得分
  gaps: CompetencyGap[];         // 能力缺口
  strengths: string[];           // 优势
  weaknesses: string[];          // 待改进
  recommendations: string[];     // 改进建议
  assessedAt: Date;
}

/**
 * 能力模型管理器
 */
export class CompetencyModelManager {
  private competencyTrees: Map<string, CompetencyTree> = new Map();

  constructor() {
    this.initializeDefaultCompetencies();
  }

  /**
   * 初始化默认能力模型
   */
  private initializeDefaultCompetencies(): void {
    // 商业顾问能力模型
    this.competencyTrees.set('business-consultant', {
      domain: 'business-consulting',
      roleId: 'business-consultant',
      coreSkills: [
        {
          id: 'skill-market-analysis',
          name: '市场分析',
          description: '分析市场规模、趋势、竞争格局和客户需求',
          category: 'analysis',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['http_request', 'parse_excel']
        },
        {
          id: 'skill-business-model',
          name: '商业模式设计',
          description: '设计和优化商业模式,使用商业模式画布等工具',
          category: 'strategy',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['generate_report']
        },
        {
          id: 'skill-competitive-analysis',
          name: '竞品分析',
          description: '系统分析竞争对手的优势劣势和战略动向',
          category: 'analysis',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['http_request', 'generate_report']
        },
        {
          id: 'skill-financial-analysis',
          name: '财务分析',
          description: '分析财务报表、计算关键指标、评估投资价值',
          category: 'analysis',
          level: SkillLevel.BEGINNER,
          maxLevel: SkillLevel.EXPERT,
          prerequisites: ['skill-market-analysis'],
          relatedTools: ['parse_excel', 'sql_query']
        }
      ],
      tools: ['http_request', 'parse_excel', 'generate_report', 'sql_query'],
      scenarios: ['market-research', 'business-model-analysis', 'competitive-intelligence'],
      evaluation: {
        criteria: [
          {
            id: 'criterion-analytical-thinking',
            name: '分析思维',
            description: '能否系统化分析问题,识别关键因素',
            weight: 0.3,
            indicators: ['使用结构化框架', '考虑多维度因素', '识别关键驱动因素']
          },
          {
            id: 'decision-quality',
            name: '决策质量',
            description: '建议是否基于数据,是否可执行',
            weight: 0.4,
            indicators: ['数据支撑充分', '考虑风险因素', '提供实施路径']
          },
          {
            id: 'criterion-communication',
            name: '沟通能力',
            description: '能否清晰表达复杂概念',
            weight: 0.3,
            indicators: ['逻辑清晰', '用词准确', '图表辅助']
          }
        ],
        passingScore: 70,
        excellentScore: 90
      }
    });

    // 客户成功经理能力模型
    this.competencyTrees.set('customer-success', {
      domain: 'customer-success',
      roleId: 'customer-success',
      coreSkills: [
        {
          id: 'skill-need-analysis',
          name: '需求分析',
          description: '快速理解客户真实需求和痛点',
          category: 'communication',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['send_message']
        },
        {
          id: 'skill-solution-design',
          name: '方案设计',
          description: '根据客户需求设计个性化解决方案',
          category: 'problem-solving',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['generate_excel', 'parse_word']
        },
        {
          id: 'skill-relationship-management',
          name: '关系维护',
          description: '建立和维护长期客户关系',
          category: 'communication',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['send_message']
        }
      ],
      tools: ['send_message', 'parse_word', 'generate_excel', 'file_read'],
      scenarios: ['customer-onboarding', 'issue-resolution', 'relationship-check-in'],
      evaluation: {
        criteria: [
          {
            id: 'criterion-empathy',
            name: '共情能力',
            description: '能否理解客户情绪和真实需求',
            weight: 0.3,
            indicators: ['主动倾听', '确认理解', '情绪管理']
          },
          {
            id: 'criterion-response-speed',
            name: '响应速度',
            description: '是否快速响应客户问题',
            weight: 0.3,
            indicators: ['5分钟内响应', '30分钟内给方案', '持续跟进']
          },
          {
            id: 'criterion-problem-resolution',
            name: '问题解决',
            description: '能否彻底解决客户问题',
            weight: 0.4,
            indicators: ['一次性解决率', '客户满意度', '跟进闭环']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      }
    });

    // 数据分析师能力模型
    this.competencyTrees.set('data-analyst', {
      domain: 'data-analysis',
      roleId: 'data-analyst',
      coreSkills: [
        {
          id: 'skill-data-cleaning',
          name: '数据清洗',
          description: '处理和清理原始数据,确保数据质量',
          category: 'technical',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['parse_excel', 'csv_to_json']
        },
        {
          id: 'skill-statistical-analysis',
          name: '统计分析',
          description: '运用统计方法分析数据,发现规律',
          category: 'analysis',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          prerequisites: ['skill-data-cleaning'],
          relatedTools: ['sql_query']
        },
        {
          id: 'skill-visualization',
          name: '可视化报告',
          description: '用图表和报告清晰呈现分析结果',
          category: 'communication',
          level: SkillLevel.INTERMEDIATE,
          maxLevel: SkillLevel.EXPERT,
          relatedTools: ['generate_report']
        }
      ],
      tools: ['parse_excel', 'sql_query', 'generate_report', 'csv_to_json'],
      scenarios: ['sales-analysis', 'user-behavior-analysis', 'performance-tracking'],
      evaluation: {
        criteria: [
          {
            id: 'criterion-data-quality',
            name: '数据质量',
            description: '分析前的数据验证和清洗是否充分',
            weight: 0.3,
            indicators: ['完整性检查', '异常值处理', '一致性验证']
          },
          {
            id: 'criterion-analytical-rigor',
            name: '分析严谨性',
            description: '分析方法是否恰当,结论是否有支撑',
            weight: 0.4,
            indicators: ['方法选择合理', '统计显著性', '避免因果混淆']
          },
          {
            id: 'criterion-insight-clarity',
            name: '洞察清晰度',
            description: '能否清晰传达关键发现和建议',
            weight: 0.3,
            indicators: ['关键发现突出', '图表恰当', '行动建议明确']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      }
    });

    logger.info(`初始化 ${this.competencyTrees.size} 个能力模型`);
  }

  /**
   * 获取角色的能力树
   */
  getCompetencyTree(roleId: string): CompetencyTree | null {
    return this.competencyTrees.get(roleId) || null;
  }

  /**
   * 评估角色能力
   */
  async evaluateCompetency(
    roleId: string,
    skillScores: Record<string, number>  // skillId -> score (0-100)
  ): Promise<CompetencyReport> {
    const tree = this.competencyTrees.get(roleId);
    if (!tree) {
      throw new Error(`未找到能力模型: ${roleId}`);
    }

    // 计算总体得分
    let overallScore = 0;
    const gaps: CompetencyGap[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const skill of tree.coreSkills) {
      const score = skillScores[skill.id] || 0;
      overallScore += score * (1 / tree.coreSkills.length);

      // 识别优势和改进点
      if (score >= tree.evaluation.excellentScore) {
        strengths.push(`${skill.name} (${score}分)`);
      } else if (score < tree.evaluation.passingScore) {
        weaknesses.push(`${skill.name} (${score}分)`);
        
        // 计算能力缺口
        const requiredLevel = this.scoreToLevel(tree.evaluation.passingScore);
        gaps.push({
          skillId: skill.id,
          skillName: skill.name,
          currentLevel: this.scoreToLevel(score),
          requiredLevel,
          gap: requiredLevel - this.scoreToLevel(score),
          improvementSuggestions: this.generateImprovementSuggestions(skill, score)
        });
      }
    }

    // 生成改进建议
    const recommendations = this.generateRecommendations(gaps, strengths);

    return {
      roleId,
      roleName: tree.roleId,
      overallScore: Math.round(overallScore),
      skillScores,
      gaps,
      strengths,
      weaknesses,
      recommendations,
      assessedAt: new Date()
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
   * 生成改进建议
   */
  private generateImprovementSuggestions(skill: Skill, currentScore: number): string[] {
    const suggestions: string[] = [];

    if (currentScore < 60) {
      suggestions.push(`加强${skill.name}的基础理论学习`);
      suggestions.push(`完成至少3个相关练习场景`);
    }

    if (skill.relatedTools && skill.relatedTools.length > 0) {
      suggestions.push(`熟练掌握相关工具: ${skill.relatedTools.join(', ')}`);
    }

    if (skill.prerequisites && skill.prerequisites.length > 0) {
      suggestions.push(`确保已掌握前置技能`);
    }

    suggestions.push(`在实际场景中应用${skill.name},获取反馈并改进`);

    return suggestions;
  }

  /**
   * 生成总体建议
   */
  private generateRecommendations(gaps: CompetencyGap[], strengths: string[]): string[] {
    const recommendations: string[] = [];

    if (gaps.length > 0) {
      recommendations.push(`优先改进以下能力: ${gaps.map(g => g.skillName).join(', ')}`);
    }

    if (strengths.length > 0) {
      recommendations.push(`继续保持优势: ${strengths.join(', ')}`);
    }

    recommendations.push('建议通过场景化训练快速提升能力');
    recommendations.push('定期复盘训练结果,调整学习重点');

    return recommendations;
  }

  /**
   * 注册新的能力模型
   */
  registerCompetencyTree(tree: CompetencyTree): void {
    this.competencyTrees.set(tree.roleId, tree);
    logger.info(`注册能力模型: ${tree.domain}`);
  }

  /**
   * 获取所有能力模型
   */
  getAllCompetencyTrees(): CompetencyTree[] {
    return Array.from(this.competencyTrees.values());
  }
}

// 导出单例
export const competencyModel = new CompetencyModelManager();
