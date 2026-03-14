# 测试 OpenClaw API

$baseUrl = "http://localhost:3000"

Write-Host "🧪 测试 OpenClaw API" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

# 1. 测试健康检查
Write-Host "`n1. 测试健康检查..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ 健康检查通过" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 健康检查失败: $_" -ForegroundColor Red
}

# 2. 测试用户注册
Write-Host "`n2. 测试用户注册..." -ForegroundColor Cyan
$registerBody = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "✅ 注册成功" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 注册失败: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误详情: $responseBody" -ForegroundColor Red
    }
}

# 3. 测试用户登录
Write-Host "`n3. 测试用户登录..." -ForegroundColor Cyan
$loginBody = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "✅ 登录成功" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
    
    # 保存 token 用于后续测试
    $script:token = $response.data.token
} catch {
    Write-Host "❌ 登录失败: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误详情: $responseBody" -ForegroundColor Red
    }
}

# 4. 测试获取当前用户信息
if ($script:token) {
    Write-Host "`n4. 测试获取当前用户信息..." -ForegroundColor Cyan
    $headers = @{
        "Authorization" = "Bearer $script:token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" -Method GET -Headers $headers
        Write-Host "✅ 获取用户信息成功" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json)
    } catch {
        Write-Host "❌ 获取用户信息失败: $_" -ForegroundColor Red
    }
}

Write-Host "`n====================" -ForegroundColor Green
Write-Host "测试完成!" -ForegroundColor Green
