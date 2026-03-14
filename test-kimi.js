/**
 * 测试 Kimi AI
 */

const BASE_URL = 'http://localhost:3000';

async function testKimi() {
  console.log('🤖 测试 Kimi AI');
  console.log('====================');

  // 登录
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'testpass123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;

  // 创建会话
  const sessionRes = await fetch(`${BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Kimi Test', channelType: 'WEB' })
  });
  const sessionData = await sessionRes.json();
  const sessionId = sessionData.data.id;

  console.log('👤 用户: 你好，请用一句话介绍自己');

  // 测试 Kimi
  const chatRes = await fetch(`${BASE_URL}/api/v1/chat/${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: '你好，请用一句话介绍自己',
      model: 'moonshot-v1-8k',
      stream: false
    })
  });

  const chatData = await chatRes.json();
  console.log('响应:', JSON.stringify(chatData, null, 2));
}

testKimi();
