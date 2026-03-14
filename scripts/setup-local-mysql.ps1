# OpenClaw 本地 MySQL 初始化脚本
# 适用于 Windows PowerShell

Write-Host "🚀 OpenClaw 本地 MySQL 初始化" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# 检查 MySQL 是否安装
try {
    $mysqlVersion = mysql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL not found"
    }
    Write-Host "✅ MySQL 已安装: $mysqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL 未安装，请先安装 MySQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "安装方式:" -ForegroundColor Yellow
    Write-Host "1. 下载 MySQL Installer: https://dev.mysql.com/downloads/installer/"
    Write-Host "2. 选择 'Server only' 安装"
    Write-Host "3. 设置 root 密码为: 123456"
    Write-Host ""
    exit 1
}

# 数据库配置
$DB_NAME = "openclaw"
$DB_USER = "openclaw_user"
$DB_PASS = "openclaw_pass"
$ROOT_PASS = Read-Host "请输入 MySQL root 密码 (默认: 123456)" -AsSecureString
$ROOT_PASS_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ROOT_PASS))

if ([string]::IsNullOrWhiteSpace($ROOT_PASS_PLAIN)) {
    $ROOT_PASS_PLAIN = "123456"
}

Write-Host ""
Write-Host "📝 正在创建数据库和用户..." -ForegroundColor Cyan

# 创建数据库
$createDbSql = @"
CREATE DATABASE IF NOT EXISTS $DB_NAME 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
"@

$createDbSql | mysql -u root -p$ROOT_PASS_PLAIN 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 创建数据库失败，请检查 root 密码" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 数据库 '$DB_NAME' 创建成功" -ForegroundColor Green

# 创建用户并授权
$createUserSql = @"
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
"@

$createUserSql | mysql -u root -p$ROOT_PASS_PLAIN 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  创建用户失败，可能用户已存在" -ForegroundColor Yellow
} else {
    Write-Host "✅ 用户 '$DB_USER' 创建成功" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 MySQL 初始化完成!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "数据库名: $DB_NAME" -ForegroundColor Cyan
Write-Host "用户名:   $DB_USER" -ForegroundColor Cyan
Write-Host "密码:     $DB_PASS" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 运行: pnpm db:migrate" -ForegroundColor Yellow
Write-Host "2. 运行: pnpm db:seed" -ForegroundColor Yellow
