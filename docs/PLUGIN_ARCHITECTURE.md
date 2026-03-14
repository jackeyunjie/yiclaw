# OpenClaw 插件化架构重构方案

> 深度借鉴 GitHub OpenClaw (elizaOS) 的插件设计，同时保持我们的 AI 员工定位

---

## 一、目标架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw Core                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Runtime    │  │ PluginLoader │  │   Context Engine     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Channel Plugins│  │  Memory Plugins │  │   Tool Plugins  │
│  - web          │  │  - database     │  │  - file         │
│  - telegram     │  │  - lancedb      │  │  - shell        │
│  - wechat       │  │  - redis        │  │  - http         │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 二、核心接口设计

### 2.1 插件基接口

```typescript
// packages/plugin-sdk/src/types/plugin.ts

export interface Plugin {
  /** 插件唯一标识 */
  readonly id: string;

  /** 插件名称 */
  readonly name: string;

  /** 插件版本 */
  readonly version: string;

  /** 插件类型 */
  readonly type: PluginType;

  /** 插件描述 */
  readonly description?: string;

  /** 初始化插件 */
  init(runtime: Runtime): Promise<void> | void;

  /** 启动插件 */
  start(): Promise<void> | void;

  /** 停止插件 */
  stop(): Promise<void> | void;
}

export enum PluginType {
  CHANNEL = 'channel',    // 消息通道
  MEMORY = 'memory',      // 记忆存储
  TOOL = 'tool',          // 工具能力
  AGENT = 'agent',        // AI Agent
  SKILL = 'skill',        // 组合技能
}

export interface Runtime {
  /** 获取配置 */
  getConfig<T>(key: string): T | undefined;

  /** 注册能力 */
  register(capability: Capability): void;

  /** 获取其他插件 */
  getPlugin<T extends Plugin>(id: string): T | undefined;

  /** 事件总线 */
  events: EventBus;

  /** 日志 */
  logger: Logger;
}
```

### 2.2 通道插件接口

```typescript
// packages/plugin-sdk/src/types/channel.ts

export interface ChannelPlugin extends Plugin {
  readonly type: PluginType.CHANNEL;

  /** 发送消息 */
  send(message: OutgoingMessage): Promise<void>;

  /** 注册消息处理器 */
  onMessage(handler: (message: IncomingMessage) => void): void;

  /** 获取通道状态 */
  getStatus(): ChannelStatus;
}

export interface IncomingMessage {
  id: string;
  channel: string;
  userId: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  channel: string;
  userId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export enum ChannelStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}
```

### 2.3 记忆插件接口

```typescript
// packages/plugin-sdk/src/types/memory.ts

export interface MemoryPlugin extends Plugin {
  readonly type: PluginType.MEMORY;

  /** 存储记忆 */
  store(memory: Memory): Promise<void>;

  /** 检索记忆 */
  retrieve(query: MemoryQuery): Promise<Memory[]>;

  /** 删除记忆 */
  delete(memoryId: string): Promise<void>;
}

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  GOAL = 'goal',
  FACT = 'fact',
  SKILL = 'skill',
}

export interface MemoryQuery {
  userId: string;
  text?: string;
  type?: MemoryType;
  limit?: number;
}
```

### 2.4 工具插件接口

```typescript
// packages/plugin-sdk/src/types/tool.ts

export interface ToolPlugin extends Plugin {
  readonly type: PluginType.TOOL;

  /** 获取工具定义（用于 AI function calling） */
  getDefinition(): ToolDefinition;

  /** 执行工具 */
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

---

## 三、目录结构重构

```
openclaw/
├── packages/
│   ├── plugin-sdk/              # 插件开发 SDK
│   │   ├── src/
│   │   │   ├── types/          # 核心接口定义
│   │   │   │   ├── plugin.ts
│   │   │   │   ├── channel.ts
│   │   │   │   ├── memory.ts
│   │   │   │   └── tool.ts
│   │   │   ├── runtime.ts      # 运行时实现
│   │   │   ├── loader.ts       # 插件加载器
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                  # 共享类型（保留）
│
├── plugins/                     # 插件目录（新增）
│   ├── channels/               # 通道插件
│   │   ├── web/               # WebChat 通道
│   │   ├── telegram/          # Telegram 通道
│   │   └── wechat/            # 微信通道
│   │
│   ├── memories/               # 记忆插件
│   │   ├── database/          # PostgreSQL 实现
│   │   └── lancedb/           # 向量存储（可选）
│   │
│   └── tools/                  # 工具插件
│       ├── file/              # 文件操作
│       ├── shell/             # Shell 命令
│       └── http/              # HTTP 请求
│
├── apps/
│   ├── gateway/                # 后端服务
│   │   ├── src/
│   │   │   ├── core/          # 核心运行时（新增）
│   │   │   │   ├── runtime.ts
│   │   │   │   └── plugin-manager.ts
│   │   │   ├── channels/      # 迁移到插件
│   │   │   ├── memory/        # 迁移到插件
│   │   │   └── tools/         # 迁移到插件
│   │   └── package.json
│   │
│   └── web/                    # 前端（保持不变）
│
└── docs/
    ├── SOUL.md                 # 灵魂文档（已创建）
    └── PLUGIN_ARCHITECTURE.md  # 本文档
```

---

## 四、重构路线图

### Phase 1: 插件基础设施（本周）

**任务 1.1: 创建 plugin-sdk 包**
- [ ] 创建 `packages/plugin-sdk/` 目录
- [ ] 定义核心接口（Plugin, Channel, Memory, Tool）
- [ ] 实现 Runtime 上下文
- [ ] 实现基础 Logger 和 EventBus

**任务 1.2: 实现插件加载器**
- [ ] 扫描 `plugins/` 目录
- [ ] 动态导入插件
- [ ] 插件依赖解析
- [ ] 插件生命周期管理

**任务 1.3: 改造 Gateway 支持插件**
- [ ] 创建 PluginManager
- [ ] 初始化 Runtime 上下文
- [ ] 插件配置管理

### Phase 2: 现有功能插件化（下周）

**任务 2.1: WebChat 通道插件化**
- [ ] 创建 `plugins/channels/web/`
- [ ] 实现 ChannelPlugin 接口
- [ ] 迁移现有 WebSocket 逻辑
- [ ] 测试验证

**任务 2.2: 记忆系统插件化**
- [ ] 创建 `plugins/memories/database/`
- [ ] 实现 MemoryPlugin 接口
- [ ] 迁移 Prisma 相关逻辑

**任务 2.3: 工具系统插件化**
- [ ] 创建 `plugins/tools/file/`, `shell/`, `http/`
- [ ] 实现 ToolPlugin 接口
- [ ] 迁移现有工具

### Phase 3: 新增通道插件（第 3 周）

**任务 3.1: Telegram 通道**
- [ ] 创建 `plugins/channels/telegram/`
- [ ] 实现 Bot 消息收发
- [ ] Webhook 支持

**任务 3.2: 微信通道**
- [ ] 企业微信 API 接入
- [ ] 个人号 Wechaty 接入

### Phase 4: 高级功能（第 4 周）

**任务 4.1: 向量记忆插件**
- [ ] LanceDB 集成
- [ ] 语义检索

**任务 4.2: 插件配置管理**
- [ ] 前端插件管理界面
- [ ] 插件启用/禁用
- [ ] 插件配置持久化

---

## 五、代码示例

### 5.1 创建一个通道插件

```typescript
// plugins/channels/web/src/index.ts

import { ChannelPlugin, Runtime, PluginType } from '@openclaw/plugin-sdk';
import { Server } from 'socket.io';

export default class WebChannel implements ChannelPlugin {
  readonly id = 'web';
  readonly name = 'Web Chat';
  readonly version = '1.0.0';
  readonly type = PluginType.CHANNEL;
  readonly description = 'WebSocket-based web chat channel';

  private io: Server;
  private messageHandler: ((msg: any) => void) | null = null;
  private runtime: Runtime;

  async init(runtime: Runtime): Promise<void> {
    this.runtime = runtime;
    this.io = new Server({
      cors: { origin: '*' }
    });

    this.io.on('connection', (socket) => {
      socket.on('message', (data) => {
        this.messageHandler?.({
          id: generateId(),
          channel: 'web',
          userId: socket.userId,
          content: data.content,
          timestamp: new Date(),
        });
      });
    });

    this.runtime.logger.info('Web channel initialized');
  }

  async start(): Promise<void> {
    const port = this.runtime.getConfig<number>('web.port') || 3001;
    this.io.listen(port);
    this.runtime.logger.info(`Web channel listening on port ${port}`);
  }

  async stop(): Promise<void> {
    this.io.close();
  }

  async send(message: OutgoingMessage): Promise<void> {
    this.io.to(`user:${message.userId}`).emit('message', message);
  }

  onMessage(handler: (message: IncomingMessage) => void): void {
    this.messageHandler = handler;
  }

  getStatus() {
    return ChannelStatus.CONNECTED;
  }
}
```

### 5.2 插件加载配置

```typescript
// apps/gateway/src/core/plugin-manager.ts

import { Plugin, Runtime } from '@openclaw/plugin-sdk';
import { glob } from 'glob';
import path from 'path';

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private runtime: Runtime;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
  }

  async loadFromDirectory(dir: string): Promise<void> {
    // 扫描所有插件入口
    const pluginDirs = await glob('*/index.ts', { cwd: dir });

    for (const pluginPath of pluginDirs) {
      const fullPath = path.join(dir, pluginPath);
      const PluginClass = (await import(fullPath)).default;
      const plugin: Plugin = new PluginClass();

      // 初始化
      await plugin.init(this.runtime);
      this.plugins.set(plugin.id, plugin);

      this.runtime.logger.info(`Loaded plugin: ${plugin.name}@${plugin.version}`);
    }
  }

  async startAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.start();
    }
  }

  async stopAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.stop();
    }
  }

  getPlugin<T extends Plugin>(id: string): T | undefined {
    return this.plugins.get(id) as T;
  }

  getPluginsByType<T extends Plugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values())
      .filter(p => p.type === type) as T[];
  }
}
```

### 5.3 使用插件

```typescript
// apps/gateway/src/server.ts

import { PluginManager } from './core/plugin-manager';
import { createRuntime } from './core/runtime';
import { ChannelPlugin } from '@openclaw/plugin-sdk';

async function main() {
  // 创建运行时
  const runtime = createRuntime({
    config: loadConfig(),
    logger: createLogger(),
  });

  // 加载插件
  const pluginManager = new PluginManager(runtime);
  await pluginManager.loadFromDirectory('./plugins/channels');
  await pluginManager.loadFromDirectory('./plugins/memories');
  await pluginManager.loadFromDirectory('./plugins/tools');

  // 启动所有插件
  await pluginManager.startAll();

  // 使用通道插件
  const webChannel = pluginManager.getPlugin<ChannelPlugin>('web');
  webChannel?.onMessage((msg) => {
    // 处理消息...
  });

  // 优雅关闭
  process.on('SIGTERM', async () => {
    await pluginManager.stopAll();
    process.exit(0);
  });
}

main();
```

---

## 六、保持与 SOUL 的对齐

| SOUL 第一性原理 | 插件架构如何支持 |
|----------------|-----------------|
| **记忆即身份** | MemoryPlugin 抽象，支持多种存储后端，记忆永不丢失 |
| **通道即界面** | ChannelPlugin 统一接口，任意通道都能接入 |
| **工具即能力** | ToolPlugin 按需加载，能力可扩展 |
| **模型即引擎** | AgentPlugin 可切换不同模型实现 |
| **安全即底线** | 插件沙箱运行，权限控制，审计日志 |

---

## 七、下一步行动

**本周立即执行：**

1. **创建分支** `feature/plugin-architecture`
2. **实现 plugin-sdk** 核心接口（约 4 小时）
3. **迁移 WebChat** 作为第一个插件（约 6 小时）
4. **验证可行性**（约 2 小时）

**需要的决策：**

- [ ] 是否保留现有数据库结构？（建议保留，仅抽象访问层）
- [ ] 是否支持 TypeScript 以外的插件？（建议先专注 TS）
- [ ] 插件热重载是否需要？（建议 Phase 2 再实现）

---

**准备开始 Phase 1 吗？**（回复"开始"或提出疑问）
