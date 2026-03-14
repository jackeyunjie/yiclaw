# OpenClaw 本地开发指南

## 🚀 快速开始

### 方式一：使用本地 MySQL（推荐 Windows 用户）

#### 1. 安装 MySQL

下载 MySQL Installer：https://dev.mysql.com/downloads/installer/

选择安装：
- MySQL Server 8.0
- MySQL Workbench（可选，图形化管理工具）

安装时设置：
- root 密码：`123456`
- 端口：`3306`

#### 2. 初始化数据库

**PowerShell 方式（推荐）：**
```powershell
.\scripts\setup-local-mysql.ps1
```

**CMD 方式：**
```cmd
.\scripts\setup-local-mysql.bat
```

脚本会自动：
- 创建数据库 `openclaw`
- 创建用户 `openclaw_user` / `openclaw_pass`
- 设置字符集为 utf8mb4

#### 3. 运行数据库迁移

```bash
# 创建迁移
pnpm db:migrate

# 生成 Prisma Client
pnpm db:generate

# 初始化数据（创建管理员账号）
pnpm db:seed
```

---

### 方式二：使用 Docker（推荐 Mac/Linux 用户）

#### 1. 安装 Docker Desktop

https://www.docker.com/products/docker-desktop

#### 2. 启动服务

```bash
# 启动 MySQL 和 Redis
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f mysql
```

#### 3. 运行数据库迁移

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:seed
```

#### 4. 停止服务

```bash
docker-compose down

# 删除数据（谨慎使用）
docker-compose down -v
```

---

## 📝 环境配置

### 环境变量文件

项目根目录的 `.env` 文件已配置好本地开发环境：

```env
# 数据库连接（本地 MySQL）
DATABASE_URL="mysql://openclaw_user:openclaw_pass@localhost:3306/openclaw"

# Redis 连接（可选）
REDIS_URL="redis://localhost:6379"

# JWT 密钥（开发环境）
JWT_SECRET="dev-jwt-secret-change-in-production"

# 加密密钥（开发环境）
ENCRYPTION_KEY="dev-encryption-key-32bytes-hex"
```

---

## 🎯 启动开发服务器

### 1. 启动后端服务

```bash
# 开发模式（热重载）
pnpm dev

# 或指定 gateway
pnpm --filter @openclaw/gateway dev
```

服务启动后：
- API 地址：http://localhost:3000
- 健康检查：http://localhost:3000/health

### 2. 启动前端开发服务器

```bash
# 新终端窗口
pnpm dev:web
```

前端启动后：
- 访问地址：http://localhost:5173

---

## 🧪 常用命令

```bash
# 数据库操作
pnpm db:migrate      # 创建迁移
pnpm db:generate     # 生成 Prisma Client
pnpm db:studio       # 打开 Prisma Studio（图形化管理）
pnpm db:seed         # 初始化数据
pnpm db:push         # 推送 schema 到数据库（开发用）

# 代码检查
pnpm lint            # ESLint 检查
pnpm format          # Prettier 格式化
pnpm typecheck       # TypeScript 类型检查

# 构建
pnpm build           # 构建所有包
```

---

## 🔧 故障排除

### 问题 1：MySQL 连接失败

**症状：**
```
Error: Can't connect to MySQL server on 'localhost'
```

**解决：**
1. 检查 MySQL 服务是否运行
   ```powershell
   Get-Service MySQL80
   ```
2. 启动服务
   ```powershell
   Start-Service MySQL80
   ```

### 问题 2：权限拒绝

**症状：**
```
Access denied for user 'openclaw_user'@'localhost'
```

**解决：**
```powershell
# 以 root 登录
mysql -u root -p

# 重新创建用户
CREATE USER 'openclaw_user'@'localhost' IDENTIFIED BY 'openclaw_pass';
GRANT ALL PRIVILEGES ON openclaw.* TO 'openclaw_user'@'localhost';
FLUSH PRIVILEGES;
```

### 问题 3：端口被占用

**症状：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决：**
```powershell
# 查找占用 3000 端口的进程
netstat -ano | findstr :3000

# 结束进程（将 <PID> 替换为实际的进程 ID）
taskkill /PID <PID> /F
```

---

## 📚 开发工具推荐

### 数据库管理
- **MySQL Workbench**（官方工具）
- **DBeaver**（开源，支持多种数据库）
- **Prisma Studio**（命令：`pnpm db:studio`）

### API 测试
- **Postman**
- **Insomnia**
- **Thunder Client**（VS Code 插件）

### 代码编辑
- **VS Code**（推荐）
  - 插件：Prisma、ESLint、Prettier、Tailwind CSS IntelliSense

---

## 🎉 验证安装

所有服务启动后，访问以下地址验证：

| 服务 | 地址 | 预期结果 |
|------|------|----------|
| Gateway API | http://localhost:3000/health | `{"success":true,"data":{"status":"healthy"}}` |
| Web 前端 | http://localhost:5173 | 显示 OpenClaw 页面 |
| Prisma Studio | http://localhost:5555 | 数据库管理界面 |

---

## 🚀 下一步

1. ✅ 完成本地环境配置
2. ⏭️ 继续开发：[TASK.md](./TASK.md)
3. 📖 阅读架构设计：[DESIGN.md](./DESIGN.md)

Happy Coding! 🎉
