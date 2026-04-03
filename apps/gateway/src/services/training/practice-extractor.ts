/**
 * 最佳实践提取器 - Practice Extractor
 * 
 * 从Truman训虾文档、业务案例、知识库中提取最佳实践模式
 */

import { createLogger } from '../../utils/logger';
import { BestPractice } from '../soul/soul-injector';

const logger = createLogger('PracticeExtractor');

/**
 * 实践模式
 */
export interface PracticePattern {
  id: string;
  title: string;
  category: string;
  description: string;
  context: string;           // 适用场景
  action: string;            // 具体行动
  result: string;            // 预期结果
  source?: string;           // 来源
  tags: string[];
}

/**
 * 最佳实践提取器
 */
export class PracticeExtractor {
  private patterns: PracticePattern[] = [];

  constructor() {
    this.initializeFromTrumanDocument();
  }

  /**
   * 从Truman训虾文档初始化最佳实践
   * 
   * 基于视频内容和"最佳实践建模"文档提取的关键模式
   */
  private initializeFromTrumanDocument(): void {
    // 来自Truman训虾系统的核心最佳实践
    this.patterns = [
      {
        id: 'truman-001',
        title: '灵魂赋能而非渐进学习',
        category: 'training-method',
        description: '通过直接注入最佳实践和场景模拟,在5-10分钟内赋予AI员工专业能力,而非传统的渐进式学习',
        context: '训练新的AI员工时',
        action: '1)定义角色灵魂(使命+第一性原理+决策框架) 2)注入最佳实践 3)场景模拟训练 4)能力验证',
        result: 'AI员工快速获得专业能力,训练时间从数天缩短到5-10分钟',
        source: 'Truman训虾系统-核心理念',
        tags: ['soul-injection', 'rapid-training', 'best-practice']
      },
      {
        id: 'truman-002',
        title: '第一性原理思考',
        category: 'thinking-framework',
        description: '遇到问题时,先回归事物本质,从不可再简化的基本真理出发进行推理,而非类比或经验',
        context: '面对复杂问题或需要创新解决方案时',
        action: '1)明确问题本质 2)拆解到基本真理 3)从基本真理重新推理 4)得出创新结论',
        result: '突破思维定式,找到根本解决方案',
        source: 'Truman训虾系统-思维框架',
        tags: ['first-principles', 'problem-solving', 'innovation']
      },
      {
        id: 'truman-003',
        title: '场景化训练而非理论学习',
        category: 'training-method',
        description: '通过在真实业务场景中实践来学习,而非单纯的理论灌输',
        context: 'AI员工能力训练',
        action: '1)设计典型业务场景 2)模拟真实用户输入 3)评估AI表现 4)反馈优化',
        result: 'AI员工获得实战经验,能力更贴近实际需求',
        source: 'Truman训虾系统-训练方法',
        tags: ['scenario-training', 'practical', 'feedback-loop']
      },
      {
        id: 'truman-004',
        title: '持续反馈循环',
        category: 'optimization',
        description: '建立训练-评估-反馈-优化的闭环,持续提升AI员工能力',
        context: 'AI员工训练和优化',
        action: '1)执行训练场景 2)评估表现 3)识别能力缺口 4)针对性优化 5)重新训练',
        result: 'AI员工能力持续提升,短板不断补齐',
        source: 'Truman训虾系统-优化机制',
        tags: ['feedback', 'continuous-improvement', 'optimization']
      },
      {
        id: 'truman-005',
        title: '角色深度建模',
        category: 'role-design',
        description: '为每个AI员工角色建立完整的能力模型、人格特质、行为边界',
        context: '设计和定义AI员工角色',
        action: '1)定义核心使命 2)建立能力树 3)配置人格特质 4)设定行为边界 5)关联工具链',
        result: 'AI员工角色清晰、能力明确、行为一致',
        source: 'Truman训虾系统-角色设计',
        tags: ['role-modeling', 'competency', 'personality']
      },
      {
        id: 'truman-006',
        title: '数据驱动决策',
        category: 'decision-making',
        description: '所有建议和决策都必须基于数据和事实,而非直觉或经验',
        context: '商业分析和决策场景',
        action: '1)收集相关数据 2)验证数据质量 3)分析数据模式 4)得出数据支撑的结论 5)量化评估风险',
        result: '决策更客观、可验证、可追溯',
        source: 'Truman训虾系统-决策原则',
        tags: ['data-driven', 'objective', 'analytical']
      },
      {
        id: 'truman-007',
        title: '客户价值至上',
        category: 'service-principle',
        description: '在所有客户服务场景中,始终将客户价值和满意度放在首位',
        context: '客户成功和客服场景',
        action: '1)快速响应 2)共情理解 3)提供解决方案 4)主动跟进 5)超出预期',
        result: '客户满意度>90%,建立长期信任关系',
        source: 'Truman训虾系统-服务原则',
        tags: ['customer-first', 'empathy', 'service-excellence']
      },
      {
        id: 'truman-008',
        title: '结构化沟通',
        category: 'communication',
        description: '使用结构化框架进行沟通,确保信息清晰、逻辑严密、易于理解',
        context: '所有需要清晰表达的场景',
        action: '1)明确核心观点 2)结构化组织(总-分-总) 3)用数据或案例支撑 4)给出明确结论或建议',
        result: '沟通效率高,信息传递准确,对方容易理解和行动',
        source: 'Truman训虾系统-沟通技巧',
        tags: ['structured', 'communication', 'clarity']
      }
    ];

    logger.info(`从Truman文档提取 ${this.patterns.length} 个最佳实践模式`);
  }

  /**
   * 提取指定领域的最佳实践
   */
  extract(domain: string): BestPractice[] {
    logger.info(`提取最佳实践: ${domain}`);

    // 过滤相关模式
    const relevantPatterns = this.patterns.filter(pattern =>
      pattern.tags.some(tag => tag.includes(domain.toLowerCase())) ||
      pattern.category.includes(domain.toLowerCase())
    );

    // 转换为BestPractice格式
    return relevantPatterns.map(pattern => ({
      id: pattern.id,
      domain: pattern.category,
      title: pattern.title,
      description: pattern.description,
      context: pattern.context,
      action: pattern.action,
      result: pattern.result,
      source: pattern.source
    }));
  }

  /**
   * 获取所有最佳实践
   */
  getAllPractices(): BestPractice[] {
    return this.patterns.map(pattern => ({
      id: pattern.id,
      domain: pattern.category,
      title: pattern.title,
      description: pattern.description,
      context: pattern.context,
      action: pattern.action,
      result: pattern.result,
      source: pattern.source
    }));
  }

  /**
   * 按标签搜索最佳实践
   */
  searchByTag(tag: string): BestPractice[] {
    return this.patterns
      .filter(pattern => pattern.tags.includes(tag))
      .map(pattern => ({
        id: pattern.id,
        domain: pattern.category,
        title: pattern.title,
        description: pattern.description,
        context: pattern.context,
        action: pattern.action,
        result: pattern.result,
        source: pattern.source
      }));
  }

  /**
   * 注册新的最佳实践
   */
  registerPractice(practice: PracticePattern): void {
    this.patterns.push(practice);
    logger.info(`注册最佳实践: ${practice.title}`);
  }

  /**
   * 获取实践模式统计
   */
  getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const byTag: Record<string, number> = {};

    for (const pattern of this.patterns) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
      
      for (const tag of pattern.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }

    return {
      total: this.patterns.length,
      byCategory,
      byTag
    };
  }
}

// 导出单例
export const practiceExtractor = new PracticeExtractor();
