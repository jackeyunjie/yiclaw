# OpenClaw 插件系统快速开始

插件系统已完成初步实现，本文档说明如何使用。

---

## 已完成的组件

### 1. Plugin SDK (`packages/plugin-sdk/`)
核心接口定义：
- `Plugin` - 插件基接口
- `ChannelPlugin` - 通道插件（WebSocket/HTTP）
- `MemoryPlugin` - 记忆插件（存储/检索）
- `ToolPlugin` - 工具插件（AI 可调用的能力）

### 2. 插件加载器 (`apps/gateway/src/core/plugin-manager.ts`)
- 自动扫描 `plugins/` 目录
- 动态导入插件
- 管理插件生命周期（init → start → stop）

### 3. WebChat 插件 (`plugins/channels/web/`)
第一个完整的通道插件，提供：
- WebSocket 实时通信
- 用户认证
- 会话管理
- 消息收发

---

## 启动步骤

### 1. 安装依赖

```bash
# 根目录执行
pnpm install
```

### 2. 构建 Plugin SDK

```bash
# 构建 SDK
pnpm --filter @openclaw/plugin-sdk build
```

### 3. 构建 WebChannel 插件

```bash
# 构建插件
pnpm --filter @openclaw/plugin-web-channel build
```

### 4. 启动 Gateway

```bash
# 开发模式
pnpm --filter gateway dev

# 或生产模式
pnpm --filter gateway build
pnpm --filter gateway start
```

---

## 插件开发指南

### 创建一个新的通道插件（以 Telegram 为例）

```typescript
// plugins/channels/telegram/src/index.ts

import {
  ChannelPlugin,
  ChannelStatus,
  IncomingMessage,
  OutgoingMessage,
  MessageHandler,
  PluginType,
  Runtime,
} from '@openclaw/plugin-sdk';

export default class TelegramChannel implements ChannelPlugin {
  readonly id = 'telegram';
  readonly name = 'Telegram Bot';
  readonly version = '1.0.0';
  readonly type = PluginType.CHANNEL;

  private runtime?: Runtime;
  private messageHandler?: MessageHandler;

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;
    const token = runtime.getConfig<string>('telegram.botToken');
    // 初始化 Bot
  }

  async start(): Promise<void> {
    // 启动 Bot，监听消息
  }

  async stop(): Promise<void> {
    // 清理资源
  }

  async send(message: OutgoingMessage): Promise<void> {
    // 发送消息到 Telegram
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  getStatus(): ChannelStatus {
    return ChannelStatus.CONNECTED;
  }
}
```

### 目录结构

```
plugins/channels/telegram/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### package.json 模板

```json
{
  "name": "@openclaw/plugin-telegram-channel",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@openclaw/plugin-sdk": "workspace:*"
  }
}
```

---

## 下一步计划

### Phase 1 完成 ✅
- [x] Plugin SDK 核心接口
- [x] 插件加载器
- [x] WebChat 插件

### Phase 2 待完成
- [ ] Telegram 通道插件
- [ ] 微信通道插件
- [ ] 记忆系统插件化
- [ ] 工具系统插件化

### Phase 3 待完成
- [ ] 插件配置管理界面
- [ ] 插件热重载
- [ ] 第三方插件支持

---

## 架构优势

1. **松耦合**：每个插件独立开发和部署
2. **可扩展**：新增功能 = 新增插件，不影响现有代码
3. **可测试**：插件可独立测试
4. **可复用**：插件可在不同项目间复用

---

遇到问题？参考 `docs/PLUGIN_ARCHITECTURE.md` 获取完整架构设计。
