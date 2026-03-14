# OpenClaw 个人 AI 助手 - 待办事项清单

## 🔴 高优先级 - 执行前必须完成

### 1. 环境准备
- [ ] **阿里云服务器访问权限**
  - ECS 服务器 IP、用户名、密码
  - RDS 数据库连接信息
  - 安全组配置（开放 3000、80、443 端口）

- [ ] **AI 模型 API Keys 准备**
  - [ ] OpenAI API Key (https://platform.openai.com)
  - [ ] Anthropic API Key (https://console.anthropic.com)
  - [ ] 通义千问 API Key (https://dashscope.aliyun.com)
  - [ ] 文心一言 API Key (https://cloud.baidu.com) - 可选
  - [ ] Ollama 本地部署 - 可选

- [ ] **通道开发者账号**
  - [ ] Telegram Bot Token (通过 @BotFather 创建)
  - [ ] 飞书应用凭证 (https://open.feishu.cn)
  - [ ] 企业微信应用凭证 (https://work.weixin.qq.com) - 可选
  - [ ] 钉钉开发者账号 - 可选

### 2. 域名与 HTTPS
- [ ] 准备域名（可选，也可使用 IP 访问）
- [ ] 申请 SSL 证书（Let's Encrypt 免费证书）
- [ ] 配置 DNS 解析

---

## 🟡 中优先级 - 开发过程中需要

### 3. 开发环境配置
- [ ] 本地安装 Node.js ≥ 22
  ```bash
  # 检查版本
  node --version  # 应显示 v22.x.x
  ```

- [ ] 安装 pnpm
  ```bash
  npm install -g pnpm
  ```

- [ ] 安装 Git
  ```bash
  # Windows 下载地址
  https://git-scm.com/download/win
  ```

- [ ] 配置 Git
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your@email.com"
  ```

### 4. 开发工具
- [ ] 安装 VS Code 或 Trae IDE
- [ ] 安装推荐插件：
  - ESLint
  - Prettier
  - TypeScript Importer
  - Prisma
  - Tailwind CSS IntelliSense

### 5. 数据库准备
- [ ] 确认 RDS 实例可访问
- [ ] 创建数据库 `openclaw`
  ```sql
  CREATE DATABASE openclaw CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- [ ] 创建数据库用户并授权

---

## 🟢 低优先级 - 可选优化

### 6. 监控与日志
- [ ] 配置日志收集（可选）
- [ ] 配置监控告警（可选）

### 7. 备份策略
- [ ] 配置数据库自动备份
- [ ] 配置应用配置备份

---

## 📋 执行检查清单

### 开始开发前检查
- [ ] 所有高优先级事项已完成
- [ ] 确认开发时间安排
- [ ] 确认需求无变更

### 每个任务开始前检查
- [ ] 阅读相关设计文档
- [ ] 确认依赖任务已完成
- [ ] 准备测试环境

### 每个任务完成后检查
- [ ] 代码符合规范
- [ ] 测试通过
- [ ] 文档已更新
- [ ] 验收标准满足

---

## ❓ 需要确认的问题

### 1. 模型选择偏好
```
请确认您偏好的 AI 模型优先级：
1. 日常对话：GPT-3.5 / Claude 3 Haiku / 通义千问-Turbo
2. 代码助手：Claude 3.5 Sonnet / GPT-4
3. 长文总结：Claude 3 Opus / GPT-4
4. 成本敏感场景：本地 Ollama 模型
```

### 2. 微信接入方式
```
请确认微信接入方式：
□ A. 仅企业微信（推荐，稳定）
□ B. 仅个人微信（有风险）
□ C. 两者都支持
```

### 3. 部署时间
```
请确认期望的上线时间：
□ 2 周内（仅核心功能）
□ 1 个月内（完整 MVP）
□ 2 个月内（含进阶功能）
```

### 4. 预算范围
```
请确认月度预算范围（API 调用费用）：
□ 100 元以下
□ 100-500 元
□ 500-1000 元
□ 1000 元以上
```

---

## 📞 支持渠道

### 开发过程中遇到问题
1. **查看文档**: 先查阅项目文档
2. **检查日志**: 查看应用日志和错误信息
3. **网络搜索**: 搜索相关错误信息
4. **寻求帮助**: 联系技术支持

### 常用命令速查
```bash
# 开发
pnpm dev              # 启动开发环境
pnpm build            # 构建项目
pnpm test             # 运行测试
pnpm lint             # 代码检查

# 数据库
pnpm db:migrate       # 执行迁移
pnpm db:generate      # 生成 Prisma Client
pnpm db:studio        # 打开数据库管理界面

# 部署
pnpm deploy           # 部署到服务器
pm2 status            # 查看服务状态
pm2 logs              # 查看日志
```

---

## ✅ 准备就绪确认

请在开始开发前确认以下事项：

- [ ] 已阅读所有规划文档
- [ ] 已准备服务器和数据库
- [ ] 已准备至少一个 AI 模型 API Key
- [ ] 已准备 Telegram Bot Token
- [ ] 本地开发环境已配置
- [ ] 已确认开发时间安排

**确认后回复"准备就绪"，我将开始执行第一个任务：项目初始化**

---

**文档版本**: v1.0  
**创建日期**: 2026-02-11
