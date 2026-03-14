/**
 * Agent 注册表
 *
 * 管理不同类型的 AI Agent（员工）
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger('AgentRegistry');

/**
 * Agent 角色类型
 */
export type AgentRole =
  | 'developer'      // 程序员
  | 'analyst'        // 分析师
  | 'tester'         // 测试员
  | 'architect'      // 架构师
  | 'devops'         // DevOps 工程师
  | 'product_manager' // 产品经理
  | 'custom';        // 自定义角色

/**
 * Agent 能力
 */
export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];           // 该角色可以使用的工具
  permissions: string[];     // 权限列表
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  agentId: string;
  name: string;
  role: AgentRole;
  description: string;
  avatar?: string;
  capabilities: AgentCapability;
  systemPrompt: string;      // 角色系统提示词
  model?: string;            // 偏好模型
  temperature?: number;
  maxIterations?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Agent 实例
 */
export interface AgentInstance {
  agentId: string;
  config: AgentConfig;
  status: 'idle' | 'busy' | 'offline';
  currentTask?: string;
  completedTasks: number;
  failedTasks: number;
  lastActiveAt?: Date;
}

/**
 * 预设角色配置
 */
export const PRESET_ROLES: Record<AgentRole, Partial<AgentConfig>> = {
  developer: {
    name: '程序员',
    description: '擅长编写代码、调试程序、代码审查',
    capabilities: {
      name: 'development',
      description: '软件开发能力',
      tools: ['file_read', 'file_write', 'file_list', 'shell_command'],
      permissions: ['read_code', 'write_code', 'execute_tests']
    },
    systemPrompt: `You are an expert software developer. Your responsibilities include:
- Writing clean, efficient, and well-documented code
- Debugging and fixing bugs
- Code review and optimization
- Following best practices and design patterns
- Writing unit tests

When given a task:
1. Analyze requirements carefully
2. Plan your approach
3. Implement the solution
4. Test your code
5. Document your changes`,
    temperature: 0.3
  },

  analyst: {
    name: '分析师',
    description: '擅长数据分析、生成报告、发现洞察',
    capabilities: {
      name: 'analysis',
      description: '数据分析能力',
      tools: ['file_read', 'file_list', 'shell_command', 'http_request'],
      permissions: ['read_data', 'generate_reports', 'query_database']
    },
    systemPrompt: `You are a data analyst. Your responsibilities include:
- Analyzing data to find patterns and insights
- Generating comprehensive reports
- Data visualization recommendations
- Statistical analysis
- Trend identification

When given a task:
1. Understand the data sources
2. Clean and validate data
3. Perform analysis
4. Create visualizations if needed
5. Present findings clearly`,
    temperature: 0.5
  },

  tester: {
    name: '测试员',
    description: '擅长测试用例设计、Bug 发现、质量保障',
    capabilities: {
      name: 'testing',
      description: '软件测试能力',
      tools: ['file_read', 'file_list', 'shell_command'],
      permissions: ['read_code', 'execute_tests', 'report_bugs']
    },
    systemPrompt: `You are a QA engineer. Your responsibilities include:
- Designing test cases
- Executing tests
- Finding and reporting bugs
- Regression testing
- Performance testing
- Security testing

When given a task:
1. Understand the feature/requirements
2. Design comprehensive test cases
3. Execute tests systematically
4. Document bugs with clear reproduction steps
5. Verify fixes`,
    temperature: 0.4
  },

  architect: {
    name: '架构师',
    description: '擅长系统设计、技术选型、架构评审',
    capabilities: {
      name: 'architecture',
      description: '系统架构能力',
      tools: ['file_read', 'file_list', 'shell_command'],
      permissions: ['read_code', 'design_architecture', 'review_designs']
    },
    systemPrompt: `You are a software architect. Your responsibilities include:
- System design and architecture
- Technology selection
- Design pattern recommendations
- Architecture review
- Scalability planning
- Security architecture

When given a task:
1. Understand business requirements
2. Identify constraints and non-functional requirements
3. Design appropriate architecture
4. Consider scalability, security, and maintainability
5. Document design decisions`,
    temperature: 0.2
  },

  devops: {
    name: 'DevOps 工程师',
    description: '擅长 CI/CD、部署、监控、基础设施',
    capabilities: {
      name: 'devops',
      description: 'DevOps 能力',
      tools: ['file_read', 'file_write', 'file_list', 'shell_command', 'http_request'],
      permissions: ['deploy', 'configure_infrastructure', 'monitor_systems']
    },
    systemPrompt: `You are a DevOps engineer. Your responsibilities include:
- CI/CD pipeline setup
- Infrastructure as Code
- Deployment automation
- Monitoring and alerting
- Container orchestration
- Cloud resource management

When given a task:
1. Understand the deployment requirements
2. Design the pipeline/infrastructure
3. Implement automation
4. Set up monitoring
5. Document the process`,
    temperature: 0.3
  },

  product_manager: {
    name: '产品经理',
    description: '擅长需求分析、产品规划、用户故事',
    capabilities: {
      name: 'product_management',
      description: '产品管理能力',
      tools: ['file_read', 'file_write', 'file_list'],
      permissions: ['write_requirements', 'plan_features', 'prioritize_backlog']
    },
    systemPrompt: `You are a product manager. Your responsibilities include:
- Requirements gathering and analysis
- User story writing
- Feature prioritization
- Product roadmap planning
- Market analysis
- User experience design

When given a task:
1. Understand user needs
2. Define clear requirements
3. Write user stories
4. Prioritize features
5. Create acceptance criteria`,
    temperature: 0.6
  },

  custom: {
    name: '自定义 Agent',
    description: '用户自定义的 Agent 角色',
    capabilities: {
      name: 'custom',
      description: '自定义能力',
      tools: ['file_read', 'file_write', 'file_list', 'shell_command'],
      permissions: ['read_code', 'write_code']
    },
    systemPrompt: 'You are a custom AI agent. Follow your specific instructions carefully.',
    temperature: 0.5
  }
};

/**
 * Agent 注册表
 */
export class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map();
  private instances: Map<string, AgentInstance> = new Map();

  constructor() {
    // 初始化预设角色
    this.initializePresetAgents();
  }

  /**
   * 初始化预设 Agent
   */
  private initializePresetAgents(): void {
    const roles: AgentRole[] = ['developer', 'analyst', 'tester', 'architect', 'devops', 'product_manager'];

    for (const role of roles) {
      const preset = PRESET_ROLES[role];
      const agentId = `preset_${role}`;

      this.agents.set(agentId, {
        agentId,
        name: preset.name || role,
        role,
        description: preset.description || '',
        capabilities: preset.capabilities as AgentCapability,
        systemPrompt: preset.systemPrompt || '',
        model: preset.model,
        temperature: preset.temperature,
        maxIterations: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 创建实例
      this.instances.set(agentId, {
        agentId,
        config: this.agents.get(agentId)!,
        status: 'idle',
        completedTasks: 0,
        failedTasks: 0
      });
    }

    logger.info(`初始化完成 ${roles.length} 个预设 Agent`);
  }

  /**
   * 注册新 Agent
   */
  registerAgent(config: Omit<AgentConfig, 'agentId' | 'createdAt' | 'updatedAt'> & { agentId?: string }): AgentConfig {
    const agentId = config.agentId || `agent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const fullConfig: AgentConfig = {
      ...config as AgentConfig,
      agentId,
      createdAt: now,
      updatedAt: now
    };

    this.agents.set(agentId, fullConfig);

    // 创建实例
    this.instances.set(agentId, {
      agentId,
      config: fullConfig,
      status: 'idle',
      completedTasks: 0,
      failedTasks: 0
    });

    logger.info(`注册 Agent: ${fullConfig.name} (${agentId})`);
    return fullConfig;
  }

  /**
   * 获取 Agent 配置
   */
  getAgent(agentId: string): AgentConfig | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取特定角色的 Agent
   */
  getAgentsByRole(role: AgentRole): AgentConfig[] {
    return this.getAllAgents().filter(agent => agent.role === role);
  }

  /**
   * 更新 Agent
   */
  updateAgent(agentId: string, updates: Partial<AgentConfig>): AgentConfig | null {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    Object.assign(agent, updates, { updatedAt: new Date() });

    // 更新实例中的配置
    const instance = this.instances.get(agentId);
    if (instance) {
      instance.config = agent;
    }

    logger.info(`更新 Agent: ${agent.name}`);
    return agent;
  }

  /**
   * 删除 Agent
   */
  deleteAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // 不能删除预设 Agent
    if (agentId.startsWith('preset_')) {
      logger.warn(`不能删除预设 Agent: ${agentId}`);
      return false;
    }

    this.agents.delete(agentId);
    this.instances.delete(agentId);

    logger.info(`删除 Agent: ${agent.name}`);
    return true;
  }

  /**
   * 获取 Agent 实例
   */
  getInstance(agentId: string): AgentInstance | null {
    return this.instances.get(agentId) || null;
  }

  /**
   * 获取所有实例
   */
  getAllInstances(): AgentInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 设置 Agent 状态
   */
  setAgentStatus(agentId: string, status: AgentInstance['status'], currentTask?: string): boolean {
    const instance = this.instances.get(agentId);
    if (!instance) {
      return false;
    }

    instance.status = status;
    instance.currentTask = currentTask;
    instance.lastActiveAt = new Date();

    return true;
  }

  /**
   * 记录任务完成
   */
  recordTaskCompletion(agentId: string, success: boolean): boolean {
    const instance = this.instances.get(agentId);
    if (!instance) {
      return false;
    }

    if (success) {
      instance.completedTasks++;
    } else {
      instance.failedTasks++;
    }

    instance.status = 'idle';
    instance.currentTask = undefined;
    instance.lastActiveAt = new Date();

    return true;
  }

  /**
   * 获取可用 Agent（空闲状态）
   */
  getAvailableAgents(role?: AgentRole): AgentInstance[] {
    const instances = this.getAllInstances();
    return instances.filter(instance =>
      instance.status === 'idle' &&
      instance.config.isActive &&
      (!role || instance.config.role === role)
    );
  }

  /**
   * 从预设创建 Agent
   */
  createFromPreset(role: AgentRole, customizations?: Partial<AgentConfig>): AgentConfig {
    const preset = PRESET_ROLES[role];

    return this.registerAgent({
      name: customizations?.name || preset.name || role,
      role,
      description: customizations?.description || preset.description || '',
      capabilities: customizations?.capabilities || preset.capabilities as AgentCapability,
      systemPrompt: customizations?.systemPrompt || preset.systemPrompt || '',
      model: customizations?.model || preset.model,
      temperature: customizations?.temperature || preset.temperature,
      maxIterations: customizations?.maxIterations || 10,
      isActive: true,
      avatar: customizations?.avatar,
      metadata: customizations?.metadata
    });
  }
}

// 导出单例
export const agentRegistry = new AgentRegistry();
