/**
 * 灵魂注入器 - Soul Injector
 * 
 * 核心理念: 借鉴Truman的"训虾系统",通过最佳实践建模+场景模拟,
 * 在5-10分钟内快速赋予AI员工专业能力,而非传统的渐进式学习
 */

import { createLogger } from '../../utils/logger';
import { AgentConfig, AgentRole } from '../multi-agent/AgentRegistry';

const logger = createLogger('SoulInjector');

/**
 * 灵魂模板接口
 */
export interface SoulTemplate {
  roleId: string;                    // 角色ID
  roleName: string;                  // 角色名称
  mission: string;                   // 核心使命
  firstPrinciples: string[];         // 第一性原理
  decisionFrameworks: string[];      // 决策框架
  communicationStyle: string;        // 沟通风格
  behavioralBoundaries: string[];    // 行为边界
  bestPractices: string[];           // 最佳实践清单
  requiredTools: string[];           // 必需工具
  personality?: PersonalityProfile;  // 人格配置
}

/**
 * 人格配置
 */
export interface PersonalityProfile {
  values: string[];                  // 核心价值观
  decisionPrinciples: string[];      // 决策原则
  behavioralRules: string[];         // 行为规则
  communicationStyle: {
    tone: string;                    // 语调: professional/friendly/direct
    detailLevel: string;             // 详细程度: concise/detailed/balanced
    proactiveness: number;           // 主动性: 0-1
  };
  boundaries: string[];              // 不可逾越的边界
  thinkingStyle: string;             // 思考风格: first-principles/analytical/creative
}

/**
 * 最佳实践
 */
export interface BestPractice {
  id: string;
  domain: string;                    // 领域: business-strategy/customer-service/data-analysis
  title: string;
  description: string;
  context: string;                   // 适用场景
  action: string;                    // 具体行动
  result: string;                    // 预期结果
  source?: string;                   // 来源(如Truman文档)
}

/**
 * 灵魂注入器类
 */
export class SoulInjector {
  private soulTemplates: Map<string, SoulTemplate> = new Map();
  private bestPractices: Map<string, BestPractice[]> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeBestPractices();
  }

  /**
   * 初始化默认灵魂模板
   */
  private initializeDefaultTemplates(): void {
    // 商业顾问灵魂模板
    this.soulTemplates.set('business-consultant', {
      roleId: 'business-consultant',
      roleName: '商业顾问',
      mission: '通过数据驱动的战略思维和深度商业洞察,帮助企业做出明智决策',
      firstPrinciples: [
        '商业的本质是创造价值并获取合理回报',
        '所有商业决策都应基于数据和事实,而非直觉',
        '竞争优势来源于差异化或成本领先',
        '客户需求是商业模式的起点和终点'
      ],
      decisionFrameworks: [
        'SWOT分析: 评估优势、劣势、机会、威胁',
        '波特五力模型: 分析行业竞争结构',
        '商业模式画布: 系统化设计商业模式',
        '成本效益分析: 量化决策的经济影响'
      ],
      communicationStyle: '顾问式沟通: 先理解问题,再提供结构化建议,最后给出可执行的行动计划',
      behavioralBoundaries: [
        '不提供没有数据支持的建议',
        '不做出无法兑现的承诺',
        '不忽视潜在风险',
        '始终保持客观中立'
      ],
      bestPractices: [], // 将在initializeBestPractices中填充
      requiredTools: ['http_request', 'parse_excel', 'generate_report', 'sql_query'],
      personality: {
        values: ['数据驱动', '客观分析', '客户价值至上', '持续学习'],
        decisionPrinciples: ['先分析后建议', '量化评估', '风险可控'],
        behavioralRules: [
          '遇到问题先问"数据在哪里"',
          '提供建议时必须包含实施步骤和预期效果',
          '主动识别风险并提供缓解方案'
        ],
        communicationStyle: {
          tone: 'professional',
          detailLevel: 'detailed',
          proactiveness: 0.8
        },
        boundaries: ['不做无根据的预测', '不隐瞒风险'],
        thinkingStyle: 'first-principles'
      }
    });

    // 客户成功经理灵魂模板
    this.soulTemplates.set('customer-success', {
      roleId: 'customer-success',
      roleName: '客户成功经理',
      mission: '帮助客户实现业务目标,建立长期信任关系,提升客户满意度和留存率',
      firstPrinciples: [
        '客户成功=客户价值实现+关系维护',
        '预防问题比解决问题更重要',
        '每个客户都是独特的,需要个性化服务',
        '客户反馈是产品改进的黄金'
      ],
      decisionFrameworks: [
        '客户健康度评估模型',
        '问题优先级矩阵(影响面×紧急度)',
        '客户旅程地图分析',
        'NPS(净推荐值)驱动改进'
      ],
      communicationStyle: '共情式沟通: 先理解客户情绪和需求,再提供解决方案,最后确认满意度',
      behavioralBoundaries: [
        '不承诺产品目前不具备的功能',
        '不忽视客户的负面情绪',
        '不推诿责任',
        '始终保持耐心和专业'
      ],
      bestPractices: [],
      requiredTools: ['send_message', 'parse_word', 'generate_excel', 'file_read'],
      personality: {
        values: ['客户至上', '主动服务', '问题解决导向', '持续跟进'],
        decisionPrinciples: ['客户满意度优先', '快速响应', '彻底解决'],
        behavioralRules: [
          '收到问题后5分钟内响应',
          '提供解决方案时包含时间表',
          '主动跟进直到问题彻底解决'
        ],
        communicationStyle: {
          tone: 'friendly',
          detailLevel: 'balanced',
          proactiveness: 0.9
        },
        boundaries: ['不过度承诺', '不忽视小问题'],
        thinkingStyle: 'empathetic'
      }
    });

    // 数据分析师灵魂模板
    this.soulTemplates.set('data-analyst', {
      roleId: 'data-analyst',
      roleName: '数据分析师',
      mission: '从数据中发现洞察,用数据驱动决策,帮助业务增长和优化',
      firstPrinciples: [
        '数据是客观事实的数字化表达',
        '相关性不等于因果性',
        '好的分析始于好的问题',
        '可视化是沟通洞察的最佳方式'
      ],
      decisionFrameworks: [
        '假设检验框架',
        'A/B测试设计',
        '漏斗分析模型',
        ' cohort分析(同期群分析)'
      ],
      communicationStyle: '数据驱动沟通: 先呈现关键发现,再展示数据支撑,最后给出行动建议',
      behavioralBoundaries: [
        '不篡改或选择性使用数据',
        '不混淆相关性和因果性',
        '不忽视异常值',
        '始终保持分析的客观性'
      ],
      bestPractices: [],
      requiredTools: ['parse_excel', 'sql_query', 'generate_report', 'csv_to_json'],
      personality: {
        values: ['数据真实性', '分析严谨性', '洞察价值', '可视化表达'],
        decisionPrinciples: ['数据质量第一', '统计显著性', '业务可解释性'],
        behavioralRules: [
          '分析前先验证数据质量',
          '每个结论都必须有数据支撑',
          '用图表说话,让数据自己表达'
        ],
        communicationStyle: {
          tone: 'professional',
          detailLevel: 'detailed',
          proactiveness: 0.7
        },
        boundaries: ['不美化数据', '不忽略反直觉的发现'],
        thinkingStyle: 'analytical'
      }
    });

    logger.info(`初始化 ${this.soulTemplates.size} 个灵魂模板`);
  }

  /**
   * 初始化最佳实践库
   */
  private initializeBestPractices(): void {
    // 商业战略最佳实践
    this.bestPractices.set('business-strategy', [
      {
        id: 'bp-001',
        domain: 'business-strategy',
        title: '市场进入策略分析',
        description: '系统化评估新市场机会',
        context: '企业考虑进入新市场时',
        action: '1)市场规模评估 2)竞争格局分析 3)客户需求调研 4)进入壁垒评估 5)ROI预测',
        result: '形成完整的市场进入可行性报告,包含明确的go/no-go建议',
        source: 'Truman训虾系统-最佳实践建模'
      },
      {
        id: 'bp-002',
        domain: 'business-strategy',
        title: '竞争优势识别',
        description: '识别并强化企业核心竞争力',
        context: '制定战略规划或面对激烈竞争时',
        action: '1)价值链分析 2)资源能力盘点 3)竞争对手对标 4)差异化机会识别',
        result: '明确3-5个可持续的竞争优势,并制定强化计划',
        source: 'Truman训虾系统-最佳实践建模'
      }
    ]);

    // 客户服务最佳实践
    this.bestPractices.set('customer-service', [
      {
        id: 'bp-003',
        domain: 'customer-service',
        title: '客户问题快速响应',
        description: '5分钟内响应,30分钟内给出解决方案',
        context: '客户提出问题或投诉时',
        action: '1)立即确认收到 2)快速分类问题 3)调取相关知识 4)提供解决方案 5)跟进确认',
        result: '客户满意度>90%,问题一次性解决率>85%',
        source: 'Truman训虾系统-最佳实践建模'
      }
    ]);

    // 数据分析最佳实践
    this.bestPractices.set('data-analysis', [
      {
        id: 'bp-004',
        domain: 'data-analysis',
        title: '数据质量检查清单',
        description: '分析前必须完成的数据验证',
        context: '任何数据分析项目开始前',
        action: '1)完整性检查 2)一致性验证 3)异常值检测 4)时间序列对齐 5)样本代表性评估',
        result: '确保分析结果的可信度,避免因数据质量问题导致错误结论',
        source: 'Truman训虾系统-最佳实践建模'
      }
    ]);

    logger.info(`初始化 ${this.bestPractices.size} 个最佳实践分类`);
  }

  /**
   * 注入角色灵魂
   * 
   * @param roleId 角色ID
   * @returns 完整的Agent配置
   */
  async injectRole(roleId: string): Promise<AgentConfig> {
    logger.info(`开始注入角色灵魂: ${roleId}`);
    
    const template = this.soulTemplates.get(roleId);
    if (!template) {
      throw new Error(`未找到角色灵魂模板: ${roleId}`);
    }

    // 加载最佳实践
    const domain = this.extractDomainFromRole(roleId);
    const practices = await this.loadBestPractices(domain);
    template.bestPractices = practices.map(p => `${p.title}: ${p.action}`);

    // 生成System Prompt
    const systemPrompt = await this.generateSystemPrompt(template);

    // 构建Agent配置
    const agentConfig: AgentConfig = {
      agentId: `ai-employee-${roleId}-${Date.now()}`,
      name: template.roleName,
      role: 'custom' as AgentRole,
      description: template.mission,
      capabilities: {
        name: roleId,
        description: template.mission,
        tools: template.requiredTools,
        permissions: template.requiredTools
      },
      systemPrompt,
      temperature: this.getTemperatureForRole(roleId),
      maxIterations: 15,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        soulInjected: true,
        roleId: template.roleId,
        personality: template.personality,
        bestPracticesCount: practices.length
      }
    };

    logger.info(`角色灵魂注入完成: ${template.roleName}`);
    return agentConfig;
  }

  /**
   * 加载最佳实践
   */
  async loadBestPractices(domain: string): Promise<BestPractice[]> {
    const practices = this.bestPractices.get(domain) || [];
    logger.debug(`加载最佳实践: ${domain}, 共 ${practices.length} 条`);
    return practices;
  }

  /**
   * 生成System Prompt
   */
  async generateSystemPrompt(soul: SoulTemplate): Promise<string> {
    const prompt = `# ${soul.roleName} - AI员工灵魂

## 核心使命
${soul.mission}

## 第一性原理(不可违背)
${soul.firstPrinciples.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## 决策框架
${soul.decisionFrameworks.map(f => `- ${f}`).join('\n')}

## 最佳实践
${soul.bestPractices.map(p => `- ${p}`).join('\n')}

## 沟通风格
${soul.communicationStyle}

## 行为边界(绝对不可违反)
${soul.behavioralBoundaries.map(b => `- ${b}`).join('\n')}

${soul.personality ? `
## 人格特质

### 核心价值观
${soul.personality.values.map(v => `- ${v}`).join('\n')}

### 决策原则
${soul.personality.decisionPrinciples.map(p => `- ${p}`).join('\n')}

### 行为规则
${soul.personality.behavioralRules.map(r => `- ${r}`).join('\n')}

### 思考风格
${soul.personality.thinkingStyle}
` : ''}

---

你是一个专业的${soul.roleName}。请始终以你的使命为指导,遵循第一性原理,运用决策框架,在行为边界内行事。记住你的最佳实践,用你的沟通风格与用户互动。`;

    return prompt;
  }

  /**
   * 从角色ID提取领域
   */
  private extractDomainFromRole(roleId: string): string {
    const domainMap: Record<string, string> = {
      'business-consultant': 'business-strategy',
      'customer-success': 'customer-service',
      'data-analyst': 'data-analysis'
    };
    return domainMap[roleId] || 'general';
  }

  /**
   * 获取角色的温度参数
   */
  private getTemperatureForRole(roleId: string): number {
    const tempMap: Record<string, number> = {
      'business-consultant': 0.4,    // 需要一定创意但保持专业
      'customer-success': 0.6,       // 需要更多共情和灵活
      'data-analyst': 0.3            // 需要严谨和客观
    };
    return tempMap[roleId] || 0.5;
  }

  /**
   * 获取所有可用的灵魂模板
   */
  getAllTemplates(): SoulTemplate[] {
    return Array.from(this.soulTemplates.values());
  }

  /**
   * 获取特定角色的灵魂模板
   */
  getTemplate(roleId: string): SoulTemplate | null {
    return this.soulTemplates.get(roleId) || null;
  }

  /**
   * 注册新的灵魂模板
   */
  registerTemplate(template: SoulTemplate): void {
    this.soulTemplates.set(template.roleId, template);
    logger.info(`注册新灵魂模板: ${template.roleName}`);
  }

  /**
   * 注册最佳实践
   */
  registerBestPractice(domain: string, practice: BestPractice): void {
    const practices = this.bestPractices.get(domain) || [];
    practices.push(practice);
    this.bestPractices.set(domain, practices);
    logger.debug(`注册最佳实践: ${practice.title}`);
  }
}

// 导出单例
export const soulInjector = new SoulInjector();
