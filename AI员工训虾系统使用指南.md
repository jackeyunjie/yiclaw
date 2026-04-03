# AI员工训虾系统 - 使用指南

> 基于Truman"训虾系统"理念,通过灵魂赋能在5-10分钟内快速创建专业AI员工

---

## 🎯 系统概述

AI员工训虾系统是YiClaw的核心创新功能,借鉴Truman提出的"训虾系统"理念,通过**灵魂注入**而非渐进学习,让AI员工在5-10分钟内获得专业能力。

### 核心特性

1. **灵魂赋能(Soul Injection)** - 通过最佳实践建模+场景模拟快速赋予专业能力
2. **场景化训练(Scenario Training)** - 在真实业务场景中训练和优化
3. **专业角色建模(Role Modeling)** - 完整的灵魂模板、能力模型、人格配置
4. **记忆人格强化(Memory & Personality)** - 一致的价值观、决策原则、行为边界

---

## 🏗️ 架构组成

### 核心模块

```
apps/gateway/src/services/
├── soul/                          # 灵魂赋能引擎
│   ├── soul-injector.ts          # 灵魂注入器
│   ├── competency-model.ts       # 能力模型
│   └── personality-core.ts       # 人格核心
│
└── training/                      # 场景化训练系统
    ├── scenario-builder.ts       # 场景构建器
    ├── practice-extractor.ts     # 最佳实践提取器
    └── feedback-loop.ts          # 训练反馈循环
```

### API路由

```
apps/gateway/src/routes/
└── ai-employees.ts               # AI员工管理API
```

---

## 🚀 快速开始

### 1. 查看可用的AI员工角色

```bash
curl http://localhost:3000/api/v1/ai-employees/templates
```

**当前可用角色:**
- `business-consultant` - 商业顾问
- `customer-success` - 客户成功经理
- `data-analyst` - 数据分析师

### 2. 创建AI员工(灵魂注入)

```bash
curl -X POST http://localhost:3000/api/v1/ai-employees/business-consultant/inject \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "我的商业顾问AI"
  }'
```

**返回示例:**
```json
{
  "success": true,
  "data": {
    "agentId": "ai-employee-business-consultant-1234567890",
    "name": "我的商业顾问AI",
    "roleId": "business-consultant",
    "soulInjected": true,
    "systemPromptLength": 1523,
    "tools": ["http_request", "parse_excel", "generate_report", "sql_query"],
    "createdAt": "2026-04-02T10:00:00.000Z"
  }
}
```

### 3. 查看训练场景

```bash
curl http://localhost:3000/api/v1/ai-employees/scenarios/business-consultant
```

**商业顾问训练场景:**
- `market-research` - 市场调研分析 (8分钟, 中等难度)
- `business-model-analysis` - 商业模式设计 (10分钟, 困难)

### 4. 执行训练

```bash
curl -X POST http://localhost:3000/api/v1/ai-employees/{agentId}/train \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "market-research"
  }'
```

### 5. 查看训练状态

```bash
curl http://localhost:3000/api/v1/ai-employees/{agentId}/status
```

### 6. 获取能力报告

```bash
curl http://localhost:3000/api/v1/ai-employees/{agentId}/report
```

### 7. 获取优化建议

```bash
curl -X POST http://localhost:3000/api/v1/ai-employees/{agentId}/optimize
```

---

## 📚 API完整文档

### 灵魂注入

**POST** `/api/v1/ai-employees/:roleId/inject`

创建AI员工并注入灵魂

**请求体:**
```json
{
  "employeeName": "可选的员工名称"
}
```

**响应:**
- `agentId` - AI员工ID
- `name` - 员工名称
- `roleId` - 角色ID
- `soulInjected` - 是否成功注入灵魂
- `tools` - 配备的工具列表

---

### 场景训练

**POST** `/api/v1/ai-employees/:agentId/train`

执行训练场景

**请求体:**
```json
{
  "scenarioId": "场景ID"
}
```

**响应:**
- `score` - 训练得分(0-100)
- `passed` - 是否通过
- `breakdown` - 各维度得分
- `feedback` - 反馈建议

---

### 训练状态

**GET** `/api/v1/ai-employees/:agentId/status`

获取训练进度

**响应:**
- `trainingStatus` - 训练状态(pending/in_progress/completed)
- `trainingProgress` - 进度详情
  - `completed` - 已完成场景数
  - `total` - 总场景数
  - `percentage` - 完成百分比
  - `averageScore` - 平均分
  - `passedCount` - 通过数量

---

### 能力报告

**GET** `/api/v1/ai-employees/:agentId/report`

获取详细能力评估报告

**响应:**
- `overallScore` - 总体得分
- `competencyGaps` - 能力缺口列表
- `strengths` - 优势
- `weaknesses` - 待改进
- `recommendations` - 改进建议
- `personalityConsistency` - 人格一致性得分

---

### 优化建议

**POST** `/api/v1/ai-employees/:agentId/optimize`

生成训练优化建议

**响应:**
- `gapAnalysis` - 缺口分析
- `optimization` - 优化建议
  - `focusAreas` - 重点改进领域
  - `practiceScenarios` - 推荐练习场景
  - `soulAdjustments` - 灵魂配置调整
  - `toolRecommendations` - 工具使用建议

---

### 查询灵魂模板

**GET** `/api/v1/ai-employees/templates`

获取所有可用的灵魂模板

---

### 查询训练场景

**GET** `/api/v1/ai-employees/scenarios/:roleId`

获取指定角色的所有训练场景

---

### 查询最佳实践

**GET** `/api/v1/ai-employees/best-practices/:domain`

获取指定领域的最佳实践

**可用领域:**
- `business-strategy` - 商业战略
- `customer-service` - 客户服务
- `data-analysis` - 数据分析
- `training-method` - 训练方法
- `thinking-framework` - 思维框架

---

## 🎭 专业角色详解

### 1. 商业顾问 (business-consultant)

**核心使命:** 通过数据驱动的战略思维和深度商业洞察,帮助企业做出明智决策

**第一性原理:**
- 商业的本质是创造价值并获取合理回报
- 所有商业决策都应基于数据和事实,而非直觉
- 竞争优势来源于差异化或成本领先
- 客户需求是商业模式的起点和终点

**核心能力:**
- 市场分析
- 商业模式设计
- 竞品分析
- 财务分析

**训练场景:**
- 市场调研分析
- 商业模式设计

**人格特质:**
- 思考风格: 第一性原理
- 沟通风格: 专业、详细、高主动性(0.8)
- 决策原则: 先分析后建议、量化评估、风险可控

---

### 2. 客户成功经理 (customer-success)

**核心使命:** 帮助客户实现业务目标,建立长期信任关系,提升客户满意度和留存率

**第一性原理:**
- 客户成功=客户价值实现+关系维护
- 预防问题比解决问题更重要
- 每个客户都是独特的,需要个性化服务
- 客户反馈是产品改进的黄金

**核心能力:**
- 需求分析
- 方案设计
- 关系维护

**训练场景:**
- 新客户引导
- 客户问题处理

**人格特质:**
- 思考风格: 共情式
- 沟通风格: 友好、平衡、极高主动性(0.9)
- 决策原则: 客户满意度优先、快速响应、彻底解决

---

### 3. 数据分析师 (data-analyst)

**核心使命:** 从数据中发现洞察,用数据驱动决策,帮助业务增长和优化

**第一性原理:**
- 数据是客观事实的数字化表达
- 相关性不等于因果性
- 好的分析始于好的问题
- 可视化是沟通洞察的最佳方式

**核心能力:**
- 数据清洗
- 统计分析
- 可视化报告

**训练场景:**
- 销售数据分析
- 用户行为分析

**人格特质:**
- 思考风格: 分析型
- 沟通风格: 专业、详细、高主动性(0.7)
- 决策原则: 数据质量第一、统计显著性、业务可解释性

---

## 🔧 扩展指南

### 添加新的AI员工角色

#### 1. 在soul-injector.ts中注册灵魂模板

```typescript
this.soulTemplates.set('your-role-id', {
  roleId: 'your-role-id',
  roleName: '角色名称',
  mission: '核心使命',
  firstPrinciples: ['第一性原理1', '第一性原理2'],
  decisionFrameworks: ['决策框架1', '决策框架2'],
  communicationStyle: '沟通风格描述',
  behavioralBoundaries: ['行为边界1', '行为边界2'],
  bestPractices: [],
  requiredTools: ['tool1', 'tool2'],
  personality: {
    values: ['价值观1', '价值观2'],
    decisionPrinciples: ['决策原则1'],
    behavioralRules: ['行为规则1'],
    communicationStyle: {
      tone: 'professional',
      detailLevel: 'detailed',
      proactiveness: 0.8
    },
    boundaries: ['边界1'],
    thinkingStyle: 'first-principles'
  }
});
```

#### 2. 在competency-model.ts中注册能力模型

```typescript
this.competencyTrees.set('your-role-id', {
  domain: 'your-domain',
  roleId: 'your-role-id',
  coreSkills: [
    {
      id: 'skill-1',
      name: '技能名称',
      description: '技能描述',
      category: '分类',
      level: SkillLevel.INTERMEDIATE,
      maxLevel: SkillLevel.EXPERT,
      relatedTools: ['tool1', 'tool2']
    }
  ],
  tools: ['tool1', 'tool2'],
  scenarios: ['scenario-1', 'scenario-2'],
  evaluation: {
    criteria: [
      {
        id: 'criterion-1',
        name: '评估维度',
        description: '维度描述',
        weight: 0.4,
        indicators: ['指标1', '指标2']
      }
    ],
    passingScore: 70,
    excellentScore: 85
  }
});
```

#### 3. 在scenario-builder.ts中注册训练场景

```typescript
this.scenarios.set('your-scenario-id', {
  id: 'your-scenario-id',
  title: '场景标题',
  description: '场景描述',
  roleId: 'your-role-id',
  category: '分类',
  context: '场景背景',
  userInput: '模拟用户输入',
  expectedBehavior: ['期望行为1', '期望行为2'],
  evaluationCriteria: {
    rubric: [
      {
        id: 'r1',
        criterion: '评估维度',
        weight: 0.4,
        indicators: ['指标1', '指标2']
      }
    ],
    passingScore: 70,
    excellentScore: 85
  },
  difficulty: 'medium',
  estimatedDuration: 8,
  tags: ['tag1', 'tag2']
});
```

---

## 📊 训练流程最佳实践

### 推荐训练顺序

1. **灵魂注入** (1-2分钟)
   - 选择合适的角色
   - 执行灵魂注入
   - 验证灵魂配置

2. **基础场景训练** (5-8分钟)
   - 从简单场景开始
   - 完成2-3个基础场景
   - 确保及格分数>70

3. **进阶场景训练** (8-10分钟)
   - 挑战困难场景
   - 目标分数>85
   - 识别并改进薄弱项

4. **能力验证** (2-3分钟)
   - 查看能力报告
   - 获取优化建议
   - 针对性补强

5. **正式上线** 
   - 所有场景通过
   - 总体得分>80
   - 人格一致性>90%

### 训练Tips

- ✅ **多次训练**: 同一场景可以多次训练,取最高分
- ✅ **关注反馈**: 仔细阅读每个场景的反馈意见
- ✅ **针对性改进**: 根据能力缺口选择练习场景
- ✅ **人格一致性**: 保持行为与角色人格一致
- ❌ **不要跳过基础**: 确保基础场景高分后再挑战进阶
- ❌ **不要忽视薄弱项**: 能力缺口会累积影响整体表现

---

## 🎯 与Truman训虾系统的对应关系

| Truman理念 | YiClaw实现 | 文件位置 |
|-----------|-----------|---------|
| 灵魂赋能 | SoulInjector | `soul/soul-injector.ts` |
| 最佳实践建模 | PracticeExtractor | `training/practice-extractor.ts` |
| 场景化训练 | ScenarioBuilder | `training/scenario-builder.ts` |
| 持续反馈循环 | TrainingFeedbackLoop | `training/feedback-loop.ts` |
| 角色深度建模 | CompetencyModel | `soul/competency-model.ts` |
| 人格一致性 | PersonalityCore | `soul/personality-core.ts` |

---

## 🔮 后续扩展方向

1. **更多专业角色** - 根据业务需求扩展角色库(如HR顾问、法务顾问等)
2. **自动场景生成** - 从业务文档自动生成训练场景
3. **多人协作训练** - 多个AI员工协同完成复杂任务
4. **实时能力监控** - 生产环境中的AI员工表现追踪
5. **灵魂市场** - 用户分享和下载灵魂模板
6. **Web可视化界面** - 训练控制台、能力雷达图、进度追踪

---

## 📝 技术栈

- **运行时**: Node.js 22+
- **框架**: Express + TypeScript
- **日志**: 自定义Logger系统
- **架构**: 插件化、模块化设计

---

## 🤝 贡献指南

欢迎贡献新的:
- AI员工角色模板
- 训练场景
- 最佳实践
- 能力模型

请参考现有代码风格,确保:
- 完整的TypeScript类型定义
- 详细的JSDoc注释
- 清晰的日志输出
- 合理的错误处理

---

**文档版本**: v1.0  
**创建日期**: 2026-04-02  
**基于**: Truman训虾系统理念 + YiClaw架构
