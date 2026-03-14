@echo off
chcp 65001 >nul
echo 🚀 OpenClaw 本地 MySQL 初始化
echo ==============================

REM 检查 MySQL
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL 未安装，请先安装 MySQL
    echo.
    echo 安装方式:
    echo 1. 下载 MySQL Installer: https://dev.mysql.com/downloads/installer/
    echo 2. 选择 "Server only" 安装
    echo 3. 设置 root 密码为: 123456
    pause
    exit /b 1
)

echo ✅ MySQL 已安装

REM 数据库配置
set DB_NAME=openclaw
set DB_USER=openclaw_user
set DB_PASS=openclaw_pass

set /p ROOT_PASS="请输入 MySQL root 密码 (默认: 123456): "
if "%ROOT_PASS%"=="" set ROOT_PASS=123456

echo.
echo 📝 正在创建数据库和用户...

REM 创建数据库
echo CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | mysql -u root -p%ROOT_PASS% 2>nul
if errorlevel 1 (
    echo ❌ 创建数据库失败，请检查 root 密码
    pause
    exit /b 1
)
echo ✅ 数据库 '%DB_NAME%' 创建成功

REM 创建用户
echo CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASS%'; | mysql -u root -p%ROOT_PASS% 2>nul
echo GRANT ALL PRIVILEGES ON %DB_NAME%.* TO '%DB_USER%'@'localhost'; | mysql -u root -p%ROOT_PASS% 2>nul
echo FLUSH PRIVILEGES; | mysql -u root -p%ROOT_PASS% 2>nul
echo ✅ 用户 '%DB_USER%' 创建成功

echo.
echo 🎉 MySQL 初始化完成!
echo ==============================
echo 数据库名: %DB_NAME%
echo 用户名:   %DB_USER%
echo 密码:     %DB_PASS%
echo.
echo 下一步:
echo 1. 运行: pnpm db:migrate
echo 2. 运行: pnpm db:seed
pause
