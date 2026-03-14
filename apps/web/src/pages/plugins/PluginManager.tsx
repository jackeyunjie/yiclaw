/**
 * 插件管理页面
 *
 * 管理所有 OpenClaw 插件：查看、启用/禁用、配置
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Switch,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Badge,
  Space,
  Typography,
  Tooltip,
} from 'antd';
import {
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 插件类型枚举
enum PluginType {
  CHANNEL = 'channel',
  MEMORY = 'memory',
  TOOL = 'tool',
  AGENT = 'agent',
  SKILL = 'skill',
}

// 插件状态枚举
enum PluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  LOADING = 'loading',
}

// 插件接口
interface Plugin {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description: string;
  status: PluginStatus;
  enabled: boolean;
  author?: string;
  config?: Record<string, unknown>;
  stats?: {
    messagesReceived?: number;
    messagesSent?: number;
    usersCount?: number;
  };
}

/**
 * 插件管理组件
 */
const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 模拟加载插件数据
  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      // TODO: 替换为真实 API 调用
      // const response = await fetch('/api/v1/plugins');
      // const data = await response.json();

      // 模拟数据
      const mockPlugins: Plugin[] = [
        {
          id: 'web',
          name: 'Web Chat',
          version: '1.0.0',
          type: PluginType.CHANNEL,
          description: '基于 WebSocket 的网页聊天通道',
          status: PluginStatus.ACTIVE,
          enabled: true,
          author: 'OpenClaw Team',
          stats: {
            messagesReceived: 1234,
            messagesSent: 5678,
            usersCount: 42,
          },
        },
        {
          id: 'feishu',
          name: 'Feishu (Lark)',
          version: '1.0.0',
          type: PluginType.CHANNEL,
          description: '飞书/钉钉 Bot 消息通道',
          status: PluginStatus.INACTIVE,
          enabled: false,
          author: 'OpenClaw Team',
        },
        {
          id: 'memory-database',
          name: 'Database Memory',
          version: '1.0.0',
          type: PluginType.MEMORY,
          description: '使用 PostgreSQL 存储和检索记忆',
          status: PluginStatus.ACTIVE,
          enabled: true,
          author: 'OpenClaw Team',
        },
        {
          id: 'tool-file',
          name: 'File Operations',
          version: '1.0.0',
          type: PluginType.TOOL,
          description: '读取、写入、列出和管理文件',
          status: PluginStatus.ACTIVE,
          enabled: true,
          author: 'OpenClaw Team',
        },
        {
          id: 'tool-shell',
          name: 'Shell Commands',
          version: '1.0.0',
          type: PluginType.TOOL,
          description: '安全地执行系统命令',
          status: PluginStatus.ACTIVE,
          enabled: true,
          author: 'OpenClaw Team',
        },
        {
          id: 'tool-http',
          name: 'HTTP Requests',
          version: '1.0.0',
          type: PluginType.TOOL,
          description: '发送 HTTP GET/POST/PUT/DELETE 请求',
          status: PluginStatus.ACTIVE,
          enabled: true,
          author: 'OpenClaw Team',
        },
      ];

      setPlugins(mockPlugins);
    } catch (error) {
      message.error('加载插件失败');
    } finally {
      setLoading(false);
    }
  };

  // 启用/禁用插件
  const togglePlugin = async (plugin: Plugin, enabled: boolean) => {
    try {
      // TODO: 替换为真实 API 调用
      // await fetch(`/api/v1/plugins/${plugin.id}/toggle`, { method: 'POST', body: { enabled } });

      setPlugins((prev) =>
        prev.map((p) =>
          p.id === plugin.id
            ? { ...p, enabled, status: enabled ? PluginStatus.ACTIVE : PluginStatus.INACTIVE }
            : p
        )
      );

      message.success(`${plugin.name} 已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 打开配置模态框
  const openConfigModal = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    form.setFieldsValue(plugin.config || {});
    setConfigModalVisible(true);
  };

  // 保存配置
  const saveConfig = async (values: Record<string, unknown>) => {
    try {
      // TODO: 替换为真实 API 调用
      // await fetch(`/api/v1/plugins/${selectedPlugin?.id}/config`, {
      //   method: 'PUT',
      //   body: JSON.stringify(values),
      // });

      message.success('配置已保存');
      setConfigModalVisible(false);
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 打开详情模态框
  const openDetailModal = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setDetailModalVisible(true);
  };

  // 获取类型标签颜色
  const getTypeColor = (type: PluginType) => {
    const colors: Record<PluginType, string> = {
      [PluginType.CHANNEL]: 'blue',
      [PluginType.MEMORY]: 'green',
      [PluginType.TOOL]: 'orange',
      [PluginType.AGENT]: 'purple',
      [PluginType.SKILL]: 'cyan',
    };
    return colors[type] || 'default';
  };

  // 获取类型显示名称
  const getTypeName = (type: PluginType) => {
    const names: Record<PluginType, string> = {
      [PluginType.CHANNEL]: '通道',
      [PluginType.MEMORY]: '记忆',
      [PluginType.TOOL]: '工具',
      [PluginType.AGENT]: 'Agent',
      [PluginType.SKILL]: '技能',
    };
    return names[type] || type;
  };

  // 获取状态徽章
  const getStatusBadge = (status: PluginStatus) => {
    const badges: Record<PluginStatus, { status: 'success' | 'error' | 'processing' | 'default'; text: string }> = {
      [PluginStatus.ACTIVE]: { status: 'success', text: '运行中' },
      [PluginStatus.INACTIVE]: { status: 'default', text: '已停止' },
      [PluginStatus.ERROR]: { status: 'error', text: '错误' },
      [PluginStatus.LOADING]: { status: 'processing', text: '加载中' },
    };
    const badge = badges[status];
    return <Badge status={badge.status} text={badge.text} />;
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Plugin) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color="default">v{record.version}</Tag>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: PluginType) => (
        <Tag color={getTypeColor(type)}>{getTypeName(type)}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: PluginStatus) => getStatusBadge(status),
    },
    {
      title: '启用',
      key: 'enabled',
      render: (_: unknown, record: Plugin) => (
        <Switch
          checked={record.enabled}
          onChange={(checked) => togglePlugin(record, checked)}
          checkedChildren={<PlayCircleOutlined />}
          unCheckedChildren={<PauseCircleOutlined />}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Plugin) => (
        <Space size="middle">
          <Tooltip title="配置">
            <Button
              icon={<SettingOutlined />}
              size="small"
              onClick={() => openConfigModal(record)}
            />
          </Tooltip>
          <Tooltip title="详情">
            <Button
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={() => openDetailModal(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Title level={4}>插件管理</Title>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadPlugins}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              安装插件
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={plugins}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 配置模态框 */}
      <Modal
        title={`配置 ${selectedPlugin?.name}`}
        open={configModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setConfigModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={saveConfig}>
          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
          <Form.Item name="timeout" label="超时时间（毫秒）">
            <Input type="number" placeholder="30000" />
          </Form.Item>
          <Form.Item name="maxSize" label="最大文件大小（字节）">
            <Input type="number" placeholder="10485760" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title={`${selectedPlugin?.name} 详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedPlugin && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID">{selectedPlugin.id}</Descriptions.Item>
            <Descriptions.Item label="版本">{selectedPlugin.version}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag color={getTypeColor(selectedPlugin.type)}>
                {getTypeName(selectedPlugin.type)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusBadge(selectedPlugin.status)}
            </Descriptions.Item>
            <Descriptions.Item label="作者">{selectedPlugin.author || 'Unknown'}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedPlugin.description}
            </Descriptions.Item>
            {selectedPlugin.stats && (
              <>
                <Descriptions.Item label="接收消息">
                  {selectedPlugin.stats.messagesReceived || 0}
                </Descriptions.Item>
                <Descriptions.Item label="发送消息">
                  {selectedPlugin.stats.messagesSent || 0}
                </Descriptions.Item>
                <Descriptions.Item label="用户数">
                  {selectedPlugin.stats.usersCount || 0}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PluginManager;
