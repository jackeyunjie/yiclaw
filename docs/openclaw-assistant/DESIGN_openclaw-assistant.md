# OpenClaw 个人 AI 助手 - 架构设计文档

## 1. 系统架构总览

### 1.1 整体架构图

```mermaid
graph TB
    subgraph 客户端层
        WebChat[WebChat<br/>React]
        Admin[管理后台<br/>React]
        Mobile[移动端<br/>预留]
    end

    subgraph Gateway网关层
        API[REST API<br/>Express]
        WS[WebSocket<br/>Socket.io]
        Auth[JWT认证]
    end

    subgraph 核心服务层
        SessionMgr[会话管理]
        ChannelMgr[通道管理]
        ModelRouter[模型路由]
        ToolRegistry[工具注册]
        EventBus[事件总线]
    end

    subgraph 适配层
        WeChatAdapter[微信适配器]
        TelegramAdapter[Telegram适配器]
        FeishuAdapter[飞书适配器]
    end

    subgraph AI模型层
        OpenAI[OpenAI SDK]
        Anthropic[Anthropic SDK]
        Qwen[通义千问]
        Ollama[Ollama本地]
    end

    subgraph 数据层
        MySQL[(MySQL<br/>RDS)]
        Redis[(Redis<br/>缓存)]
    end

    WebChat --> WS
    Admin --> API
    
    WS --> Auth
    API --> Auth
    
    Auth --> SessionMgr
    Auth --> ChannelMgr
    Auth --> ModelRouter
    Auth --> ToolRegistry
    
    SessionMgr --> MySQL
    ChannelMgr --> WeChatAdapter
    ChannelMgr --> TelegramAdapter
    ChannelMgr --> FeishuAdapter
    
    ModelRouter --> OpenAI
    ModelRouter --> Anthropic
    ModelRouter --> Qwen
    ModelRouter --> Ollama
    
    ToolRegistry --> EventBus
    EventBus --> MySQL
    
    MySQL -.-> Redis
```

### 1.2 分层架构说明

| 层级 | 职责 | 技术栈 |
|------|------|--------|
| **客户端层** | 用户交互界面 | React, TypeScript, TailwindCSS |
| **网关层** | 请求接入、认证、路由 | Express, Socket.io, JWT |
| **核心服务层** | 业务逻辑处理 | TypeScript, 依赖注入 |
| **适配层** | 第三方通道适配 | 各平台 SDK |
| **AI 模型层** | 模型调用与路由 | OpenAI SDK, Anthropic SDK |
| **数据层** | 数据持久化 | MySQL, Redis, Prisma |

---

## 2. 核心模块设计

### 2.1 网关模块 (Gateway)

#### 职责
- HTTP API 服务
- WebSocket 实时通信
- 请求认证与授权
- 路由分发

#### 类图

```mermaid
classDiagram
    class GatewayServer {
        +express: Express
        +io: Server
        +start()
        +stop()
    }
    
    class AuthMiddleware {
        +verifyToken()
        +refreshToken()
    }
    
    class RouteRegistry {
        +routes: Map
        +register()
        +getHandler()
    }
    
    class WebSocketManager {
        +connections: Map
        +broadcast()
        +emitToUser()
    }
    
    GatewayServer --> AuthMiddleware
    GatewayServer --> RouteRegistry
    GatewayServer --> WebSocketManager
```

#### 接口定义
```typescript
// 网关配置
interface GatewayConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  websocket: {
    pingInterval: number;
    pingTimeout: number;
  };
}

// WebSocket 事件
interface WebSocketEvents {
  // 客户端事件
  'chat:message': ChatMessagePayload;
  'chat:typing': TypingPayload;
  'session:create': CreateSessionPayload;
  'session:close': CloseSessionPayload;
  
  // 服务器事件
  'chat:response': ChatResponsePayload;
  'chat:stream': StreamChunkPayload;
  'chat:error': ErrorPayload;
  'session:update': SessionUpdatePayload;
}
```

---

### 2.2 会话管理模块 (Session Manager)

#### 职责
- 会话生命周期管理
- 上下文维护
- 消息历史存储

#### 类图

```mermaid
classDiagram
    class SessionManager {
        +createSession(config): Session
        +getSession(id): Session
        +closeSession(id)
        +getUserSessions(userId): Session[]
    }
    
    class Session {
        +id: string
        +userId: string
        +channelType: ChannelType
        +modelConfig: ModelConfig
        +messages: Message[]
        +createdAt: Date
        +addMessage(message)
        +getContext(): Message[]
    }
    
    class Message {
        +id: string
        +sessionId: string
        +role: 'user' | 'assistant' | 'system'
        +content: string
        +modelUsed?: string
        +tokens?: number
        +createdAt: Date
    }
    
    SessionManager --> Session
    Session --> Message
```

#### 数据模型
```prisma
model Session {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  channelType String      @map("channel_type")
  title       String?
  modelConfig Json?       @map("model_config")
  status      SessionStatus @default(ACTIVE)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id])
  messages Message[]

  @@index([userId, status])
  @@index([createdAt])
  @@map("sessions")
}

model Message {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  role      MessageRole
  content   String   @db.Text
  modelUsed String?  @map("model_used")
  tokens    Int?
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
  @@map("messages")
}
```

---

### 2.3 模型路由模块 (Model Router)

#### 职责
- 多模型提供商管理
- 智能模型选择
- 故障转移与重试
- 成本优化

#### 类图

```mermaid
classDiagram
    class ModelRouter {
        +providers: Map~string, ModelProvider~
        +selectModel(context): ModelProvider
        +routeRequest(request): Response
        +registerProvider(provider)
    }
    
    class ModelProvider {
        <<interface>>
        +name: string
        +chat(messages, options): Stream~Response~
        +validateConfig()
        +getModels(): string[]
    }
    
    class OpenAIProvider {
        +client: OpenAI
        +chat()
    }
    
    class AnthropicProvider {
        +client: Anthropic
        +chat()
    }
    
    class OllamaProvider {
        +baseUrl: string
        +chat()
    }
    
    class ModelConfigManager {
        +getGlobalDefault(): ModelConfig
        +getSectionConfig(section): ModelConfig
        +getNodeConfig(nodeType): ModelConfig
    }
    
    ModelRouter --> ModelProvider
    ModelRouter --> ModelConfigManager
    ModelProvider <|-- OpenAIProvider
    ModelProvider <|-- AnthropicProvider
    ModelProvider <|-- OllamaProvider
```

#### 模型选择策略

```typescript
// 模型选择上下文
interface ModelSelectionContext {
  nodeType?: 'chat' | 'tool' | 'summary' | 'image';
  section?: 'coding' | 'writing' | 'chat' | 'analysis';
  messageType?: 'text' | 'image' | 'code' | 'longtext';
  priority?: 'speed' | 'quality' | 'cost';
  userPreference?: string;
}

// 模型配置层级
interface ModelRoutingConfig {
  // 全局默认
  global: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  
  // 板块级别配置
  sections: {
    [section: string]: {
      provider: string;
      model: string;
      temperature?: number;
      systemPrompt?: string;
    };
  };
  
  // 节点级别配置
  nodes: {
    [nodeType: string]: {
      provider: string;
      model: string;
      tools?: string[];
    };
  };
  
  // 故障转移配置
  fallback: {
    enabled: boolean;
    providers: string[];
    retryCount: number;
  };
}

// 选择算法
function selectModel(context: ModelSelectionContext, config: ModelRoutingConfig): ModelConfig {
  // 1. 检查节点级别配置
  if (context.nodeType && config.nodes[context.nodeType]) {
    return config.nodes[context.nodeType];
  }
  
  // 2. 检查板块级别配置
  if (context.section && config.sections[context.section]) {
    return config.sections[context.section];
  }
  
  // 3. 使用全局默认
  return config.global;
}
```

---

### 2.4 通道管理模块 (Channel Manager)

#### 职责
- 多通道生命周期管理
- 消息格式转换
- 通道状态监控

#### 类图

```mermaid
classDiagram
    class ChannelManager {
        +adapters: Map~ChannelType, ChannelAdapter~
        +registerAdapter(adapter)
        +sendMessage(channelType, message)
        +receiveMessage(channelType, rawMessage)
    }
    
    class ChannelAdapter {
        <<interface>>
        +type: ChannelType
        +initialize()
        +send(message)
        +onMessage(callback)
        +getStatus(): ChannelStatus
    }
    
    class WeChatAdapter {
        +type = 'wechat'
        +client: Wechaty
        +initialize()
        +send()
    }
    
    class TelegramAdapter {
        +type = 'telegram'
        +bot: Telegraf
        +initialize()
        +send()
    }
    
    class FeishuAdapter {
        +type = 'feishu'
        +client: LarkClient
        +initialize()
        +send()
    }
    
    class MessageFormatter {
        +formatForChannel(message, channelType): FormattedMessage
        +parseFromChannel(rawMessage, channelType): Message
    }
    
    ChannelManager --> ChannelAdapter
    ChannelManager --> MessageFormatter
    ChannelAdapter <|-- WeChatAdapter
    ChannelAdapter <|-- TelegramAdapter
    ChannelAdapter <|-- FeishuAdapter
```

#### 消息格式标准

```typescript
// 统一消息格式
interface UnifiedMessage {
  id: string;
  sessionId: string;
  channelType: ChannelType;
  channelMessageId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: {
    type: 'text' | 'image' | 'file' | 'voice';
    text?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp: Date;
  rawData?: unknown;
}

// 通道类型
enum ChannelType {
  WECHAT_PERSONAL = 'wechat_personal',
  WECHAT_WORK = 'wechat_work',
  TELEGRAM = 'telegram',
  FEISHU = 'feishu',
  DINGTALK = 'dingtalk', // 预留
  WEBCHAT = 'webchat'
}
```

---

### 2.5 工具系统模块 (Tool System)

#### 职责
- 工具注册与发现
- 工具调用执行
- 工具权限管理

#### 类图

```mermaid
classDiagram
    class ToolRegistry {
        +tools: Map~string, Tool~
        +register(tool)
        +unregister(name)
        +getTool(name): Tool
        +listTools(): Tool[]
        +execute(name, params)
    }
    
    class Tool {
        <<interface>>
        +name: string
        +description: string
        +parameters: JSONSchema
        +execute(params): Promise~ToolResult~
    }
    
    class TimeTool {
        +name = 'get_current_time'
        +execute()
    }
    
    class WeatherTool {
        +name = 'get_weather'
        +execute()
    }
    
    class CalculatorTool {
        +name = 'calculate'
        +execute()
    }
    
    class ToolExecutor {
        +executeWithTimeout(tool, params, timeout)
        +validateParams(tool, params)
    }
    
    ToolRegistry --> Tool
    ToolRegistry --> ToolExecutor
    Tool <|-- TimeTool
    Tool <|-- WeatherTool
    Tool <|-- CalculatorTool
```

#### 工具定义格式

```typescript
// 工具接口
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

// 工具执行结果
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTime: number;
    [key: string]: unknown;
  };
}

// 示例：天气工具
const weatherTool: Tool = {
  name: 'get_weather',
  description: '获取指定城市的天气信息',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '城市名称，如：北京、上海'
      },
      days: {
        type: 'number',
        description: '预报天数，1-7天',
        enum: [1, 3, 7]
      }
    },
    required: ['city']
  },
  async execute(params) {
    const { city, days = 1 } = params;
    // 调用天气 API
    const weather = await fetchWeather(city, days);
    return {
      success: true,
      data: weather
    };
  }
};
```

---

## 3. 数据库设计

### 3.1 ER 图

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ MODEL_CONFIG : owns
    SESSION ||--o{ MESSAGE : contains
    SESSION ||--|| CHANNEL_CONFIG : uses
    
    USER {
        string id PK
        string username
        string password_hash
        string role
        datetime created_at
        datetime updated_at
    }
    
    SESSION {
        string id PK
        string user_id FK
        string channel_type
        string title
        json model_config
        string status
        datetime created_at
        datetime updated_at
    }
    
    MESSAGE {
        string id PK
        string session_id FK
        string role
        text content
        string model_used
        int tokens
        json metadata
        datetime created_at
    }
    
    MODEL_CONFIG {
        string id PK
        string user_id FK
        string name
        string provider
        string model_id
        string api_key_encrypted
        boolean is_default
        json config
        datetime created_at
    }
    
    CHANNEL_CONFIG {
        string id PK
        string channel_type
        json config
        boolean is_enabled
        datetime created_at
    }
```

### 3.2 完整 Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id            String         @id @default(uuid())
  username      String         @unique
  passwordHash  String         @map("password_hash")
  role          UserRole       @default(USER)
  avatar        String?
  settings      Json?
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  sessions     Session[]
  modelConfigs ModelConfig[]

  @@map("users")
}

// 会话表
model Session {
  id          String        @id @default(uuid())
  userId      String        @map("user_id")
  channelType ChannelType   @map("channel_type")
  channelId   String?       @map("channel_id")
  title       String?
  modelConfig Json?         @map("model_config")
  status      SessionStatus @default(ACTIVE)
  metadata    Json?
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id])
  messages Message[]

  @@index([userId, status])
  @@index([channelType, channelId])
  @@index([createdAt])
  @@map("sessions")
}

// 消息表
model Message {
  id        String      @id @default(uuid())
  sessionId String      @map("session_id")
  role      MessageRole
  content   String      @db.Text
  modelUsed String?     @map("model_used")
  tokens    Int?
  toolCalls Json?       @map("tool_calls")
  metadata  Json?
  createdAt DateTime    @default(now()) @map("created_at")

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
  @@map("messages")
}

// 模型配置表
model ModelConfig {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  name           String
  provider       String
  modelId        String    @map("model_id")
  apiKey         String    @map("api_key") // 加密存储
  baseUrl        String?   @map("base_url")
  isDefault      Boolean   @default(false) @map("is_default")
  temperature    Float?    @default(0.7)
  maxTokens      Int?      @map("max_tokens")
  systemPrompt   String?   @map("system_prompt") @db.Text
  customConfig   Json?     @map("custom_config")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId, isDefault])
  @@map("model_configs")
}

// 通道配置表
model ChannelConfig {
  id          String      @id @default(uuid())
  channelType ChannelType @unique @map("channel_type")
  config      Json
  isEnabled   Boolean     @default(false) @map("is_enabled")
  webhookUrl  String?     @map("webhook_url")
  status      String      @default("disconnected")
  lastError   String?     @map("last_error")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  @@map("channel_configs")
}

// 工具配置表
model ToolConfig {
  id          String    @id @default(uuid())
  toolName    String    @unique @map("tool_name")
  description String
  isEnabled   Boolean   @default(true) @map("is_enabled")
  config      Json
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("tool_configs")
}

// 枚举定义
enum UserRole {
  ADMIN
  USER
}

enum ChannelType {
  WECHAT_PERSONAL
  WECHAT_WORK
  TELEGRAM
  FEISHU
  DINGTALK
  WEBCHAT
}

enum SessionStatus {
  ACTIVE
  PAUSED
  CLOSED
  ARCHIVED
}

enum MessageRole {
  SYSTEM
  USER
  ASSISTANT
  TOOL
}
```

---

## 4. 接口设计

### 4.1 REST API

#### 认证接口
```yaml
# 登录
POST /api/v1/auth/login
Request:
  body:
    username: string
    password: string
Response:
  200:
    success: true
    data:
      token: string
      refreshToken: string
      user: UserInfo

# 刷新 Token
POST /api/v1/auth/refresh
Request:
  body:
    refreshToken: string
Response:
  200:
    data:
      token: string
```

#### 会话接口
```yaml
# 获取会话列表
GET /api/v1/sessions
Query:
  page: number (default: 1)
  pageSize: number (default: 20)
  status: SessionStatus (optional)
Response:
  200:
    data:
      items: Session[]
      pagination:
        page: number
        pageSize: number
        total: number

# 创建会话
POST /api/v1/sessions
Request:
  body:
    channelType: ChannelType
    title?: string
    modelConfig?: ModelConfig
Response:
  201:
    data: Session

# 获取会话详情
GET /api/v1/sessions/:id
Response:
  200:
    data: Session & { messages: Message[] }

# 关闭会话
PUT /api/v1/sessions/:id/close
Response:
  200:
    data: Session
```

#### 消息接口
```yaml
# 发送消息
POST /api/v1/sessions/:id/messages
Request:
  body:
    content: string
    attachments?: Attachment[]
Response:
  201:
    data:
      userMessage: Message
      assistantMessage: Message (streaming 返回空)

# 获取消息历史
GET /api/v1/sessions/:id/messages
Query:
  before?: string (message id)
  limit?: number (default: 50)
Response:
  200:
    data:
      messages: Message[]
      hasMore: boolean
```

#### 模型配置接口
```yaml
# 获取模型配置列表
GET /api/v1/model-configs
Response:
  200:
    data:
      items: ModelConfig[]
      defaultId: string

# 创建模型配置
POST /api/v1/model-configs
Request:
  body:
    name: string
    provider: string
    modelId: string
    apiKey: string
    baseUrl?: string
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
    isDefault?: boolean
Response:
  201:
    data: ModelConfig

# 更新模型配置
PUT /api/v1/model-configs/:id
Request:
  body: Partial<ModelConfig>
Response:
  200:
    data: ModelConfig

# 删除模型配置
DELETE /api/v1/model-configs/:id
Response:
  204

# 测试模型配置
POST /api/v1/model-configs/:id/test
Response:
  200:
    data:
      success: boolean
      latency: number
      error?: string
```

#### 通道配置接口
```yaml
# 获取通道配置列表
GET /api/v1/channel-configs
Response:
  200:
    data: ChannelConfig[]

# 更新通道配置
PUT /api/v1/channel-configs/:channelType
Request:
  body:
    config: object
    isEnabled: boolean
Response:
  200:
    data: ChannelConfig

# 测试通道连接
POST /api/v1/channel-configs/:channelType/test
Response:
  200:
    data:
      success: boolean
      status: string
      error?: string
```

### 4.2 WebSocket 事件

#### 客户端事件
```typescript
// 发送聊天消息
interface ChatMessagePayload {
  sessionId: string;
  content: string;
  attachments?: Attachment[];
  modelConfig?: Partial<ModelConfig>;
}

// 正在输入
interface TypingPayload {
  sessionId: string;
  isTyping: boolean;
}

// 创建会话
interface CreateSessionPayload {
  channelType: ChannelType;
  title?: string;
  modelConfig?: ModelConfig;
}

// 关闭会话
interface CloseSessionPayload {
  sessionId: string;
}
```

#### 服务器事件
```typescript
// AI 响应（完整）
interface ChatResponsePayload {
  sessionId: string;
  messageId: string;
  content: string;
  modelUsed: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolCalls?: ToolCall[];
  finishReason: string;
  timestamp: number;
}

// AI 响应（流式）
interface StreamChunkPayload {
  sessionId: string;
  messageId: string;
  chunk: string;
  isFirst: boolean;
  isLast: boolean;
  timestamp: number;
}

// 错误消息
interface ErrorPayload {
  sessionId: string;
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
}

// 会话更新
interface SessionUpdatePayload {
  sessionId: string;
  type: 'created' | 'updated' | 'closed';
  data: Partial<Session>;
  timestamp: number;
}
```

---

## 5. 异常处理策略

### 5.1 错误码定义

```typescript
enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  
  // 会话错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_CLOSED = 'SESSION_CLOSED',
  SESSION_CREATE_FAILED = 'SESSION_CREATE_FAILED',
  
  // 消息错误
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  MESSAGE_EMPTY = 'MESSAGE_EMPTY',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  
  // 模型错误
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  MODEL_RATE_LIMITED = 'MODEL_RATE_LIMITED',
  MODEL_INVALID_CONFIG = 'MODEL_INVALID_CONFIG',
  
  // 通道错误
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  CHANNEL_NOT_ENABLED = 'CHANNEL_NOT_ENABLED',
  CHANNEL_CONNECTION_FAILED = 'CHANNEL_CONNECTION_FAILED',
  CHANNEL_MESSAGE_FAILED = 'CHANNEL_MESSAGE_FAILED',
  
  // 工具错误
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  TOOL_INVALID_PARAMS = 'TOOL_INVALID_PARAMS'
}
```

### 5.2 异常处理流程

```mermaid
flowchart TD
    A[发生异常] --> B{异常类型}
    
    B -->|业务异常| C[记录日志]
    B -->|系统异常| D[记录错误日志]
    B -->|模型异常| E[尝试故障转移]
    
    C --> F[返回友好错误信息]
    D --> G[返回 500 错误]
    E --> H{故障转移成功?}
    
    H -->|是| I[使用备用模型]
    H -->|否| J[返回模型错误]
    
    I --> K[记录切换日志]
    J --> F
```

---

## 6. 部署架构

### 6.1 阿里云部署方案

```mermaid
graph TB
    subgraph 阿里云
        subgraph ECS
            PM2[PM2 进程管理]
            App[Node.js 应用]
            Nginx[Nginx 反向代理]
        end
        
        subgraph RDS
            MySQL[(MySQL 8.0)]
        end
        
        subgraph 其他服务
            Redis[(Redis 缓存)]
        end
    end
    
    User[用户] -->|HTTPS| Nginx
    Nginx -->|反向代理| PM2
    PM2 --> App
    App --> MySQL
    App -.-> Redis
```

### 6.2 目录结构

```
/opt/openclaw/
├── apps/
│   ├── gateway/          # 网关服务
│   └── web/              # Web 前端
├── logs/                 # 日志目录
├── config/               # 配置文件
├── scripts/              # 部署脚本
└── ecosystem.config.js   # PM2 配置
```

### 6.3 环境变量配置

```bash
# /opt/openclaw/.env

# 数据库
DATABASE_URL="mysql://user:password@rm-2zeh695s5607s218p.mysql.rds.aliyuncs.com:3306/openclaw"

# Redis
REDIS_URL="redis://localhost:6379"

# AI 模型 API Keys
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
QWEN_API_KEY=""
BAICHUAN_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"

# 通道配置
WECHAT_WEBHOOK_URL=""
TELEGRAM_BOT_TOKEN=""
FEISHU_APP_ID=""
FEISHU_APP_SECRET=""

# 安全
JWT_SECRET="your-secret-key-min-32-chars"
ENCRYPTION_KEY="your-encryption-key"

# 服务器
PORT=3000
NODE_ENV="production"
LOG_LEVEL="info"
```

---

## 7. 监控与日志

### 7.1 日志规范

```typescript
// 日志级别
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 日志格式
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    stack?: string;
  };
}
```

### 7.2 监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| 请求 QPS | 每秒请求数 | > 100 |
| 响应时间 P99 | 99% 请求响应时间 | > 1s |
| 错误率 | 5xx 错误比例 | > 1% |
| 内存使用 | 应用内存占用 | > 80% |
| CPU 使用 | CPU 占用率 | > 80% |
| 数据库连接数 | 活跃连接数 | > 50 |

---

## 8. 下一步

架构设计完成，接下来进入 **Atomize（原子化）阶段**，将系统拆分为可执行的原子任务。
