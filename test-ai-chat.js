/**
 * 测试 AI 对话
 */

const BASE_URL = 'http://localhost:3000';

// 登录获取 token
async function login() {
  console.log('\n🔑 登录获取 Token');
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
      return data.data.token;
    } else {
      console.log('⚠️ 登录失败，尝试注册...');
      // 注册
      const regResponse = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass123'
        })
      });
      const regData = await regResponse.json();
      if (regData.success) {
        console.log('✅ 注册成功，重新登录...');
        return login();
      }
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return null;
  }
}

// 创建会话
async function createSession(token) {
  console.log('\n💬 创建测试会话');
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
      console.log('✅ 会话创建成功:', data.data.id);
      return data.data.id;
    } else {
      console.log('❌ 创建失败:', data.error?.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    return null;
  }
}

// 测试 AI 对话
async function testChat(token, sessionId, model) {
  console.log(`\n🤖 测试 AI 对话 (${model})`);
  console.log('====================');

  const testMessage = '你好，请用一句话介绍自己';
  console.log('👤 用户:', testMessage);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/chat/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: testMessage,
        model: model,
        stream: false
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ AI 回复成功');
      console.log('🤖 AI:', data.data.assistantMessage.content);
      console.log('📊 模型:', data.data.assistantMessage.model);
      console.log('📊 Token:', JSON.stringify(data.data.assistantMessage.tokens));
      return true;
    } else {
      console.log('❌ 对话失败:', data.error?.code);
      console.log('📝 说明:', data.error?.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 对话失败:', error.message);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 OpenClaw AI 对话测试');
  console.log('==========================');

  // 1. 登录
  const token = await login();
  if (!token) {
    console.log('\n❌ 无法获取 token，测试终止');
    return;
  }

  // 2. 创建会话
  const sessionId = await createSession(token);
  if (!sessionId) {
    console.log('\n❌ 无法创建会话，测试终止');
    return;
  }

  // 3. 测试不同模型
  console.log('\n📋 开始测试不同模型...');

  // 测试 DeepSeek（通常响应快且稳定）
  console.log('\n--- 测试 DeepSeek ---');
  await testChat(token, sessionId, 'deepseek-chat');

  // 测试 Kimi
  console.log('\n--- 测试 Kimi ---');
  await testChat(token, sessionId, 'moonshot-v1-8k');

  // 测试通义千问
  console.log('\n--- 测试 通义千问 ---');
  await testChat(token, sessionId, 'qwen-turbo');

  console.log('\n==========================');
  console.log('✅ AI 对话测试完成！');
  console.log('\n💡 提示:');
  console.log('   - 访问 http://localhost:5173 使用 Web 界面');
  console.log('   - 登录后即可与 AI 对话');
  console.log('   - 支持 11 个不同模型切换');
}

runTests();
