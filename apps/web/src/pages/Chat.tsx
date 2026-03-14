/**
 * 聊天页面
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Input,
  List,
  Avatar,
  message,
  Spin,
  Empty,
  Tag,
  Select,
} from 'antd';
import {
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  RobotOutlined,
  LogoutOutlined,
  ToolOutlined,
  PlayCircleOutlined,
  ScheduleOutlined,
  BookOutlined,
  MessageOutlined,
  DatabaseOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { sessionApi, chatApi, type Session, type Message } from '../services/api';

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;

interface Model {
  id: string;
  name: string;
  description: string;
}

function Chat() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // 加载会话列表
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const result = await sessionApi.getSessions();
      if (result.success && result.data) {
        setSessions(result.data);
      }
    } catch (error) {
      message.error('加载会话失败');
    } finally {
      setSessionsLoading(false);
    }
  };

  // 加载模型列表
  const loadModels = async () => {
    try {
      const result = await chatApi.getModels();
      console.log('Models API Response:', result);
      if (result.success && result.data) {
        setModels(result.data.models);
        // 使用模型接口返回的 configured 状态
        if (result.data.configured !== undefined) {
          setAiConfigured(result.data.configured);
        }
        // 默认选择第一个模型
        if (result.data.models.length > 0 && !selectedModel) {
          setSelectedModel(result.data.models[0].id);
        }
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadSessions();
    // 只调用 loadModels，它会同时设置模型列表和 AI 配置状态
    loadModels();
  }, []);

  // 加载消息
  const loadMessages = async (sessionId: string) => {
    try {
      const result = await sessionApi.getMessages(sessionId);
      if (result.success && result.data) {
        setMessages(result.data.messages);
      }
    } catch (error) {
      message.error('加载消息失败');
    }
  };

  // 选择会话
  const handleSelectSession = (session: Session) => {
    setCurrentSession(session);
    loadMessages(session.id);
  };

  // 创建新会话
  const handleCreateSession = async () => {
    try {
      const result = await sessionApi.createSession('新会话');
      if (result.success && result.data) {
        setSessions([result.data, ...sessions]);
        setCurrentSession(result.data);
        setMessages([]);
        message.success('会话创建成功');
      }
    } catch (error) {
      message.error('创建会话失败');
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await sessionApi.deleteSession(sessionId);
      if (result.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }
        message.success('会话删除成功');
      }
    } catch (error) {
      message.error('删除会话失败');
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!currentSession) {
      message.warning('请先选择或创建一个会话');
      return;
    }
    if (!aiConfigured) {
      message.warning('AI 服务未配置，请联系管理员');
      return;
    }

    const content = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // 添加用户消息到列表
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await chatApi.chat(currentSession.id, content, selectedModel);
      
      if (result.success && result.data) {
        setMessages(prev => [...prev, {
          ...result.data!.assistantMessage,
          role: 'ASSISTANT',
        }]);
      } else {
        message.error(result.error?.message || '发送失败');
      }
    } catch (error) {
      message.error('发送消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 侧边栏 - 会话列表 */}
      <Sider
        width={300}
        theme="light"
        style={{
          borderRight: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateSession}
            block
          >
            新建会话
          </Button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <Spin spinning={sessionsLoading}>
            <List
              dataSource={sessions}
              renderItem={(session) => (
                <List.Item
                  onClick={() => handleSelectSession(session)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: currentSession?.id === session.id ? '#e6f7ff' : 'transparent',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      size="small"
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={session.title}
                    description={
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {session.lastMessage
                          ? session.lastMessage.content.substring(0, 30) + '...'
                          : '暂无消息'}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Spin>
        </div>
      </Sider>

      {/* 主内容区 */}
      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              {currentSession?.title || '请选择会话'}
            </span>
            {aiConfigured && models.length > 0 && (
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                style={{ width: 320 }}
                placeholder="选择 AI 模型"
                optionLabelProp="label"
                options={models.map(m => ({
                  value: m.id,
                  label: m.name,
                  title: `${m.name}${m.description ? ` - ${m.description}` : ''}`,
                }))}
              />
            )}
            {!aiConfigured && (
              <Tag color="warning">
                AI 未配置
              </Tag>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate('/react')}
            >
              ReAct
            </Button>
            <Button
              type="text"
              icon={<ScheduleOutlined />}
              onClick={() => navigate('/scheduler')}
            >
              定时任务
            </Button>
            <Button
              type="text"
              icon={<ToolOutlined />}
              onClick={() => navigate('/auto-tasks')}
            >
              自动任务
            </Button>
            <Button
              type="text"
              icon={<BookOutlined />}
              onClick={() => navigate('/memory')}
            >
              长期记忆
            </Button>
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => navigate('/messaging')}
            >
              消息通知
            </Button>
            <Button
              type="text"
              icon={<DatabaseOutlined />}
              onClick={() => navigate('/database')}
            >
              数据库
            </Button>
            <Button
              type="text"
              icon={<DashboardOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              仪表板
            </Button>
            <span style={{ color: '#666' }}>
              <UserOutlined style={{ marginRight: 4 }} />
              {user.username}
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              退出
            </Button>
          </div>
        </Header>

        <Content style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 消息列表 */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              background: '#f5f5f5',
            }}
          >
            {!currentSession ? (
              <Empty
                description="请选择或创建一个会话开始聊天"
                style={{ marginTop: 200 }}
              />
            ) : messages.length === 0 ? (
              <Empty
                description="发送消息开始对话"
                style={{ marginTop: 200 }}
              />
            ) : (
              <List
                dataSource={messages}
                renderItem={(msg) => (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'USER' ? 'flex-end' : 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: msg.role === 'USER' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        maxWidth: '70%',
                      }}
                    >
                      <Avatar
                        icon={msg.role === 'USER' ? <UserOutlined /> : <RobotOutlined />}
                        style={{
                          backgroundColor: msg.role === 'USER' ? '#1890ff' : '#52c41a',
                          margin: msg.role === 'USER' ? '0 0 0 8px' : '0 8px 0 0',
                        }}
                      />
                      <div>
                        <div
                          style={{
                            background: msg.role === 'USER' ? '#1890ff' : '#fff',
                            color: msg.role === 'USER' ? '#fff' : '#333',
                            padding: '12px 16px',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        >
                          {msg.content}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#999',
                            marginTop: 4,
                            textAlign: msg.role === 'USER' ? 'right' : 'left',
                          }}
                        >
                          {formatTime(msg.createdAt)}
                          {msg.metadata?.model && (
                            <Tag style={{ marginLeft: 8, fontSize: 10 }}>
                              {msg.metadata.model}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div
            style={{
              padding: '16px 24px',
              background: '#fff',
              borderTop: '1px solid #e8e8e8',
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  !currentSession
                    ? '请先选择或创建会话'
                    : !aiConfigured
                    ? 'AI 服务未配置'
                    : '输入消息，按 Enter 发送，Shift+Enter 换行'
                }
                disabled={!currentSession || !aiConfigured || loading}
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={loading}
                disabled={!currentSession || !aiConfigured || !inputValue.trim()}
                size="large"
              >
                发送
              </Button>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default Chat;
