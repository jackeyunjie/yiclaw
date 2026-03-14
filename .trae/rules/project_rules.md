# OpenClaw 个人 AI 助手 - 项目规则

## 1. 项目概述

### 1.1 项目信息
- **项目名称**: OpenClaw 个人 AI 助手
- **项目路径**: `d:\Antigravity\opc\openclaw`
- **技术栈**: Node.js + TypeScript + React + MySQL
- **目标**: 构建类似 OpenClaw 的多通道 AI 助手系统

### 1.2 核心特性
- 多模型支持（OpenAI、Anthropic、国产模型、Ollama）
- 可视化模型配置（全局/板块/节点三级）
- 多通道接入（微信、Telegram、飞书、钉钉预留）
- 工具系统（可扩展）
- Web 管理界面

---

## 2. 开发规范

### 2.1 代码规范

#### 语言与格式
- **主要语言**: TypeScript
- **运行时**: Node.js ≥ 22
- **代码风格**: ESLint + Prettier
- **换行符**: LF (Unix style)
- **缩进**: 2 个空格

#### 命名规范
```typescript
// 文件命名
// - 组件: PascalCase (e.g., ModelSelector.tsx)
// - 工具函数: camelCase (e.g., formatDate.ts)
// - 常量: UPPER_SNAKE_CASE (e.g., DEFAULT_CONFIG.ts)

// 变量命名
const userName: string;           // camelCase
const MAX_RETRY_COUNT = 3;        // UPPER_SNAKE_CASE (常量)

// 类型命名
interface UserConfig { }          // PascalCase
type ModelType = 'openai' | 'claude'; // PascalCase

// 类命名
class SessionManager { }          // PascalCase

// 枚举命名
enum ChannelType {                // PascalCase
  WECHAT = 'wechat',
  TELEGRAM = 'telegram'
}
```

#### 注释规范
```typescript
/**
 * 模型配置接口
 * @property provider - 模型提供商
 * @property modelId - 模型标识
 * @property apiKey - API 密钥（加密存储）
 */
interface ModelConfig {
  provider: string;
  modelId: string;
  apiKey: string;
}

// 单行注释用于简单说明
const DEFAULT_TIMEOUT = 30000; // 默认超时 30 秒
```

### 2.2 项目结构

```
openclaw/
├── apps/
│   ├── gateway/              # 网关服务
│   │   ├── src/
│   │   │   ├── server/       # Express 服务器
│   │   │   ├── services/     # 业务服务
│   │   │   ├── models/       # 数据模型
│   │   │   ├── routes/       # API 路由
│   │   │   ├── middleware/   # 中间件
│   │   │   ├── channels/     # 通道适配器
│   │   │   ├── tools/        # 工具实现
│   │   │   └── utils/        # 工具函数
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                  # Web 前端
│       ├── src/
│       │   ├── components/   # React 组件
│       │   ├── pages/        # 页面
│       │   ├── hooks/        # 自定义 Hooks
│       │   ├── services/     # API 服务
│       │   ├── stores/       # 状态管理
│       │   └── utils/        # 工具函数
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared/               # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/        # 共享类型定义
│   │   │   └── utils/        # 共享工具函数
│   │   └── package.json
│   └── ai-sdk/               # AI 模型 SDK 封装
│       ├── src/
│       │   ├── providers/    # 各模型提供商实现
│       │   └── router/       # 模型路由
│       └── package.json
├── docs/                     # 项目文档
│   └── openclaw-assistant/
├── scripts/                  # 部署脚本
├── prisma/                   # 数据库 Schema
└── package.json              # 根 package.json
```

### 2.3 导入规范

```typescript
// 1. 外部依赖（按字母排序）
import express from 'express';
import { Server } from 'socket.io';

// 2. 内部模块（按字母排序）
import { SessionManager } from './services/SessionManager';
import { logger } from './utils/logger';

// 3. 类型导入
import type { UserConfig } from '@openclaw/shared';

// 4. 相对路径导入（避免深层相对路径，使用别名）
// ✅ 推荐
import { formatDate } from '@/utils/date';

// ❌ 避免
import { formatDate } from '../../../utils/date';
```

---

## 3. 数据库规范

### 3.1 命名规范
- **表名**: 小写 + 下划线（e.g., `user_configs`）
- **字段名**: 小写 + 下划线（e.g., `created_at`）
- **主键**: `id`（自增或 UUID）
- **外键**: `[表名]_id`（e.g., `user_id`）
- **时间戳**: `created_at`, `updated_at`

### 3.2 Prisma Schema 示例
```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String   // 加密存储
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  sessions Session[]

  @@map("users")
}

model Session {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  channelType ChannelType @map("channel_type")
  title       String?
  createdAt   DateTime    @default(now()) @map("created_at")

  user     User      @relation(fields: [userId], references: [id])
  messages Message[]

  @@index([userId])
  @@map("sessions")
}
```

---

## 4. API 规范

### 4.1 REST API 规范

#### URL 设计
```
GET    /api/v1/sessions           # 列表
GET    /api/v1/sessions/:id       # 详情
POST   /api/v1/sessions           # 创建
PUT    /api/v1/sessions/:id       # 更新
DELETE /api/v1/sessions/:id       # 删除
```

#### 响应格式
```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 列表响应
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在"
  }
}
```

### 4.2 WebSocket 规范

#### 事件命名
```typescript
// 客户端 -> 服务器
'chat:message'      // 发送消息
'chat:typing'       // 正在输入
'session:create'    // 创建会话

// 服务器 -> 客户端
'chat:response'     // AI 响应（流式）
'chat:error'        // 错误消息
'session:update'    // 会话更新
```

#### 消息格式
```typescript
interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
  requestId: string;
}
```

---

## 5. 安全规范

### 5.1 敏感信息处理
```typescript
// ✅ 正确：从环境变量读取
const apiKey = process.env.OPENAI_API_KEY;

// ✅ 正确：加密存储
const encryptedKey = await encrypt(apiKey);

// ❌ 错误：硬编码
const apiKey = 'sk-xxxxxxxx';

// ❌ 错误：明文存储
await db.save({ apiKey: 'sk-xxxxxxxx' });
```

### 5.2 环境变量清单
```bash
# 数据库
DATABASE_URL="mysql://user:pass@host:3306/openclaw"

# AI 模型 API Keys
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
QWEN_API_KEY=""
BAICHUAN_API_KEY=""

# 通道配置
WECHAT_WEBHOOK_URL=""
TELEGRAM_BOT_TOKEN=""
FEISHU_APP_ID=""
FEISHU_APP_SECRET=""

# 安全
JWT_SECRET="your-secret-key"
ENCRYPTION_KEY="your-encryption-key"

# 服务器
PORT=3000
NODE_ENV="development"
```

### 5.3 API 安全
- 所有 API 需要 JWT 认证（除登录/注册）
- 密码使用 bcrypt 加密（10 rounds）
- API Keys 使用 AES-256-GCM 加密存储
- 启用 CORS 限制（只允许特定域名）
- 请求频率限制（Rate Limiting）：100次/分钟/IP
- JWT Token 过期时间：access token 2小时，refresh token 7天
- 所有响应头添加安全头（X-Content-Type-Options, X-Frame-Options, X-XSS-Protection）

### 5.4 输入验证规范

#### 所有用户输入必须验证
```typescript
// ✅ 正确：使用验证库
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100)
});

// 验证输入
const result = loginSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: result.error.message }
  });
}
```

#### SQL 注入防护
- 使用 Prisma ORM（自动参数化查询）
- 禁止直接拼接 SQL
- 所有数据库操作必须通过 Prisma Client

#### XSS 防护
- 输出时进行 HTML 转义
- 使用 React（自动转义 JSX）
- Content-Type 必须正确设置

### 5.5 速率限制配置
```typescript
// 使用 express-rate-limit
import rateLimit from 'express-rate-limit';

// 通用限制：100次/分钟
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登录限制：5次/分钟（防暴力破解）
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true // 成功请求不计数
});

// 应用限制
app.use('/api/', generalLimiter);
app.use('/api/v1/auth/login', loginLimiter);
```

### 5.6 加密工具规范
```typescript
// utils/crypto.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32字节
const IV_LENGTH = 16; // AES-GCM 推荐长度

// 加密 API Key
export function encryptApiKey(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// 解密 API Key
export function decryptApiKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 5.7 安全响应头
```typescript
// 使用 helmet 中间件
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 5.8 审计日志规范
```typescript
// 记录所有敏感操作
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
}

// 必须记录的操作：
// - 用户登录/登出
// - 密码修改
// - API Key 创建/修改/删除
// - 模型配置修改
// - 通道配置修改
// - 会话删除
```

### 5.9 安全检查清单

#### 开发前检查
- [ ] 是否需要处理敏感数据？
- [ ] 是否有用户输入？验证规则是什么？
- [ ] 是否需要认证授权？
- [ ] 是否需要记录审计日志？

#### 代码审查检查
- [ ] 没有硬编码的密钥或密码
- [ ] 所有用户输入都经过验证
- [ ] 数据库操作使用参数化查询
- [ ] 敏感数据已加密存储
- [ ] 响应头包含安全头
- [ ] 错误信息不暴露敏感信息

#### 部署前检查
- [ ] 环境变量已正确配置
- [ ] JWT_SECRET 强度足够（≥32字符随机字符串）
- [ ] ENCRYPTION_KEY 已生成（32字节十六进制）
- [ ] HTTPS 已启用
- [ ] 速率限制已配置

---

## 6. 测试规范

### 6.1 测试结构
```
src/
├── services/
│   ├── SessionManager.ts
│   └── __tests__/
│       └── SessionManager.test.ts
```

### 6.2 测试命名
```typescript
// 测试文件: SessionManager.test.ts
describe('SessionManager', () => {
  describe('createSession', () => {
    it('should create a new session with valid data', async () => {
      // 测试代码
    });

    it('should throw error when user not found', async () => {
      // 测试代码
    });
  });
});
```

### 6.3 测试覆盖率要求
- 单元测试覆盖率 ≥ 70%
- 核心服务覆盖率 ≥ 80%
- 集成测试覆盖主要流程

---

## 7. 提交规范

### 7.1 Commit Message 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式（不影响代码运行）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建过程或辅助工具变动

#### 示例
```
feat(gateway): 添加微信通道适配器

- 实现微信个人号消息接收
- 实现微信企业号消息发送
- 添加消息格式转换

Closes #123
```

### 7.2 分支策略
```
main        # 生产分支
  ↑
develop     # 开发分支
  ↑
feature/*   # 功能分支
  ↑
hotfix/*    # 热修复分支
```

---

## 8. 部署规范

### 8.1 部署流程
1. 代码合并到 `main` 分支
2. 运行测试套件
3. 构建 Docker 镜像（可选）
4. 执行数据库迁移
5. 使用 PM2 重启服务

### 8.2 PM2 配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'openclaw-gateway',
    script: './apps/gateway/dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/gateway-error.log',
    out_file: './logs/gateway-out.log',
    merge_logs: true
  }]
};
```

---

## 9. 文档规范

### 9.1 文档位置
- 项目文档: `docs/openclaw-assistant/`
- API 文档: 使用 Swagger/OpenAPI
- 代码注释: TSDoc 格式

### 9.2 文档更新时机
- 新增功能时更新设计文档
- 修改 API 时更新接口文档
- 修复 Bug 时更新变更日志

---

## 10. 常用命令

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

# 生成 Prisma Client
pnpm db:generate

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 部署
pnpm deploy
```

---

## 11. 注意事项

1. **不要提交敏感信息**到 Git 仓库
2. **不要修改已发布的迁移文件**，需要新建迁移
3. **保持向后兼容**，API 变更需要版本控制
4. **及时更新文档**，代码和文档保持一致
5. **编写测试**，新功能必须包含测试用例
