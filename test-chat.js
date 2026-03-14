/**
 * 测试聊天 API
 */

const BASE_URL = 'http://localhost:3000';

// 测试 1: AI 状态检查（无需认证）
async function testAIStatus() {
  console.log('\n🧪 测试 1: AI 状态检查');
  console.log('====================');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ 服务健康:', data.success ? '正常' : '异常');
    console.log('📊 响应:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

// 测试 2: 登录获取 token
async function testLogin() {
  console.log('\n🧪 测试 2: 用户登录');
  console.log('====================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 登录成功');
      console.log('🔑 Token:', data.data.token.substring(0, 50) + '...');
      return data.data.token;
    } else {
      console.log('⚠️ 登录失败，尝试注册...');
      return await testRegister();
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return null;
  }
}

// 测试 2b: 注册
async function testRegister() {
  console.log('\n📝 尝试注册新用户...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 注册成功，重新登录...');
      return await testLogin();
    } else {
      console.error('❌ 注册失败:', data.error?.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 注册失败:', error.message);
    return null;
  }
}

// 测试 3: 获取 AI 状态（需要认证）
async function testAIStatusAuth(token) {
  console.log('\n🧪 测试 3: AI 服务状态（认证）');
  console.log('====================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/chat/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    console.log('✅ AI 状态:', data.success ? '正常' : '异常');
    console.log('📊 响应:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return null;
  }
}

// 测试 4: 获取模型列表
async function testModels(token) {
  console.log('\n🧪 测试 4: 获取可用模型');
  console.log('====================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/chat/models`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    console.log('✅ 模型列表:', data.success ? '获取成功' : '失败');
    console.log('📊 响应:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return null;
  }
}

// 测试 5: 创建会话
async function testCreateSession(token) {
  console.log('\n🧪 测试 5: 创建会话');
  console.log('====================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'AI 测试会话',
        channelType: 'WEB'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 会话创建成功');
      console.log('🆔 会话ID:', data.data.id);
      return data.data.id;
    } else {
      console.error('❌ 创建失败:', data.error?.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    return null;
  }
}

// 测试 6: AI 对话（模拟，因为需要 API Key）
async function testChat(token, sessionId) {
  console.log('\n🧪 测试 6: AI 对话');
  console.log('====================');
  console.log('⚠️ 注意: 此测试需要配置 OPENAI_API_KEY');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/chat/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: '你好，这是一个测试消息',
        model: 'gpt-3.5-turbo',
        stream: false
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ AI 回复成功');
      console.log('🤖 AI:', data.data.assistantMessage?.content?.substring(0, 100) + '...');
    } else {
      console.log('⚠️ AI 回复:', data.error?.code);
      console.log('📝 说明:', data.error?.message);
    }
    
    console.log('📊 完整响应:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return null;
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 OpenClaw T007 测试开始');
  console.log('==========================');
  
  // 1. 健康检查
  await testAIStatus();
  
  // 2. 登录
  const token = await testLogin();
  if (!token) {
    console.error('\n❌ 无法获取 token，测试终止');
    return;
  }
  
  // 3. AI 状态（认证）
  const aiStatus = await testAIStatusAuth(token);
  
  // 4. 模型列表
  await testModels(token);
  
  // 5. 创建会话
  const sessionId = await testCreateSession(token);
  if (!sessionId) {
    console.error('\n❌ 无法创建会话，测试终止');
    return;
  }
  
  // 6. AI 对话
  await testChat(token, sessionId);
  
  console.log('\n==========================');
  console.log('✅ T007 测试完成！');
  
  if (aiStatus?.data?.configured) {
    console.log('🎉 AI 服务已配置，可以正常对话');
  } else {
    console.log('⚠️ AI 服务未配置，请设置 OPENAI_API_KEY');
    console.log('📝 配置方法: 编辑 .env 文件，设置 OPENAI_API_KEY="your-key"');
  }
}

runTests();
