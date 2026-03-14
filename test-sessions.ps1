# 测试 OpenClaw 会话 API

$baseUrl = "http://localhost:3000"

Write-Host "🧪 测试 OpenClaw 会话 API" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

# 1. 先登录获取 token
Write-Host "`n1. 登录获取 token..." -ForegroundColor Cyan
$loginBody = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $response.data.token
    Write-Host "✅ 登录成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 登录失败，尝试注册..." -ForegroundColor Yellow
    # 注册新用户
    $registerBody = @{
        username = "testuser"
        password = "testpass123"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
        Write-Host "✅ 注册成功" -ForegroundColor Green
        
        # 重新登录
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
        $token = $response.data.token
        Write-Host "✅ 登录成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ 注册失败: $_" -ForegroundColor Red
        exit
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# 2. 创建会话
Write-Host "`n2. 创建会话..." -ForegroundColor Cyan
$sessionBody = @{
    title = "测试会话"
    channelType = "WEB"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions" -Method POST -ContentType "application/json" -Headers $headers -Body $sessionBody
    $sessionId = $response.data.id
    Write-Host "✅ 会话创建成功: $sessionId" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 创建会话失败: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误详情: $responseBody" -ForegroundColor Red
    }
    exit
}

# 3. 获取会话列表
Write-Host "`n3. 获取会话列表..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions" -Method GET -Headers $headers
    Write-Host "✅ 获取会话列表成功" -ForegroundColor Green
    Write-Host "会话数量: $($response.data.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 获取会话列表失败: $_" -ForegroundColor Red
}

# 4. 获取会话详情
Write-Host "`n4. 获取会话详情..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions/$sessionId" -Method GET -Headers $headers
    Write-Host "✅ 获取会话详情成功" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 获取会话详情失败: $_" -ForegroundColor Red
}

# 5. 发送消息
Write-Host "`n5. 发送消息..." -ForegroundColor Cyan
$messageBody = @{
    content = "你好，这是一个测试消息"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions/$sessionId/messages" -Method POST -ContentType "application/json" -Headers $headers -Body $messageBody
    Write-Host "✅ 消息发送成功" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 发送消息失败: $_" -ForegroundColor Red
}

# 6. 获取消息列表
Write-Host "`n6. 获取消息列表..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions/$sessionId/messages" -Method GET -Headers $headers
    Write-Host "✅ 获取消息列表成功" -ForegroundColor Green
    Write-Host "消息数量: $($response.data.messages.Count)" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 获取消息列表失败: $_" -ForegroundColor Red
}

# 7. 更新会话
Write-Host "`n7. 更新会话标题..." -ForegroundColor Cyan
$updateBody = @{
    title = "更新后的测试会话"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/sessions/$sessionId" -Method PUT -ContentType "application/json" -Headers $headers -Body $updateBody
    Write-Host "✅ 会话更新成功" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ 更新会话失败: $_" -ForegroundColor Red
}

Write-Host "`n==========================" -ForegroundColor Green
Write-Host "会话 API 测试完成!" -ForegroundColor Green
