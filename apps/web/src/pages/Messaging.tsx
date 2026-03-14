/**
 * 消息通知管理页面
 *
 * 管理微信、钉钉、飞书消息配置和发送
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Tabs,
  List,
  Tag,
  Space,
  message,
  Modal,
  Typography,
  Alert,
  Divider,
  Radio
} from 'antd';

const { TextArea } = Input;
import {
  SendOutlined,
  WechatOutlined,
  DingdingOutlined,
  RocketOutlined,
  MessageOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { messagingApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

/**
 * 消息平台配置
 */
interface MessagingConfig {
  id?: string;
  name: string;
  platform: 'wechat' | 'dingtalk' | 'feishu';
  webhookUrl: string;
  secret?: string;
  description?: string;
  isDefault: boolean;
  enabled: boolean;
}

/**
 * 消息平台图标和颜色
 */
const platformConfig = {
  wechat: {
    icon: <WechatOutlined />,
    color: 'green',
    label: '微信企业微信',
    description: '支持文本和 Markdown 格式，可@成员'
  },
  dingtalk: {
    icon: <DingdingOutlined />,
    color: 'blue',
    label: '钉钉',
    description: '支持文本和 Markdown 格式，支持加签安全'
  },
  feishu: {
    icon: <RocketOutlined />,
    color: 'cyan',
    label: '飞书',
    description: '支持文本和 Markdown 格式，支持加签安全'
  }
};

const Messaging: React.FC = () => {
  const [configs, setConfigs] = useState<MessagingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [, setSelectedPlatform] = useState<string>('wechat');
  const [sendForm] = Form.useForm();
  const [testForm] = Form.useForm();

  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await messagingApi.getConfigs();
      if (response.success) {
        // 后端返回的是配置数组
        setConfigs((response.data as unknown as MessagingConfig[]) || []);
      }
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = async (values: any) => {
    try {
      setLoading(true);
      const response = await messagingApi.sendMessage({
        platform: values.platform,
        webhookUrl: values.webhookUrl,
        content: values.content,
        msgType: values.msgType,
        secret: values.secret,
        mentionedMobileList: values.mentionedMobileList?.split(',').map((m: string) => m.trim())
      });

      if (response.success) {
        message.success('消息发送成功');
        setSendModalVisible(false);
        sendForm.resetFields();
      } else {
        message.error(response.error?.message || '发送失败');
      }
    } catch (error) {
      message.error('发送消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送测试消息
  const handleTestMessage = async (values: any) => {
    try {
      setLoading(true);
      const response = await messagingApi.testConfig({
        platform: values.platform,
        webhookUrl: values.webhookUrl,
        secret: values.secret
      });

      if (response.success) {
        message.success('测试消息发送成功');
        setTestModalVisible(false);
        testForm.resetFields();
      } else {
        message.error(response.error?.message || '测试失败');
      }
    } catch (error) {
      message.error('测试消息发送失败');
    } finally {
      setLoading(false);
    }
  };

  // 发送任务通知
  const handleTaskNotification = async (values: any) => {
    try {
      setLoading(true);
      const response = await messagingApi.sendTaskNotification({
        platform: values.platform,
        webhookUrl: values.webhookUrl,
        taskName: values.taskName,
        status: values.status,
        details: {
          duration: values.duration,
          result: values.result,
          error: values.error
        },
        secret: values.secret
      });

      if (response.success) {
        message.success('任务通知发送成功');
      } else {
        message.error(response.error?.message || '发送失败');
      }
    } catch (error) {
      message.error('发送任务通知失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <MessageOutlined /> 消息通知管理
      </Title>
      <Paragraph>
        配置和管理微信、钉钉、飞书消息通知，支持发送任务状态通知和批量消息。
      </Paragraph>

      <Tabs defaultActiveKey="configs">
        <TabPane
          tab={<span><BellOutlined /> 配置管理</span>}
          key="configs"
        >
          <Card title="消息平台配置" loading={loading}>
            {configs.length === 0 ? (
              <Alert
                message="暂无配置"
                description="请在环境变量中配置 Webhook URL，或添加新的消息配置"
                type="info"
                showIcon
              />
            ) : (
              <List
                dataSource={configs}
                renderItem={(config) => (
                  <List.Item
                    actions={[
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => {
                          setSelectedPlatform(config.platform);
                          sendForm.setFieldsValue({
                            platform: config.platform,
                            webhookUrl: config.webhookUrl,
                            secret: config.secret
                          });
                          setSendModalVisible(true);
                        }}
                      >
                        发送消息
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Tag color={platformConfig[config.platform].color} style={{ fontSize: '20px', padding: '4px 8px' }}>
                          {platformConfig[config.platform].icon}
                        </Tag>
                      }
                      title={
                        <Space>
                          <Text strong>{config.name}</Text>
                          {config.isDefault && <Tag color="blue">默认</Tag>}
                          {config.enabled ? <Tag color="success">启用</Tag> : <Tag>禁用</Tag>}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">{platformConfig[config.platform].label}</Text>
                          <Text type="secondary" copyable>{config.webhookUrl}</Text>
                          {config.description && <Text type="secondary">{config.description}</Text>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            <Divider />

            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setTestModalVisible(true)}
              >
                测试配置
              </Button>
            </Space>
          </Card>
        </TabPane>

        <TabPane
          tab={<span><SendOutlined /> 发送消息</span>}
          key="send"
        >
          <Card title="发送消息">
            <Form
              form={sendForm}
              layout="vertical"
              onFinish={handleSendMessage}
            >
              <Form.Item
                name="platform"
                label="消息平台"
                rules={[{ required: true, message: '请选择消息平台' }]}
              >
                <Select placeholder="选择平台">
                  <Option value="wechat">
                    <Space><WechatOutlined /> 微信企业微信</Space>
                  </Option>
                  <Option value="dingtalk">
                    <Space><DingdingOutlined /> 钉钉</Space>
                  </Option>
                  <Option value="feishu">
                    <Space><RocketOutlined /> 飞书</Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="webhookUrl"
                label="Webhook URL"
                rules={[{ required: true, message: '请输入 Webhook URL' }]}
              >
                <Input placeholder="https://..." />
              </Form.Item>

              <Form.Item
                name="secret"
                label="签名密钥 (可选)"
              >
                <Input.Password placeholder="钉钉/飞书加签密钥" />
              </Form.Item>

              <Form.Item
                name="msgType"
                label="消息类型"
                initialValue="text"
              >
                <Radio.Group>
                  <Radio.Button value="text">文本</Radio.Button>
                  <Radio.Button value="markdown">Markdown</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="content"
                label="消息内容"
                rules={[{ required: true, message: '请输入消息内容' }]}
              >
                <TextArea
                  rows={6}
                  placeholder="输入消息内容，支持 Markdown 格式"
                />
              </Form.Item>

              <Form.Item
                name="mentionedMobileList"
                label="@手机号 (可选，仅微信)"
              >
                <Input placeholder="13800138000,13900139000" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
                  发送消息
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={<span><BellOutlined /> 任务通知</span>}
          key="notification"
        >
          <Card title="发送任务状态通知">
            <Alert
              message="任务通知模板"
              description="自动格式化任务状态消息，包含任务名称、状态、耗时等信息"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form layout="vertical" onFinish={handleTaskNotification}>
              <Form.Item
                name="platform"
                label="消息平台"
                rules={[{ required: true }]}
              >
                <Select placeholder="选择平台">
                  <Option value="wechat">微信企业微信</Option>
                  <Option value="dingtalk">钉钉</Option>
                  <Option value="feishu">飞书</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="webhookUrl"
                label="Webhook URL"
                rules={[{ required: true }]}
              >
                <Input placeholder="https://..." />
              </Form.Item>

              <Form.Item
                name="secret"
                label="签名密钥 (可选)"
              >
                <Input.Password />
              </Form.Item>

              <Form.Item
                name="taskName"
                label="任务名称"
                rules={[{ required: true }]}
              >
                <Input placeholder="例如：数据备份任务" />
              </Form.Item>

              <Form.Item
                name="status"
                label="任务状态"
                rules={[{ required: true }]}
              >
                <Select placeholder="选择状态">
                  <Option value="started">🚀 开始执行</Option>
                  <Option value="completed">✅ 执行完成</Option>
                  <Option value="failed">❌ 执行失败</Option>
                  <Option value="warning">⚠️ 警告</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="duration"
                label="耗时 (秒)"
              >
                <Input type="number" placeholder="例如：120" />
              </Form.Item>

              <Form.Item
                name="result"
                label="执行结果"
              >
                <TextArea rows={2} placeholder="任务执行结果摘要" />
              </Form.Item>

              <Form.Item
                name="error"
                label="错误信息"
              >
                <TextArea rows={2} placeholder="如果有错误，填写错误信息" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<BellOutlined />}>
                  发送任务通知
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={<span><ExclamationCircleOutlined /> 使用说明</span>}
          key="help"
        >
          <Card title="消息通知配置指南">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}><WechatOutlined /> 微信企业微信</Title>
                <Paragraph>
                  1. 在企业微信管理后台创建群机器人<br />
                  2. 复制 Webhook URL<br />
                  3. 支持文本和 Markdown 格式<br />
                  4. 支持 @成员（通过手机号）
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={4}><DingdingOutlined /> 钉钉</Title>
                <Paragraph>
                  1. 在钉钉群设置中添加机器人<br />
                  2. 选择「自定义」机器人<br />
                  3. 复制 Webhook URL<br />
                  4. 如需加签安全，复制签名密钥<br />
                  5. 支持文本和 Markdown 格式
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={4}><RocketOutlined /> 飞书</Title>
                <Paragraph>
                  1. 在飞书群设置中添加自定义机器人<br />
                  2. 复制 Webhook URL<br />
                  3. 如需签名验证，启用并复制密钥<br />
                  4. 支持文本和 Markdown 格式
                </Paragraph>
              </div>
            </Space>
          </Card>
        </TabPane>
      </Tabs>

      {/* 发送消息模态框 */}
      <Modal
        title="发送消息"
        open={sendModalVisible}
        onCancel={() => setSendModalVisible(false)}
        footer={null}
      >
        <Form
          form={sendForm}
          layout="vertical"
          onFinish={handleSendMessage}
        >
          <Form.Item
            name="platform"
            label="消息平台"
            rules={[{ required: true }]}
          >
            <Select disabled>
              <Option value="wechat">微信</Option>
              <Option value="dingtalk">钉钉</Option>
              <Option value="feishu">飞书</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="webhookUrl"
            label="Webhook URL"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="content"
            label="消息内容"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setSendModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                发送
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试配置模态框 */}
      <Modal
        title="测试消息配置"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={null}
      >
        <Form
          form={testForm}
          layout="vertical"
          onFinish={handleTestMessage}
        >
          <Form.Item
            name="platform"
            label="消息平台"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择平台">
              <Option value="wechat">微信企业微信</Option>
              <Option value="dingtalk">钉钉</Option>
              <Option value="feishu">飞书</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="webhookUrl"
            label="Webhook URL"
            rules={[{ required: true }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            name="secret"
            label="签名密钥 (可选)"
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setTestModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                发送测试消息
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Messaging;
