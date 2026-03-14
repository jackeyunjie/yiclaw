# OpenClaw 个人 AI 助手 - 验收文档

## 验收概述

本文档记录 OpenClaw 个人 AI 助手项目的验收标准和执行计划。项目采用分阶段验收策略，确保每个阶段的质量达标后再进入下一阶段。

---

## Phase 1: 基础设施层验收

### T001 - 项目初始化

#### 验收检查清单
- [ ] 项目目录结构符合规范
- [ ] pnpm workspaces 配置正确
- [ ] TypeScript 配置启用严格模式
- [ ] ESLint + Prettier 配置完成
- [ ] Husky + lint-staged 配置完成
- [ ] `pnpm install` 执行成功
- [ ] `pnpm dev` 能启动开发环境
- [ ] `pnpm lint` 无错误
- [ ] `pnpm build` 成功构建

#### 验收测试
```bash
# 1. 安装测试
pnpm install
# 预期: 无错误，所有依赖安装成功

# 2. 开发环境测试
pnpm dev
# 预期: 服务正常启动，无报错

# 3. 代码检查测试
pnpm lint
# 预期: 无错误，无警告

# 4. 构建测试
pnpm build
# 预期: 构建成功，dist 目录生成
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T002 - 数据库设计

#### 验收检查清单
- [ ] Prisma schema 完整定义所有表
- [ ] 字段命名符合规范 (snake_case)
- [ ] 所有表包含 created_at 和 updated_at
- [ ] 外键关系正确建立
- [ ] 索引配置合理
- [ ] 迁移脚本成功执行
- [ ] 能正常连接阿里云 RDS
- [ ] 包含基础 seed 数据

#### 验收测试
```bash
# 1. 迁移测试
pnpm db:migrate
# 预期: 迁移成功，数据库表创建完成

# 2. 连接测试
pnpm db:connect
# 预期: 成功连接到 RDS

# 3. Seed 测试
pnpm db:seed
# 预期: 基础数据插入成功
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T003 - 共享包开发

#### 验收检查清单
- [ ] 所有共享类型定义完整
- [ ] 类型导出正确
- [ ] 工具函数有单元测试
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 包能被其他项目正确引用
- [ ] TypeScript 编译无错误

#### 验收测试
```bash
# 1. 类型检查
cd packages/shared && pnpm typecheck
# 预期: 无类型错误

# 2. 单元测试
cd packages/shared && pnpm test
# 预期: 所有测试通过

# 3. 构建测试
cd packages/shared && pnpm build
# 预期: 构建成功
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

## Phase 2: 核心服务层验收

### T004 - Gateway 基础框架

#### 验收检查清单
- [ ] Express 服务器正常启动
- [ ] WebSocket 连接正常
- [ ] 健康检查接口 (`/api/v1/health`) 可用
- [ ] CORS 配置正确（只允许特定域名）
- [ ] Helmet 安全中间件生效（包含 CSP、HSTS）
- [ ] 请求日志记录正常
- [ ] 错误处理中间件工作正常
- [ ] 404 处理正确

#### 安全验收项
- [ ] **速率限制**: 已配置 express-rate-limit，100次/分钟/IP
- [ ] **登录限制**: 已配置，5次/分钟（防暴力破解）
- [ ] **安全响应头**: X-Content-Type-Options、X-Frame-Options、X-XSS-Protection
- [ ] **CORS 白名单**: 只允许特定域名访问
- [ ] **请求体大小限制**: 最大 10MB
- [ ] **超时设置**: 请求超时 30 秒

#### 验收测试
```bash
# 1. 启动测试
pnpm dev
# 预期: 服务启动，端口监听正常

# 2. 健康检查
curl http://localhost:3000/api/v1/health
# 预期: 返回 { "status": "ok" }

# 3. WebSocket 测试
# 使用 WebSocket 客户端连接 ws://localhost:3000
# 预期: 连接成功
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T005 - 认证系统

#### 验收检查清单
- [ ] 注册 API 正常工作
- [ ] 登录 API 正常工作
- [ ] JWT Token 生成正确
- [ ] Token 刷新机制正常
- [ ] JWT 认证中间件保护路由
- [ ] 密码使用 bcrypt 加密存储（10 rounds）
- [ ] 错误返回格式统一
- [ ] 单元测试覆盖率 ≥ 80%

#### 安全验收项
- [ ] **输入验证**: 用户名 3-50 字符，只允许字母数字下划线；密码 8-100 字符
- [ ] **JWT 配置**: access token 2小时过期，refresh token 7天过期
- [ ] **JWT Secret**: 强度足够（≥32字符随机字符串）
- [ ] **密码强度**: 至少8位，包含大小写字母和数字
- [ ] **登录失败处理**: 连续5次失败锁定15分钟
- [ ] **审计日志**: 记录所有登录/登出/密码修改操作
- [ ] **错误信息**: 不暴露用户是否存在（统一返回"用户名或密码错误"）

#### 验收测试
```bash
# 1. 注册测试
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'
# 预期: 返回用户信息和 token

# 2. 登录测试
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'
# 预期: 返回用户信息和 token

# 3. 受保护路由测试
curl http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <token>"
# 预期: 正常返回数据

# 4. 无 Token 测试
curl http://localhost:3000/api/v1/sessions
# 预期: 返回 401 错误
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T006 - 会话管理

#### 验收检查清单
- [ ] 会话 CRUD API 正常
- [ ] 消息存储和查询正常
- [ ] 上下文获取正确（最近 20 条）
- [ ] WebSocket 会话事件正常
- [ ] 分页查询正常
- [ ] 会话状态机工作正常
- [ ] 数据库事务处理正确

#### 安全验收项
- [ ] **权限验证**: 只能访问自己的会话（userId 验证）
- [ ] **输入验证**: 会话标题长度限制 100 字符，防止 XSS
- [ ] **SQL 注入防护**: 所有查询使用 Prisma ORM 参数化查询
- [ ] **审计日志**: 记录会话创建、关闭、删除操作
- [ ] **数据隔离**: 确保用户 A 无法访问用户 B 的会话和消息

#### 验收测试
```bash
# 1. 创建会话
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"channelType":"webchat","title":"测试会话"}'
# 预期: 返回创建的会话

# 2. 获取会话列表
curl http://localhost:3000/api/v1/sessions \
  -H "Authorization: Bearer <token>"
# 预期: 返回会话列表

# 3. 获取会话详情
curl http://localhost:3000/api/v1/sessions/<id> \
  -H "Authorization: Bearer <token>"
# 预期: 返回会话详情和消息历史

# 4. 关闭会话
curl -X PUT http://localhost:3000/api/v1/sessions/<id>/close \
  -H "Authorization: Bearer <token>"
# 预期: 会话状态变为 CLOSED
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T007 - 模型路由系统

#### 验收检查清单
- [ ] 支持 OpenAI 提供商
- [ ] 支持 Anthropic 提供商
- [ ] 支持通义千问提供商
- [ ] 支持 Ollama 本地模型
- [ ] 模型配置 API 完整
- [ ] 流式响应正常
- [ ] 三级配置策略正确（全局/板块/节点）
- [ ] 故障转移机制正常
- [ ] 模型测试功能正常

#### 安全验收项
- [ ] **API Key 加密**: 使用 AES-256-GCM 加密存储，内存中解密使用
- [ ] **密钥管理**: ENCRYPTION_KEY 从环境变量读取，32字节十六进制
- [ ] **输入验证**: 模型名称、提供商等参数验证，防止注入
- [ ] **权限控制**: 只能访问自己的模型配置
- [ ] **审计日志**: 记录模型配置的创建、修改、删除操作
- [ ] **错误处理**: API Key 验证失败不暴露具体错误信息
- [ ] **内存安全**: API Key 使用后及时从内存清除（可选）

#### 验收测试
```bash
# 1. 创建模型配置
curl -X POST http://localhost:3000/api/v1/model-configs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI GPT-4",
    "provider": "openai",
    "modelId": "gpt-4",
    "apiKey": "sk-xxx"
  }'
# 预期: 返回创建的配置

# 2. 测试模型配置
curl -X POST http://localhost:3000/api/v1/model-configs/<id>/test \
  -H "Authorization: Bearer <token>"
# 预期: 返回测试结果和延迟

# 3. 流式响应测试
# 通过 WebSocket 发送消息
# 预期: 收到流式响应 chunks
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T008 - 工具系统

#### 验收检查清单
- [ ] 工具注册中心正常
- [ ] 时间工具可用
- [ ] 天气工具可用
- [ ] 计算器工具可用
- [ ] 工具调用 API 正常
- [ ] 参数验证正常
- [ ] 超时机制正常（30 秒）
- [ ] 错误处理完善

#### 安全验收项
- [ ] **参数验证**: 所有工具参数使用 JSON Schema 验证
- [ ] **代码注入防护**: 计算器工具使用安全沙箱，禁止执行任意代码
- [ ] **命令注入防护**: 禁止工具执行系统命令
- [ ] **超时控制**: 工具执行超时 30 秒，防止资源耗尽
- [ ] **错误隔离**: 工具执行错误不影响主服务
- [ ] **权限控制**: 敏感工具需要额外权限（如文件操作）
- [ ] **审计日志**: 记录工具调用记录（工具名、参数、执行时间）

#### 验收测试
```bash
# 1. 获取工具列表
curl http://localhost:3000/api/v1/tools \
  -H "Authorization: Bearer <token>"
# 预期: 返回可用工具列表

# 2. 调用时间工具
curl -X POST http://localhost:3000/api/v1/tools/get_current_time/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Asia/Shanghai"}'
# 预期: 返回当前时间

# 3. 调用计算器工具
curl -X POST http://localhost:3000/api/v1/tools/calculate/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"expression": "1 + 2 * 3"}'
# 预期: 返回计算结果 7
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

## Phase 3: 通道层验收

### T009 - WebChat 通道

#### 验收检查清单
- [ ] WebSocket 连接正常
- [ ] 消息收发正常
- [ ] 流式响应正常
- [ ] 多客户端同步正常
- [ ] 会话隔离正确
- [ ] 消息持久化正常

#### 安全验收项
- [ ] **身份验证**: WebSocket 连接需要 JWT Token 验证
- [ ] **会话隔离**: 只能加入自己的会话 room
- [ ] **消息验证**: 消息内容长度限制（最大 4000 字符）
- [ ] **XSS 防护**: 消息内容转义处理，防止脚本注入
- [ ] **速率限制**: 单用户消息发送频率限制（10条/秒）
- [ ] **连接限制**: 单用户最大连接数限制（5个）

#### 验收测试
```bash
# 1. WebSocket 连接测试
# 使用浏览器或 wscat 连接 ws://localhost:3000
# 预期: 连接成功

# 2. 发送消息测试
# 发送: { "event": "chat:message", "data": { "sessionId": "xxx", "content": "Hello" } }
# 预期: 收到流式响应

# 3. 多客户端测试
# 打开两个浏览器窗口
# 预期: 消息实时同步
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T010 - 微信通道

#### 验收检查清单
- [ ] 微信扫码登录正常
- [ ] 消息接收正常
- [ ] 消息发送正常
- [ ] 会话映射正确
- [ ] 支持个人号和企业微信
- [ ] 封号风险预警机制

#### 安全验收项
- [ ] **Token 安全**: Bot Token 加密存储，不在日志中输出
- [ ] **消息验证**: 验证微信消息签名，防止伪造
- [ ] **内容过滤**: 敏感词过滤，防止违规内容传播
- [ ] **频率控制**: 消息发送频率控制，防止封号
- [ ] **用户隔离**: 不同微信用户数据隔离
- [ ] **审计日志**: 记录微信消息的收发记录

#### 验收测试
```bash
# 1. 启动微信适配器
# 预期: 显示二维码，扫码后登录成功

# 2. 发送消息测试
# 从微信发送消息给机器人
# 预期: 收到 AI 响应

# 3. 接收消息测试
# 机器人发送消息到微信
# 预期: 微信收到消息
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T011 - Telegram 通道

#### 验收检查清单
- [ ] Bot 启动正常
- [ ] Webhook 配置正常
- [ ] 消息接收正常
- [ ] 消息发送正常
- [ ] 支持群组消息
- [ ] 支持命令处理

#### 安全验收项
- [ ] **Token 安全**: Bot Token 加密存储，不在代码中硬编码
- [ ] **Webhook 验证**: 验证 Telegram 请求来源，防止伪造
- [ ] **Secret Token**: 使用 secret_token 验证 Webhook 请求
- [ ] **输入验证**: 验证消息内容长度和格式
- [ ] **命令白名单**: 只允许预定义的命令
- [ ] **审计日志**: 记录 Telegram 消息和命令

#### 验收测试
```bash
# 1. 配置 Bot Token
# 在管理后台配置 Telegram Bot Token

# 2. 发送消息测试
# 在 Telegram 中发送消息给 Bot
# 预期: 收到 AI 响应

# 3. 命令测试
# 发送 /start 命令
# 预期: 收到欢迎消息
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T012 - 飞书通道

#### 验收检查清单
- [ ] 飞书事件订阅配置正常
- [ ] 消息接收正常
- [ ] 消息发送正常
- [ ] 支持富文本消息
- [ ] 支持消息卡片

#### 安全验收项
- [ ] **签名验证**: 验证飞书请求签名，防止伪造
- [ ] **Token 加密**: App ID 和 App Secret 加密存储
- [ ] **IP 白名单**: 验证飞书服务器 IP
- [ ] **重放攻击防护**: 验证请求时间戳，拒绝过期请求
- [ ] **内容安全**: 富文本内容过滤
- [ ] **审计日志**: 记录飞书事件和消息

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

## Phase 4: 前端层验收

### T013 - Web 管理后台

#### 验收检查清单
- [ ] 登录页面功能正常
- [ ] 仪表盘数据展示正常
- [ ] 模型配置管理完整
- [ ] 通道配置管理完整
- [ ] 会话管理功能正常
- [ ] 系统设置可保存
- [ ] 响应式布局正常
- [ ] 无 console 错误

#### 安全验收项
- [ ] **HTTPS 强制**: 所有请求通过 HTTPS
- [ ] **Token 存储**: JWT Token 存储在 httpOnly cookie 或内存中
- [ ] **XSS 防护**: React 自动转义，禁止 dangerouslySetInnerHTML
- [ ] **CSRF 防护**: 使用 SameSite cookie 或 CSRF Token
- [ ] **输入验证**: 所有表单输入前端验证 + 后端验证
- [ ] **API Key 显示**: 只显示部分，复制功能可用
- [ ] **会话超时**: Token 过期后自动跳转登录页
- [ ] **权限控制**: 管理员功能需要 ADMIN 角色

#### 页面验收
| 页面 | 验收项 | 状态 |
|------|--------|------|
| 登录页 | 表单验证、登录跳转 | 🔲 |
| 仪表盘 | 数据统计、快捷入口 | 🔲 |
| 模型配置 | CRUD、测试、默认设置 | 🔲 |
| 通道配置 | 各通道配置、启用/禁用 | 🔲 |
| 会话管理 | 列表、详情、关闭 | 🔲 |
| 系统设置 | 通用配置保存 | 🔲 |

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

### T014 - WebChat 界面

#### 验收检查清单
- [ ] 聊天界面布局正常
- [ ] 会话列表展示正常
- [ ] 新建会话功能正常
- [ ] 消息发送正常
- [ ] 流式响应展示正常
- [ ] Markdown 渲染正常
- [ ] 代码高亮正常
- [ ] 模型选择器正常
- [ ] 参数调整生效

#### 安全验收项
- [ ] **XSS 防护**: Markdown 渲染时过滤危险标签（script、iframe 等）
- [ ] **链接安全**: 外部链接添加 rel="noopener noreferrer"
- [ ] **代码安全**: 代码高亮不执行代码
- [ ] **输入限制**: 消息长度限制（最大 4000 字符）
- [ ] **频率限制**: 发送按钮防连点（1秒内只能发送1条）
- [ ] **Token 安全**: WebSocket 连接使用 JWT 认证

#### 功能验收
| 功能 | 验收项 | 状态 |
|------|--------|------|
| 侧边栏 | 会话列表、新建按钮 | 🔲 |
| 聊天区 | 消息展示、输入框、发送 | 🔲 |
| 消息渲染 | 文本、代码、图片 | 🔲 |
| 流式响应 | 打字机效果、完成标识 | 🔲 |
| 设置面板 | 模型选择、参数调整 | 🔲 |

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

## Phase 5: 部署层验收

### T015 - 部署与配置

#### 验收检查清单
- [ ] 阿里云 ECS 部署成功
- [ ] 阿里云 RDS 连接正常
- [ ] PM2 进程管理正常
- [ ] Nginx 反向代理配置正确
- [ ] HTTPS 证书配置正确
- [ ] 环境变量配置正确
- [ ] 日志轮转配置正确
- [ ] 自动重启机制正常

#### 安全验收项
- [ ] **HTTPS 强制**: Nginx 配置 HTTP 自动跳转 HTTPS
- [ ] **SSL 配置**: 使用 TLS 1.2+，禁用弱加密套件
- [ ] **HSTS 头**: 启用 HTTP Strict Transport Security
- [ ] **安全响应头**: X-Frame-Options、X-Content-Type-Options、X-XSS-Protection
- [ ] **密钥管理**: JWT_SECRET 和 ENCRYPTION_KEY 强度足够，不提交到 Git
- [ ] **防火墙**: ECS 安全组只开放必要端口（80、443、22）
- [ ] **日志安全**: 日志中不包含敏感信息（密码、API Keys）
- [ ] **备份策略**: 数据库定期备份，配置备份

#### 部署验证
```bash
# 1. 服务状态检查
pm2 status
# 预期: 所有进程运行中

# 2. 健康检查
curl https://your-domain.com/api/v1/health
# 预期: 返回 { "status": "ok" }

# 3. 日志检查
pm2 logs
# 预期: 无错误日志

# 4. 数据库连接检查
# 预期: 应用能正常读写数据库
```

#### 验收结果
- **状态**: 🔲 未开始
- **验收人**: 
- **验收日期**: 
- **备注**: 

---

## 整体验收

### 功能完整性检查

| 功能模块 | 验收状态 | 备注 |
|----------|----------|------|
| 用户认证 | 🔲 | |
| 会话管理 | 🔲 | |
| 多模型支持 | 🔲 | |
| 模型可视化配置 | 🔲 | |
| WebChat | 🔲 | |
| 微信通道 | 🔲 | |
| Telegram 通道 | 🔲 | |
| 飞书通道 | 🔲 | |
| 工具系统 | 🔲 | |
| Web 管理后台 | 🔲 | |

### 性能验收

| 指标 | 目标值 | 实测值 | 状态 |
|------|--------|--------|------|
| API 响应时间 P99 | < 500ms | | 🔲 |
| AI 首字节响应 | < 2s | | 🔲 |
| 并发连接数 | ≥ 100 | | 🔲 |
| 系统可用性 | ≥ 99% | | 🔲 |

### 安全验收

| 检查项 | 状态 |
|--------|------|
| API 认证保护 | 🔲 |
| 密码加密存储 | 🔲 |
| API Keys 加密存储 | 🔲 |
| HTTPS 启用 | 🔲 |
| CORS 配置正确 | 🔲 |

---

## 验收结论

### 验收总结

| 阶段 | 任务数 | 通过 | 未通过 | 通过率 |
|------|--------|------|--------|--------|
| 基础设施层 | 3 | | | |
| 核心服务层 | 5 | | | |
| 通道层 | 4 | | | |
| 前端层 | 2 | | | |
| 部署层 | 1 | | | |
| **总计** | **15** | | | |

### 最终结论

- **验收结果**: 🔲 通过 / 🔲 有条件通过 / 🔲 不通过
- **验收日期**: 
- **验收人**: 
- **备注**: 

---

## 附录

### 测试账号

```
测试用户: test
测试密码: Test123456
```

### API 端点

```
Base URL: https://your-domain.com/api/v1
WebSocket: wss://your-domain.com
```

### 文档索引

- [需求对齐](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/ALIGNMENT_openclaw-assistant.md)
- [需求共识](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/CONSENSUS_openclaw-assistant.md)
- [架构设计](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/DESIGN_openclaw-assistant.md)
- [任务拆分](file:///d:/Antigravity/opc/openclaw/docs/openclaw-assistant/TASK_openclaw-assistant.md)
