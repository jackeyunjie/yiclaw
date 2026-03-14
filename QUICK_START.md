# OpenClaw 本地试用指南

## 🚀 快速启动（5 分钟）

### 1. 环境检查

确保已安装：
- Node.js 18+ 
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+（或 SQLite 用于快速试用）

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置以下关键项：
```

**必需配置：**
```env
# 数据库（选择一种）
# 方式1: PostgreSQL（推荐）
DATABASE_URL="postgresql://user:password@localhost:5432/openclaw"

# 方式2: SQLite（快速试用）
DATABASE_URL="file:./dev.db"

# JWT 密钥（随机生成）
JWT_SECRET="your-random-secret-key-min-32-chars-long"

# AI 模型 API Key（至少配置一个）
DASHSCOPE_API_KEY="your-dashscope-key"      # 通义千问
DEEPSEEK_API_KEY="your-deepseek-key"        # DeepSeek
KIMI_API_KEY="your-kimi-key"                # Kimi
ZHIPU_API_KEY="your-zhipu-key"              # 智谱
```

### 3. 启动服务

```bash
# 安装依赖
pnpm install

# 数据库迁移
pnpm db:migrate

# 启动开发服务器（同时启动前后端）
pnpm dev
```

### 4. 访问系统

服务启动后访问：
- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:3000

---

## 🎯 试用流程

### 第一步：注册账号

1. 访问 http://localhost:5173
2. 点击"注册账号"
3. 填写用户名和密码

### 第二步：配置 AI 模型

1. 进入对话页面
2. 在顶部选择模型提供商
3. 如果没有配置 API Key，会提示设置

### 第三步：体验核心功能

#### 1. AI 对话
```
输入: "你好，请介绍一下你自己"
预期: AI 助手回复，展示多轮对话能力
```

#### 2. 工具调用
```
输入: "帮我查看当前目录的文件"
预期: AI 调用 file_list 工具，显示文件列表
```

#### 3. 长期记忆
```
输入: "记住我的目标是学习 TypeScript"
然后: "我之前设定的目标是什么？"
预期: AI 能记住并回答之前的目标
```

#### 4. 定时任务
```
1. 点击顶部导航"定时任务"
2. 创建新任务：
   - 名称: 测试任务
   - Cron: */5 * * * * (每5分钟)
   - 指令: 发送一条测试消息
3. 查看执行日志
```

#### 5. 数据库工具
```
1. 点击顶部导航"数据库"
2. 执行 SQL: SELECT * FROM "User" LIMIT 5
3. 查看结果并导出 CSV
```

---

## 📋 功能检查清单

### 基础功能
- [ ] 用户注册/登录
- [ ] AI 对话（至少一家模型）
- [ ] 多轮对话上下文
- [ ] 会话管理

### 工具系统
- [ ] file_read / file_write
- [ ] shell_command
- [ ] http_request
- [ ] sql_query
- [ ] parse_excel / parse_pdf

### 高级功能
- [ ] 长期记忆记录
- [ ] 记忆查询
- [ ] 定时任务创建
- [ ] 定时任务执行
- [ ] 消息通知（如配置了 webhook）

---

## 🔧 常见问题

### 1. 端口被占用
```bash
# 查找占用 3000 端口的进程
netstat -ano | findstr :3000

# 结束进程（替换 PID）
taskkill /PID <PID> /F
```

### 2. 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# 或使用 SQLite 快速试用
# 修改 .env: DATABASE_URL="file:./dev.db"
```

### 3. AI 模型无响应
- 检查 API Key 是否正确
- 检查网络连接
- 查看后端日志是否有错误

### 4. 前端无法连接后端
- 检查后端是否运行在 3000 端口
- 检查 .env 中的 CORS_ORIGIN 配置

---

## 🎮 演示场景

### 场景 1：个人知识管理
```
1. 告诉 AI: "我最近在学 React，记住这个学习目标"
2. 几天后问: "我之前学 React 遇到什么问题了？"
3. AI 会从长期记忆中找到相关信息
```

### 场景 2：自动化报告
```
1. 创建一个定时任务，每天早上 9 点执行
2. 任务指令: "查询昨日数据并生成报表"
3. AI 会自动: 查数据库 → 生成 Excel → 发送通知
```

### 场景 3：文档处理
```
1. 上传一个 PDF 文件
2. 问 AI: "总结一下这份文档的主要内容"
3. AI 调用 parse_pdf 工具提取并分析内容
```

---

## 📞 获取帮助

如果遇到问题：
1. 查看后端日志: `pnpm --filter gateway dev`
2. 查看前端日志: 浏览器开发者工具 Console
3. 检查数据库: `pnpm db:studio`

---

## ✅ 试用完成标准

完成以下任务即表示试用成功：
- [ ] 成功注册并登录
- [ ] 与 AI 进行 3 轮以上对话
- [ ] 成功调用至少 3 个不同工具
- [ ] 创建并执行一个定时任务
- [ ] 体验长期记忆功能

**预计用时：30-60 分钟**
