/**
 * 定时任务管理页面
 *
 * 管理 Cron 定时任务，支持 ReAct 任务、命令任务、HTTP 任务
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Statistic,
  Row,
  Col,
  Timeline,
  Typography
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  CodeOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { schedulerApi } from '../services/schedulerApi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 定时任务类型
 */
type TaskType = 'react' | 'command' | 'http';

/**
 * 定时任务
 */
interface ScheduledTask {
  taskId: string;
  name: string;
  description?: string;
  cronExpression: string;
  type: TaskType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  failCount: number;
}

/**
 * 执行记录
 */
interface ExecutionRecord {
  executionId: string;
  status: 'success' | 'failure';
  startedAt: string;
  completedAt: string;
  duration: number;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * 调度器状态
 */
interface SchedulerStatus {
  isRunning: boolean;
  totalTasks: number;
  activeTasks: number;
  totalRuns: number;
  totalFails: number;
  successRate: string;
}

/**
 * 定时任务页面组件
 */
const Scheduler: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>([]);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('react');

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await schedulerApi.getTasks();
      if (response.success && response.data) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载调度器状态
  const loadStatus = useCallback(async () => {
    try {
      const response = await schedulerApi.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('加载调度器状态失败', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadTasks();
    loadStatus();
    // 每30秒刷新一次
    const interval = setInterval(() => {
      loadTasks();
      loadStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadTasks, loadStatus]);

  /**
   * 创建任务
   */
  const handleCreate = async (values: any) => {
    try {
      const payload: any = {};

      // 根据任务类型设置 payload
      if (values.type === 'react') {
        payload.query = values.query;
      } else if (values.type === 'command') {
        payload.command = values.command;
      } else if (values.type === 'http') {
        payload.url = values.url;
        payload.method = values.method || 'GET';
        if (values.body) {
          try {
            payload.body = JSON.parse(values.body);
          } catch {
            payload.body = values.body;
          }
        }
      }

      const response = await schedulerApi.createTask({
        name: values.name,
        description: values.description,
        cronExpression: values.cronExpression,
        type: values.type,
        payload,
        options: {
          maxIterations: values.maxIterations,
          temperature: values.temperature,
          model: values.model
        },
        notification: {
          onSuccess: values.notifyOnSuccess,
          onFailure: values.notifyOnFailure,
          email: values.notifyEmail,
          webhook: values.notifyWebhook
        }
      });

      if (response.success) {
        message.success('任务创建成功');
        setModalVisible(false);
        form.resetFields();
        loadTasks();
        loadStatus();
      }
    } catch (error) {
      message.error('创建任务失败');
    }
  };

  /**
   * 立即执行任务
   */
  const handleRunNow = async (taskId: string) => {
    try {
      message.loading({ content: '正在执行任务...', key: taskId });
      const response = await schedulerApi.runTaskNow(taskId);
      if (response.success) {
        message.success({
          content: `任务执行${response.data?.status === 'success' ? '成功' : '失败'}，耗时 ${response.data?.duration}ms`,
          key: taskId
        });
        loadTasks();
        loadStatus();
      }
    } catch (error) {
      message.error({ content: '执行任务失败', key: taskId });
    }
  };

  /**
   * 启用/禁用任务
   */
  const handleToggleEnable = async (taskId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await schedulerApi.enableTask(taskId);
        message.success('任务已启用');
      } else {
        await schedulerApi.disableTask(taskId);
        message.success('任务已禁用');
      }
      loadTasks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  /**
   * 删除任务
   */
  const handleDelete = async (taskId: string) => {
    try {
      const response = await schedulerApi.deleteTask(taskId);
      if (response.success) {
        message.success('任务已删除');
        loadTasks();
        loadStatus();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  /**
   * 查看执行历史
   */
  const handleViewHistory = async (taskId: string) => {
    try {
      const response = await schedulerApi.getExecutionHistory(taskId);
      if (response.success && response.data) {
        setExecutionHistory(response.data.history);
        setHistoryModalVisible(true);
      }
    } catch (error) {
      message.error('加载执行历史失败');
    }
  };

  /**
   * 获取任务类型标签
   */
  const getTypeTag = (type: TaskType) => {
    const colors: Record<TaskType, string> = {
      react: 'blue',
      command: 'orange',
      http: 'green'
    };
    const icons: Record<TaskType, React.ReactNode> = {
      react: <CodeOutlined />,
      command: <CodeOutlined />,
      http: <GlobalOutlined />
    };
    const labels: Record<TaskType, string> = {
      react: 'ReAct',
      command: '命令',
      http: 'HTTP'
    };
    return (
      <Tag icon={icons[type]} color={colors[type]}>
        {labels[type]}
      </Tag>
    );
  };

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ScheduledTask) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: TaskType) => getTypeTag(type)
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cronExpression',
      key: 'cronExpression',
      width: 150,
      render: (text: string) => (
        <Tooltip title="分 时 日 月 周">
          <Tag icon={<ClockCircleOutlined />}>{text}</Tag>
        </Tooltip>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: ScheduledTask) => (
        <Badge
          status={record.enabled ? 'processing' : 'default'}
          text={record.enabled ? '运行中' : '已暂停'}
        />
      )
    },
    {
      title: '执行统计',
      key: 'stats',
      width: 150,
      render: (_: any, record: ScheduledTask) => (
        <Space>
          <Tooltip title="成功次数">
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {record.runCount - record.failCount}
            </Tag>
          </Tooltip>
          <Tooltip title="失败次数">
            <Tag color="error" icon={<CloseCircleOutlined />}>
              {record.failCount}
            </Tag>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '下次执行',
      key: 'nextRun',
      width: 180,
      render: (_: any, record: ScheduledTask) => (
        <Text type="secondary">
          {record.nextRunAt
            ? new Date(record.nextRunAt).toLocaleString()
            : '未调度'}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: ScheduledTask) => (
        <Space>
          <Tooltip title="立即执行">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleRunNow(record.taskId)}
            />
          </Tooltip>
          <Tooltip title={record.enabled ? '暂停' : '启用'}>
            <Button
              type="text"
              icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleEnable(record.taskId, !record.enabled)}
            />
          </Tooltip>
          <Tooltip title="执行历史">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record.taskId)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个任务吗？"
            onConfirm={() => handleDelete(record.taskId)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>
        <ScheduleOutlined /> 定时任务调度器
      </Title>
      <Paragraph type="secondary">
        管理 Cron 定时任务，支持 ReAct AI 任务、Shell 命令、HTTP 请求等多种任务类型
      </Paragraph>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={status?.totalTasks || 0}
              prefix={<ScheduleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={status?.activeTasks || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总执行次数"
              value={status?.totalRuns || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={status?.successRate || 'N/A'}
              valueStyle={{ color: status?.successRate && parseFloat(status.successRate) > 90 ? '#52c41a' : '#faad14' }}
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务列表 */}
      <Card
        title="定时任务列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建任务
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="taskId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建/编辑任务模态框 */}
      <Modal
        title="新建定时任务"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            type: 'react',
            cronExpression: '0 9 * * *',
            maxIterations: 10,
            temperature: 0.7,
            method: 'GET'
          }}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：每日代码检查" />
          </Form.Item>

          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={2} placeholder="任务的详细描述（可选）" />
          </Form.Item>

          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true }]}
          >
            <Select onChange={(value) => setActiveTab(value)}>
              <Option value="react">
                <Space><CodeOutlined /> ReAct AI 任务</Space>
              </Option>
              <Option value="command">
                <Space><CodeOutlined /> Shell 命令</Space>
              </Option>
              <Option value="http">
                <Space><GlobalOutlined /> HTTP 请求</Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="cronExpression"
            label="Cron 表达式"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            extra="格式：分 时 日 月 周，例如：0 9 * * *（每天9点）"
          >
            <Input placeholder="0 9 * * *" />
          </Form.Item>

          {/* ReAct 任务配置 */}
          {activeTab === 'react' && (
            <>
              <Form.Item
                name="query"
                label="ReAct 查询"
                rules={[{ required: true, message: '请输入 ReAct 查询' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="例如：检查项目根目录下的所有 TODO 注释"
                />
              </Form.Item>

              <Form.Item name="maxIterations" label="最大迭代次数">
                <Input type="number" min={1} max={50} />
              </Form.Item>

              <Form.Item name="temperature" label="Temperature">
                <Input type="number" min={0} max={2} step={0.1} />
              </Form.Item>

              <Form.Item name="model" label="模型">
                <Input placeholder="默认使用系统配置" />
              </Form.Item>
            </>
          )}

          {/* 命令任务配置 */}
          {activeTab === 'command' && (
            <Form.Item
              name="command"
              label="Shell 命令"
              rules={[{ required: true, message: '请输入命令' }]}
            >
              <TextArea
                rows={3}
                placeholder="例如：df -h | grep /dev/sda"
              />
            </Form.Item>
          )}

          {/* HTTP 任务配置 */}
          {activeTab === 'http' && (
            <>
              <Form.Item
                name="url"
                label="URL"
                rules={[{ required: true, message: '请输入 URL' }]}
              >
                <Input placeholder="https://api.example.com/health" />
              </Form.Item>

              <Form.Item name="method" label="请求方法">
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>

              <Form.Item name="body" label="请求体 (JSON)">
                <TextArea
                  rows={3}
                  placeholder='{"key": "value"}'
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建任务
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行历史模态框 */}
      <Modal
        title="执行历史"
        visible={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        width={800}
        footer={null}
      >
        <Timeline>
          {executionHistory.map((record) => (
            <Timeline.Item
              key={record.executionId}
              color={record.status === 'success' ? 'green' : 'red'}
              dot={record.status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            >
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color={record.status === 'success' ? 'success' : 'error'}>
                      {record.status === 'success' ? '成功' : '失败'}
                    </Tag>
                    <Text type="secondary">
                      {new Date(record.startedAt).toLocaleString()}
                    </Text>
                  </Space>
                  <Text>执行耗时: {record.duration}ms</Text>
                  {record.error && (
                    <Text type="danger">错误: {record.error}</Text>
                  )}
                  {record.result && (
                    <details>
                      <summary>查看结果</summary>
                      <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                        {JSON.stringify(record.result, null, 2)}
                      </pre>
                    </details>
                  )}
                </Space>
              </Card>
            </Timeline.Item>
          ))}
        </Timeline>
      </Modal>
    </div>
  );
};

export default Scheduler;
