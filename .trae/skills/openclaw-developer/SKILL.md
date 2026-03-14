---
name: "openclaw-developer"
description: "OpenClaw 个人 AI 助手项目的开发技能。Invoke when developing features for the OpenClaw assistant project, implementing channels, AI models, or tools."
---

# OpenClaw 开发者技能

## 技能概述

此技能用于指导 OpenClaw 个人 AI 助手项目的开发工作，包括：
- 多通道接入（微信、Telegram、飞书等）
- AI 模型路由与管理
- 工具系统开发
- 会话管理
- Web 界面开发

## 项目架构

```
openclaw/
├── apps/
│   ├── gateway/          # Node.js + Express + Socket.io 网关服务
│   └── web/              # React + TypeScript 前端
├── packages/
│   ├── shared/           # 共享类型和工具
│   └── ai-sdk/           # AI 模型 SDK 封装
├── prisma/               # 数据库 Schema
└── docs/                 # 项目文档
```

## 核心规范

### 1. 代码规范
- **语言**: TypeScript (严格模式)
- **运行时**: Node.js ≥ 22
- **命名**: PascalCase (类/组件), camelCase (函数/变量), snake_case (数据库字段)
- **注释**: 中文详细注释

### 2. 数据库规范
- 使用 Prisma ORM
- 表名: 小写下划线 (e.g., `model_configs`)
- 所有表必须有 `created_at` 和 `updated_at`
- 敏感字段加密存储

### 3. API 规范
- REST API: `/api/v1/...`
- WebSocket 事件: `chat:message`, `chat:stream`, `session:update`
- 统一响应格式: `{ success, data, error }`

## 开发检查清单

### 新增功能时
- [ ] 阅读相关设计文档 (docs/openclaw-assistant/DESIGN_*.md)
- [ ] 检查是否需要更新数据库 Schema
- [ ] 编写单元测试
- [ ] 更新 API 文档
- [ ] 运行 lint 检查

### 修改代码时
- [ ] 保持与现有代码风格一致
- [ ] 添加中文注释
- [ ] 敏感信息使用环境变量
- [ ] 错误处理完善

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 数据库迁移
pnpm db:migrate

# 代码检查
pnpm lint

# 格式化
pnpm format
```

## 模型路由配置示例

```typescript
// 三级配置策略
const modelConfig = {
  global: {
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  },
  sections: {
    coding: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet'
    }
  },
  nodes: {
    tool_call: {
      provider: 'openai',
      model: 'gpt-4'
    }
  }
};
```

## 通道适配器模板

```typescript
export class ChannelAdapter {
  readonly type: ChannelType;
  
  async initialize(): Promise<void> {
    // 初始化连接
  }
  
  async send(to: string, content: string): Promise<void> {
    // 发送消息
  }
  
  async handleMessage(rawMessage: unknown): Promise<void> {
    // 处理接收消息
    // 1. 格式转换
    // 2. 查找/创建会话
    // 3. 调用 AI 模型
    // 4. 发送响应
  }
}
```

## 工具开发模板

```typescript
const myTool: Tool = {
  name: 'tool_name',
  description: '工具描述',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '参数说明' }
    },
    required: ['param1']
  },
  async execute(params) {
    // 工具逻辑
    return { success: true, data: result };
  }
};
```

## 文档引用

开发前请阅读：
1. [项目规则](file:///d:/Antigravity/opc/openclaw/.trae/rules/project_rules.md) - 代码规范
2. [架构设计](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/DESIGN_openclaw-assistant.md) - 系统架构
3. [任务拆分](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/TASK_openclaw-assistant.md) - 开发任务

## 注意事项

1. **不要提交敏感信息**到 Git (API Keys、密码等)
2. **所有 API 需要认证** (除登录/注册)
3. **流式响应**使用 AsyncIterable
4. **错误处理**要返回友好错误信息
5. **数据库操作**使用事务保证一致性
