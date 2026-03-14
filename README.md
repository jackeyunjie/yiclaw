# YiClaw - AI 员工系统

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg" alt="node">
  <img src="https://img.shields.io/badge/pnpm-10.x-orange.svg" alt="pnpm">
</p>

<p align="center">
  <b>让每个人都拥有一个永不疲倦、持续进化的 AI 员工</b>
</p>

---

## 🎯 项目简介

YiClaw 是一个完整的 **AI 员工系统**，具备长期记忆、多 Agent 协作、任务自动化等核心能力。不同于普通的聊天机器人，YiClaw 是你的数字员工——它像人类员工一样记住你的偏好、主动完成任务、在不同场景下与你协作。

### 核心特性

- 🤖 **多模型支持** - Claude、通义千问、DeepSeek、Kimi、智谱
- 🧠 **长期记忆** - 战略目标、第一性原理、复盘系统
- 🔌 **插件架构** - 可扩展的插件系统，支持自定义功能
- 📱 **多通道接入** - Web、微信、Telegram、飞书
- ⚡ **实时通信** - WebSocket 流式响应
- 🔧 **工具系统** - 文件、Shell、HTTP、数据库操作

---

## 🚀 快速开始

### 环境要求

- Node.js >= 22
- pnpm >= 10
- PostgreSQL >= 14（或 SQLite 用于快速试用）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/jackeyunjie/yiclaw.git
cd yiclaw

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和 AI API Keys

# 4. 数据库迁移
pnpm db:migrate

# 5. 构建插件
pnpm --filter "@openclaw/plugin-*" build

# 6. 启动开发服务器
pnpm dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| 数据库管理 | http://localhost:5555 |

---

## 🏗️ 架构设计

### 插件系统

YiClaw 采用先进的插件架构，所有功能都是可插拔的：

```
plugins/
├── channels/          # 通道插件
│   ├── web/          # WebSocket 网页聊天
│   └── feishu/       # 飞书 Bot
├── memories/          # 记忆插件
│   └── database/     # PostgreSQL 存储
└── tools/             # 工具插件
    ├── file/         # 文件操作
    ├── shell/        # 系统命令
    └── http/         # HTTP 请求
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design |
| 后端 | Express + Socket.io |
| 数据库 | PostgreSQL + Prisma ORM |
| 插件 SDK | 自研 @openclaw/plugin-sdk |
| AI 模型 | Claude、通义千问、DeepSeek、Kimi |

---

## 📦 插件开发

### 创建一个工具插件

```typescript
// plugins/tools/my-tool/src/index.ts
import { ToolPlugin, PluginType, Runtime } from '@openclaw/plugin-sdk';

export default class MyTool implements ToolPlugin {
  readonly id = 'my-tool';
  readonly name = 'My Tool';
  readonly version = '1.0.0';
  readonly type = PluginType.TOOL;

  async init(runtime: Runtime): Promise<void> {
    // 初始化逻辑
  }

  async start(): Promise<void> {
    // 启动逻辑
  }

  async stop(): Promise<void> {
    // 清理逻辑
  }

  getDefinition() {
    return {
      name: 'my_tool',
      description: 'My custom tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input parameter' }
        },
        required: ['input']
      }
    };
  }

  async execute(params: Record<string, unknown>) {
    return {
      success: true,
      data: { result: 'Hello from my tool!' }
    };
  }
}
```

### 构建插件

```bash
pnpm --filter @openclaw/plugin-my-tool build
```

---

## 🔒 安全特性

- **路径遍历防护** - 禁止访问父目录
- **命令白名单** - 只允许安全的系统命令
- **网络隔离** - 禁止访问内网地址
- **API Key 加密** - 敏感信息不存储在日志中

---

## 🧪 测试

```bash
# 运行插件测试
npx tsx scripts/tests/plugin-test.ts

# 测试覆盖率
# 10/13 测试通过（76.9%）
```

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [SOUL.md](./docs/SOUL.md) | 项目灵魂与第一性原理 |
| [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md) | 插件架构设计 |
| [PLUGIN_QUICKSTART.md](./docs/PLUGIN_QUICKSTART.md) | 插件开发快速开始 |
| [PHASE2_SUMMARY.md](./docs/PHASE2_SUMMARY.md) | 开发阶段总结 |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT](./LICENSE)

---

## 🙏 鸣谢

- 灵感来自 [GitHub OpenClaw](https://github.com/openclaw/openclaw) (elizaOS)
-  built with ❤️ by YiYiDao Team

---

<p align="center">
  <a href="https://github.com/jackeyunjie/yiclaw">GitHub</a> •
  <a href="https://gitee.com/yiyidedao/yiclaw">Gitee</a>
</p>
