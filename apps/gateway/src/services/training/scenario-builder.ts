/**
 * 场景构建器 - Scenario Builder
 * 
 * 从业务文档/知识库生成训练场景,定义场景目标、输入、预期输出和评估标准
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger('ScenarioBuilder');

/**
 * 训练场景
 */
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  roleId: string;                    // 适用角色
  category: string;                  // 场景分类
  context: string;                   // 场景背景
  userInput: string;                 // 模拟用户输入
  expectedBehavior: string[];        // 期望的AI行为
  evaluationCriteria: EvaluationCriteria;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;         // 预计时长(分钟)
  tags: string[];
}

/**
 * 评估标准
 */
export interface EvaluationCriteria {
  rubric: RubricItem[];
  passingScore: number;              // 及格分(0-100)
  excellentScore: number;            // 优秀分(0-100)
}

/**
 * 评估项
 */
export interface RubricItem {
  id: string;
  criterion: string;                 // 评估维度
  weight: number;                    // 权重(0-1)
  indicators: string[];              // 评分指标
}

/**
 * 训练结果
 */
export interface TrainingResult {
  scenarioId: string;
  score: number;                     // 总分(0-100)
  breakdown: Record<string, number>; // 各维度得分
  feedback: string[];                // 反馈
  passed: boolean;
  duration: number;                  // 实际用时(分钟)
  completedAt: Date;
}

/**
 * 场景构建器
 */
export class ScenarioBuilder {
  private scenarios: Map<string, TrainingScenario> = new Map();

  constructor() {
    this.initializeDefaultScenarios();
  }

  /**
   * 初始化默认场景库
   */
  private initializeDefaultScenarios(): void {
    // 商业顾问场景
    this.scenarios.set('market-research', {
      id: 'market-research',
      title: '市场调研分析',
      description: '为一个新产品进行市场调研,评估市场机会和竞争格局',
      roleId: 'business-consultant',
      category: 'market-analysis',
      context: '你是一家科技公司的商业顾问。公司计划推出一款AI驱动的客户管理工具,需要你进行市场调研,评估市场机会。',
      userInput: '请帮我们分析一下AI CRM市场的现状、规模、主要竞争者,以及我们的市场进入机会。我们是一家中型科技公司,有AI技术积累但缺乏CRM行业经验。',
      expectedBehavior: [
        '使用结构化框架分析市场(如PEST分析、波特五力)',
        '提供具体的市场规模数据和增长趋势',
        '识别主要竞争者及其优劣势',
        '评估市场进入壁垒和机会',
        '给出明确的建议和风险提示'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '分析框架使用',
            weight: 0.3,
            indicators: ['使用至少一个结构化分析框架', '框架应用恰当', '分析维度全面']
          },
          {
            id: 'r2',
            criterion: '数据支撑',
            weight: 0.4,
            indicators: ['引用具体数据', '数据来源可靠', '数据分析合理']
          },
          {
            id: 'r3',
            criterion: '建议可行性',
            weight: 0.3,
            indicators: ['建议具体可执行', '考虑公司实际情况', '包含风险评估']
          }
        ],
        passingScore: 70,
        excellentScore: 85
      },
      difficulty: 'medium',
      estimatedDuration: 8,
      tags: ['market-analysis', 'competitive-intelligence', 'strategic-planning']
    });

    this.scenarios.set('business-model-analysis', {
      id: 'business-model-analysis',
      title: '商业模式设计',
      description: '使用商业模式画布为一个创新产品设计商业模式',
      roleId: 'business-consultant',
      category: 'business-model',
      context: '你的客户是一位创业者,开发了一款基于AI的学习平台,需要你帮助设计商业模式。',
      userInput: '我开发了一个AI学习平台,可以根据学生的学习习惯自动调整教学内容。目前还在原型阶段,不知道应该如何设计商业模式。能帮我分析一下吗?',
      expectedBehavior: [
        '使用商业模式画布的9个要素进行分析',
        '识别目标客户细分',
        '设计合理的价值主张',
        '设计收入模式',
        '分析成本结构',
        '提出关键合作伙伴建议'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '商业模式完整性',
            weight: 0.4,
            indicators: ['覆盖商业模式画布全部9要素', '各要素逻辑一致', '要素间关系清晰']
          },
          {
            id: 'r2',
            criterion: '创新性',
            weight: 0.3,
            indicators: ['价值主张独特', '收入模式创新', '差异化明显']
          },
          {
            id: 'r3',
            criterion: '可执行性',
            weight: 0.3,
            indicators: ['考虑资源约束', '分阶段实施计划', '风险可控']
          }
        ],
        passingScore: 70,
        excellentScore: 85
      },
      difficulty: 'hard',
      estimatedDuration: 10,
      tags: ['business-model', 'entrepreneurship', 'innovation']
    });

    // 客户成功场景
    this.scenarios.set('customer-onboarding', {
      id: 'customer-onboarding',
      title: '新客户引导',
      description: '帮助新客户快速上手产品,建立良好第一印象',
      roleId: 'customer-success',
      category: 'onboarding',
      context: '一家中型企业刚刚购买了你们的产品(一个项目管理SaaS),你是负责的客户成功经理。',
      userInput: '你好,我们刚购买了你们的企业版,团队有50人。之前用的是另一个产品,希望能顺利迁移过来。有什么建议吗?',
      expectedBehavior: [
        '热情欢迎并确认购买信息',
        '了解客户背景和迁移需求',
        '提供结构化的onboarding计划',
        '识别关键成功因素和潜在风险',
        '安排后续跟进时间',
        '提供相关资源链接'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '响应质量',
            weight: 0.3,
            indicators: ['及时响应', '态度友好', '专业度高']
          },
          {
            id: 'r2',
            criterion: '需求理解',
            weight: 0.3,
            indicators: ['主动了解背景', '识别关键需求', '确认理解']
          },
          {
            id: 'r3',
            criterion: '方案完整性',
            weight: 0.4,
            indicators: ['onboarding计划清晰', '考虑迁移细节', '包含跟进机制']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      },
      difficulty: 'medium',
      estimatedDuration: 6,
      tags: ['onboarding', 'customer-experience', 'migration']
    });

    this.scenarios.set('issue-resolution', {
      id: 'issue-resolution',
      title: '客户问题处理',
      description: '处理客户的紧急问题,恢复客户信心',
      roleId: 'customer-success',
      category: 'support',
      context: '一位重要客户遇到了数据导出问题,影响了他们的月度报告。',
      userInput: '急!我们需要导出上个月的项目数据做月度报告,但导出功能一直报错。这个报告今天下午就要交给管理层,能帮忙解决吗?',
      expectedBehavior: [
        '立即响应并表达理解紧急程度',
        '快速确认问题详情',
        '提供临时解决方案(如果有)',
        '协调技术团队紧急处理',
        '给出明确的时间承诺',
        '主动跟进直到问题解决'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '响应速度',
            weight: 0.3,
            indicators: ['立即响应', '表达紧急理解', '快速行动']
          },
          {
            id: 'r2',
            criterion: '问题解决',
            weight: 0.4,
            indicators: ['准确定位问题', '提供解决方案', '时间承诺合理']
          },
          {
            id: 'r3',
            criterion: '客户关怀',
            weight: 0.3,
            indicators: ['情绪安抚', '主动跟进', '超预期服务']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      },
      difficulty: 'hard',
      estimatedDuration: 5,
      tags: ['issue-resolution', 'urgent', 'customer-retention']
    });

    // 数据分析师场景
    this.scenarios.set('sales-analysis', {
      id: 'sales-analysis',
      title: '销售数据分析',
      description: '分析销售数据,发现增长机会和问题',
      roleId: 'data-analyst',
      category: 'analysis',
      context: '公司Q3销售数据已出,CEO希望你能分析销售表现,找出增长点和需要改进的地方。',
      userInput: '这是Q3的销售数据(Excel附件)。请帮我分析:1)整体销售趋势 2)各产品线表现 3)区域销售差异 4)找出top和bottom performer 5)给出Q4建议',
      expectedBehavior: [
        '先验证数据质量和完整性',
        '分析整体销售趋势(环比、同比)',
        '按产品线拆解分析',
        '按区域对比分析',
        '识别top/bottom performer并分析原因',
        '用图表可视化关键发现',
        '基于数据给出Q4建议'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '数据质量检查',
            weight: 0.2,
            indicators: ['检查完整性', '处理异常值', '验证一致性']
          },
          {
            id: 'r2',
            criterion: '分析深度',
            weight: 0.4,
            indicators: ['多维度分析', '趋势识别', '异常分析']
          },
          {
            id: 'r3',
            criterion: '洞察价值',
            weight: 0.4,
            indicators: ['发现关键洞察', '建议可执行', '图表清晰']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      },
      difficulty: 'medium',
      estimatedDuration: 8,
      tags: ['sales-analysis', 'trend-analysis', 'business-intelligence']
    });

    this.scenarios.set('user-behavior-analysis', {
      id: 'user-behavior-analysis',
      title: '用户行为分析',
      description: '分析用户行为数据,优化产品体验',
      roleId: 'data-analyst',
      category: 'analysis',
      context: '产品团队发现用户留存率下降,需要你分析用户行为数据找出原因。',
      userInput: '最近30天的用户留存率从45%降到了38%,能帮我们分析一下可能的原因吗?我们有用户行为日志和留存数据。',
      expectedBehavior: [
        '定义留存率计算方法',
        '分析不同用户群体的留存差异',
        '识别留存下降的关键时间点',
        '关联产品变更或外部因素',
        '分析用户行为路径差异',
        '提出假设并验证',
        '给出改进建议'
      ],
      evaluationCriteria: {
        rubric: [
          {
            id: 'r1',
            criterion: '分析方法',
            weight: 0.3,
            indicators: ['方法选择合理', ' cohort分析', '统计显著性']
          },
          {
            id: 'r2',
            criterion: '因果推断',
            weight: 0.4,
            indicators: ['区分相关和因果', '多因素分析', '假设验证']
          },
          {
            id: 'r3',
            criterion: '行动建议',
            weight: 0.3,
            indicators: ['建议基于数据', '可执行性强', '预期效果量化']
          }
        ],
        passingScore: 75,
        excellentScore: 90
      },
      difficulty: 'hard',
      estimatedDuration: 10,
      tags: ['user-behavior', 'retention', 'product-analytics']
    });

    logger.info(`初始化 ${this.scenarios.size} 个训练场景`);
  }

  /**
   * 获取场景
   */
  getScenario(scenarioId: string): TrainingScenario | null {
    return this.scenarios.get(scenarioId) || null;
  }

  /**
   * 获取角色的所有场景
   */
  getScenariosByRole(roleId: string): TrainingScenario[] {
    return Array.from(this.scenarios.values()).filter(s => s.roleId === roleId);
  }

  /**
   * 获取所有场景
   */
  getAllScenarios(): TrainingScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * 注册新场景
   */
  registerScenario(scenario: TrainingScenario): void {
    this.scenarios.set(scenario.id, scenario);
    logger.info(`注册场景: ${scenario.title}`);
  }

  /**
   * 评估训练结果
   */
  evaluateTraining(
    scenario: TrainingScenario,
    actualBehavior: string[]  // AI实际行为描述
  ): TrainingResult {
    const breakdown: Record<string, number> = {};
    let totalScore = 0;
    const feedback: string[] = [];

    // 对每个评估维度打分
    for (const rubricItem of scenario.evaluationCriteria.rubric) {
      let dimensionScore = 0;
      let matchedIndicators = 0;

      // 检查每个指标
      for (const indicator of rubricItem.indicators) {
        const matched = actualBehavior.some(behavior =>
          behavior.includes(indicator) || this.isBehaviorSimilar(behavior, indicator)
        );

        if (matched) {
          matchedIndicators++;
        }
      }

      dimensionScore = (matchedIndicators / rubricItem.indicators.length) * 100;
      breakdown[rubricItem.criterion] = Math.round(dimensionScore);
      totalScore += dimensionScore * rubricItem.weight;

      // 生成反馈
      if (dimensionScore < 60) {
        feedback.push(`${rubricItem.criterion}: 需要改进 (得分: ${Math.round(dimensionScore)}%)`);
      } else if (dimensionScore >= 85) {
        feedback.push(`${rubricItem.criterion}: 优秀 (得分: ${Math.round(dimensionScore)}%)`);
      }
    }

    const finalScore = Math.round(totalScore);

    return {
      scenarioId: scenario.id,
      score: finalScore,
      breakdown,
      feedback,
      passed: finalScore >= scenario.evaluationCriteria.passingScore,
      duration: scenario.estimatedDuration,
      completedAt: new Date()
    };
  }

  /**
   * 判断行为是否相似(简化实现)
   */
  private isBehaviorSimilar(actual: string, expected: string): boolean {
    // 简化实现: 检查关键词重叠
    const actualWords = new Set(actual.split(''));
    const expectedWords = new Set(expected.split(' '));
    
    let matchCount = 0;
    for (const word of expectedWords) {
      if (actual.includes(word)) {
        matchCount++;
      }
    }

    const similarity = matchCount / expectedWords.size;
    return similarity >= 0.6;  // 60%相似度认为匹配
  }

  /**
   * 从文档生成场景(占位实现)
   * 
   * 实际实现可以从业务文档、案例库、知识库中自动提取场景
   */
  async fromDocument(docPath: string): Promise<TrainingScenario[]> {
    logger.info(`从文档生成场景: ${docPath}`);
    
    // TODO: 实现文档解析和场景提取
    // 这里可以使用AI分析文档,提取关键场景
    
    return [];
  }
}

// 导出单例
export const scenarioBuilder = new ScenarioBuilder();
