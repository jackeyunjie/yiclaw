/**
 * 完整对话流程测试 - 多轮对话 + 上下文记忆
 */

const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

function log(title, content = '', color = 'reset') {
  console.log(`${colors.bright}${colors[color]}${title}${colors.reset}`, content);
}

async function testFullConversation() {
  log('\n🚀 OpenClaw 完整对话流程测试', '', 'green');
  log('=====================================\n');

  // 1. 登录
  log('🔑 步骤 1: 用户登录', '', 'cyan');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'testpass123' })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.success) {
    log('❌ 登录失败:', loginData.error?.message, 'yellow');
    return;
  }
  
  const token = loginData.data.token;
  const user = loginData.data.user;
  log('✅ 登录成功!', `欢迎, ${user.username} (${user.role})`, 'green');
  log('');

  // 2. 获取模型列表
  log('📋 步骤 2: 获取可用模型列表', '', 'cyan');
  const modelsRes = await fetch(`${BASE_URL}/api/v1/chat/models`);
  const modelsData = await modelsRes.json();
  
  if (modelsData.success) {
    log(`✅ 发现 ${modelsData.data.models.length} 个模型:`, '', 'green');
    modelsData.data.models.forEach(m => {
      console.log(`   • ${colors.cyan}${m.id}${colors.reset} (${m.provider}) - ${m.description}`);
    });
  }
  log('');

  // 3. 创建会话
  log('💬 步骤 3: 创建新会话', '', 'cyan');
  const sessionRes = await fetch(`${BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      title: '多轮对话测试', 
      channelType: 'WEB' 
    })
  });
  const sessionData = await sessionRes.json();
  
  if (!sessionData.success) {
    log('❌ 创建会话失败:', sessionData.error?.message, 'yellow');
    return;
  }
  
  const sessionId = sessionData.data.id;
  log('✅ 会话创建成功!', `ID: ${sessionId}`, 'green');
  log('');

  // 4. 多轮对话测试
  log('🤖 步骤 4: 开始多轮对话测试', '', 'cyan');
  log('=====================================\n');

  const conversations = [
    {
      model: 'deepseek:deepseek-chat',
      modelName: 'DeepSeek',
      messages: [
        { role: 'user', content: '你好，我叫小明。请记住我的名字。' },
        { role: 'user', content: '我叫什么名字？' },
        { role: 'user', content: '1+1等于几？' },
        { role: 'user', content: '再加上10呢？' },
      ]
    },
    {
      model: 'dashscope:qwen-turbo',
      modelName: '通义千问',
      messages: [
        { role: 'user', content: '请用一句话介绍人工智能。' },
        { role: 'user', content: '它有哪些应用场景？' },
      ]
    }
  ];

  for (const conv of conversations) {
    log(`\n📝 测试模型: ${conv.modelName}`, '', 'magenta');
    log('─'.repeat(50));

    for (const msg of conv.messages) {
      log(`👤 用户:`, msg.content, 'cyan');
      
      const startTime = Date.now();
      const chatRes = await fetch(`${BASE_URL}/api/v1/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: msg.content,
          model: conv.model,
          stream: false
        })
      });
      
      const chatData = await chatRes.json();
      const duration = Date.now() - startTime;

      if (chatData.success) {
        const aiMsg = chatData.data.assistantMessage;
        log(`🤖 AI:`, aiMsg.content.substring(0, 100) + (aiMsg.content.length > 100 ? '...' : ''), 'green');
        log(`📊 Token:`, `${aiMsg.tokens.total} (提示: ${aiMsg.tokens.prompt}, 生成: ${aiMsg.tokens.completion})`, 'yellow');
        log(`⏱️ 耗时:`, `${duration}ms`, 'yellow');
      } else {
        log(`❌ 错误:`, chatData.error?.message, 'yellow');
      }
      log('');
    }
  }

  // 5. 查看会话消息历史
  log('\n📜 步骤 5: 查看会话消息历史', '', 'cyan');
  log('=====================================\n');
  
  const historyRes = await fetch(`${BASE_URL}/api/v1/sessions/${sessionId}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const historyData = await historyRes.json();
  
  if (historyData.success) {
    const messages = historyData.data.messages;
    log(`✅ 会话历史 (${messages.length} 条消息):`, '', 'green');
    messages.forEach((msg, idx) => {
      const role = msg.role === 'USER' ? '👤' : '🤖';
      const content = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
      console.log(`   ${idx + 1}. ${role} ${msg.role}: ${content}`);
    });
  }
  log('');

  // 6. 获取会话列表
  log('\n📋 步骤 6: 获取用户所有会话', '', 'cyan');
  const sessionsRes = await fetch(`${BASE_URL}/api/v1/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const sessionsData = await sessionsRes.json();
  
  if (sessionsData.success) {
    log(`✅ 共有 ${sessionsData.data.length} 个会话:`, '', 'green');
    sessionsData.data.forEach(s => {
      const lastMsg = s.lastMessage ? `最后消息: ${s.lastMessage.content.substring(0, 20)}...` : '无消息';
      console.log(`   • ${s.title} (${s.id.substring(0, 8)}...) - ${lastMsg}`);
    });
  }

  log('\n' + '='.repeat(50));
  log('🎉 完整对话流程测试完成!', '', 'green');
  log('\n💡 提示:', '', 'cyan');
  console.log('   • 访问 http://localhost:5173 使用 Web 界面');
  console.log('   • 支持多模型切换和上下文记忆');
  console.log('   • 所有对话记录已保存到数据库');
}

testFullConversation().catch(console.error);
