# 已创建的插件列表

> 本次迭代完成的 4 个新插件

---

## 插件总览

| 插件 | 类型 | 路径 | 功能 |
|------|------|------|------|
| **memory-database** | Memory | `plugins/memories/database/` | PostgreSQL 存储记忆 |
| **tool-file** | Tool | `plugins/tools/file/` | 文件读写操作 |
| **web-channel** | Channel | `plugins/channels/web/` | WebSocket 聊天 |
| **feishu-channel** | Channel | `plugins/channels/feishu/` | 飞书 Bot 通道 |

---

## 1. Memory Database Plugin

### 功能
- 使用 Prisma + PostgreSQL 存储用户记忆
- 支持多种记忆类型：对话、目标、事实、技能、偏好
- 支持文本检索和时间范围过滤
- 提供统计信息查询

### 配置
```typescript
{
  "memory": {
    "database": {
      "databaseUrl": "postgresql://...",
      "defaultLimit": 20,
      "maxLimit": 100
    }
  }
}
```

### 使用方法
```typescript
const memory = pluginManager.getPlugin<MemoryPlugin>('memory-database');

// 存储记忆
await memory.store({
  userId: 'user-123',
  type: MemoryType.CONVERSATION,
  content: '用户记住了...',
});

// 检索记忆
const results = await memory.retrieve({
  userId: 'user-123',
  text: '关键词',
  limit: 10,
});
```

---

## 2. File Tool Plugin

### 功能
- 读取文件内容（带大小限制）
- 写入文件（支持 UTF-8 和 Base64）
- 列出目录（支持递归）
- 删除文件/目录
- 检查文件存在
- 路径安全检查（防止目录遍历）

### 配置
```typescript
{
  "tools": {
    "file": {
      "baseDir": "/path/to/allowed/dir",
      "allowWrite": true,
      "allowDelete": false,
      "maxFileSize": 10485760  // 10MB
    }
  }
}
```

### AI Function Calling 定义
```typescript
{
  name: 'file_operations',
  description: '读取、写入、列出和管理文件',
  parameters: {
    operation: 'read' | 'write' | 'list' | 'delete' | 'exists',
    path: '文件路径',
    content: '写入内容',
    encoding: 'utf-8' | 'base64',
    recursive: true | false
  }
}
```

---

## 3. Web Channel Plugin

### 功能
- WebSocket 实时通信
- 用户认证（JWT 预留）
- 会话管理（加入/离开）
- 消息收发（支持流式）
- 打字指示器
- 在线用户统计

### Socket.io 事件

**客户端 -> 服务器**
- `auth` - 用户认证
- `session:join` - 加入会话
- `session:leave` - 离开会话
- `message` - 发送消息
- `typing` - 打字状态

**服务器 -> 客户端**
- `auth:success` - 认证成功
- `session:joined` - 加入成功
- `message` - 收到消息
- `typing` - 对方打字状态

### 配置
```typescript
{
  "web": {
    "port": 3000,
    "cors": {
      "origin": ["http://localhost:5173"],
      "credentials": true
    }
  }
}
```

---

## 4. Feishu Channel Plugin

### 功能
- 飞书 Bot 消息收发
- 支持私聊和群聊
- 支持文本、图片、文件消息
- 自动刷新访问令牌
- Webhook 事件处理

### 配置
```typescript
{
  "feishu": {
    "appId": "cli_xxxxx",
    "appSecret": "xxxxxxxx",
    "encryptKey": "可选",
    "verificationToken": "可选",
    "webhookPort": 3002,
    "webhookPath": "/webhook/feishu"
  }
}
```

### 飞书后台配置
1. 在飞书开放平台创建应用
2. 开启机器人能力
3. 配置事件订阅：
   - 请求地址：`https://your-domain/webhook/feishu`
   - 订阅事件：`im.message.receive_v1`
4. 获取 App ID 和 App Secret

---

## 构建和运行

### 安装依赖
```bash
pnpm install
```

### 构建所有插件
```bash
# SDK
pnpm --filter @openclaw/plugin-sdk build

# 插件
pnpm --filter @openclaw/plugin-web-channel build
pnpm --filter @openclaw/plugin-feishu-channel build
pnpm --filter @openclaw/plugin-memory-database build
pnpm --filter @openclaw/plugin-tool-file build
```

### 开发模式
```bash
# 自动构建所有
pnpm --filter @openclaw/plugin-sdk dev &
pnpm --filter @openclaw/plugin-web-channel dev &
```

### 启动 Gateway
```bash
pnpm --filter gateway dev
```

---

## 下一步

1. **测试验证** - 确保所有插件正常工作
2. **迁移现有数据** - 将现有记忆数据迁移到新插件
3. **添加更多工具** - shell、http、database 工具
4. **Telegram 插件** - 另一个流行的 IM 平台
5. **插件配置界面** - 前端管理插件配置

---

## 架构验证

所有插件遵循 **SOUL.md** 第一性原理：

| 原理 | 验证 |
|------|------|
| **记忆即身份** | MemoryPlugin 抽象，支持多种存储后端 |
| **通道即界面** | ChannelPlugin 统一接口，Web/飞书一致 |
| **工具即能力** | ToolPlugin 可扩展，AI 可直接调用 |
| **模型即引擎** | 与模型解耦，通过 Runtime 交互 |
| **安全即底线** | 路径安全检查、Token 管理、权限控制 |
