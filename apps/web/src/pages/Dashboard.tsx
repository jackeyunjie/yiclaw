/**
 * 系统仪表板
 *
 * 监控系统状态、工具使用情况、任务执行统计
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Timeline,
  Alert,
  Spin,
  Badge,
  Space,
  Typography,
  Divider,
  Tooltip
} from 'antd';
import {
  DatabaseOutlined,
  MessageOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ApiOutlined,
  RobotOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * 工具统计
 */
interface ToolStats {
  name: string;
  category: string;
  description: string;
  usageCount: number;
  successRate: number;
  avgExecutionTime: number;
  status: 'active' | 'inactive';
}

/**
 * 系统状态
 */
interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  version: string;
  activeAgents: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
}

/**
 * 最近任务
 */
interface RecentTask {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'running';
  startTime: string;
  duration: number;
  toolsUsed: string[];
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [toolStats, setToolStats] = useState<ToolStats[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  // 工具分类配置
  const toolCategories: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    file: { icon: <FileTextOutlined />, color: 'blue', label: '文件操作' },
    system: { icon: <ApiOutlined />, color: 'cyan', label: '系统工具' },
    messaging: { icon: <MessageOutlined />, color: 'green', label: '消息通知' },
    database: { icon: <DatabaseOutlined />, color: 'purple', label: '数据库' },
    fileProcessor: { icon: <FileTextOutlined />, color: 'orange', label: '文件处理' }
  };

  // 加载数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 模拟系统状态数据（实际应该从 API 获取）
      setSystemStatus({
        status: 'healthy',
        uptime: 86400 * 3, // 3天
        version: '1.0.0',
        activeAgents: 3,
        pendingTasks: 5,
        completedTasks: 128,
        failedTasks: 3
      });

      // 工具统计（实际应该从 API 获取）
      setToolStats([
        { name: 'file_read', category: 'file', description: '读取文件', usageCount: 45, successRate: 98, avgExecutionTime: 12, status: 'active' },
        { name: 'file_write', category: 'file', description: '写入文件', usageCount: 32, successRate: 95, avgExecutionTime: 25, status: 'active' },
        { name: 'shell_command', category: 'system', description: '执行命令', usageCount: 28, successRate: 92, avgExecutionTime: 150, status: 'active' },
        { name: 'http_request', category: 'system', description: 'HTTP 请求', usageCount: 67, successRate: 96, avgExecutionTime: 200, status: 'active' },
        { name: 'send_message', category: 'messaging', description: '发送消息', usageCount: 23, successRate: 100, avgExecutionTime: 300, status: 'active' },
        { name: 'sql_query', category: 'database', description: 'SQL 查询', usageCount: 56, successRate: 94, avgExecutionTime: 80, status: 'active' },
        { name: 'parse_excel', category: 'fileProcessor', description: 'Excel 解析', usageCount: 18, successRate: 97, avgExecutionTime: 500, status: 'active' },
        { name: 'parse_pdf', category: 'fileProcessor', description: 'PDF 解析', usageCount: 12, successRate: 91, avgExecutionTime: 800, status: 'active' }
      ]);

      // 最近任务（实际应该从 API 获取）
      setRecentTasks([
        { id: '1', name: '每日数据备份', status: 'completed', startTime: '2024-01-15 09:00:00', duration: 120, toolsUsed: ['sql_query', 'file_write'] },
        { id: '2', name: '销售报表生成', status: 'completed', startTime: '2024-01-15 08:30:00', duration: 45, toolsUsed: ['parse_excel', 'generate_excel', 'send_message'] },
        { id: '3', name: '系统健康检查', status: 'running', startTime: '2024-01-15 10:00:00', duration: 0, toolsUsed: ['db_health_check', 'shell_command'] },
        { id: '4', name: '用户数据同步', status: 'failed', startTime: '2024-01-15 07:00:00', duration: 300, toolsUsed: ['sql_query', 'http_request'] },
        { id: '5', name: '周报生成', status: 'completed', startTime: '2024-01-14 18:00:00', duration: 180, toolsUsed: ['sql_query', 'generate_excel', 'send_message'] }
      ]);
    } catch (error) {
      console.error('加载仪表板数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化运行时间
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  // 工具统计表格列
  const toolColumns = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ToolStats) => (
        <Space>
          <Tag color={toolCategories[record.category]?.color || 'default'}>
            {toolCategories[record.category]?.icon}
          </Tag>
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      sorter: (a: ToolStats, b: ToolStats) => a.usageCount - b.usageCount
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 95 ? 'success' : rate >= 80 ? 'normal' : 'exception'}
          format={percent => `${percent}%`}
        />
      )
    },
    {
      title: '平均耗时',
      dataIndex: 'avgExecutionTime',
      key: 'avgExecutionTime',
      render: (time: number) => `${time}ms`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={status === 'active' ? 'processing' : 'default'}
          text={status === 'active' ? '运行中' : '已停用'}
        />
      )
    }
  ];

  // 任务状态标签
  const getTaskStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
      case 'running':
        return <Tag icon={<SyncOutlined spin />} color="processing">运行中</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <RobotOutlined /> 系统仪表板
      </Title>
      <Paragraph>
        监控系统状态、工具使用情况和任务执行统计
      </Paragraph>

      <Spin spinning={loading}>
        {/* 系统状态概览 */}
        {systemStatus && (
          <>
            <Alert
              message={`系统状态: ${systemStatus.status === 'healthy' ? '健康' : systemStatus.status === 'warning' ? '警告' : '异常'}`}
              type={systemStatus.status === 'healthy' ? 'success' : systemStatus.status === 'warning' ? 'warning' : 'error'}
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="运行时间"
                    value={formatUptime(systemStatus.uptime)}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃 Agent"
                    value={systemStatus.activeAgents}
                    prefix={<RobotOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="待处理任务"
                    value={systemStatus.pendingTasks}
                    prefix={<SyncOutlined spin />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="已完成任务"
                    value={systemStatus.completedTasks}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card title="任务统计">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="成功率"
                        value={Math.round((systemStatus.completedTasks / (systemStatus.completedTasks + systemStatus.failedTasks)) * 100)}
                        suffix="%"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="失败任务"
                        value={systemStatus.failedTasks}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总任务数"
                        value={systemStatus.completedTasks + systemStatus.failedTasks + systemStatus.pendingTasks}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={12}>
                <Card title="工具分类统计">
                  <Space wrap>
                    {Object.entries(toolCategories).map(([key, config]) => {
                      const count = toolStats.filter(t => t.category === key).length;
                      return (
                        <Tag key={key} color={config.color} style={{ fontSize: 14, padding: '4px 8px' }}>
                          {config.icon} {config.label}: {count}
                        </Tag>
                      );
                    })}
                  </Space>
                </Card>
              </Col>
            </Row>
          </>
        )}

        <Divider />

        {/* 工具使用统计 */}
        <Card title="工具使用统计" style={{ marginBottom: 24 }}>
          <Table
            dataSource={toolStats}
            columns={toolColumns}
            rowKey="name"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 最近任务 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="最近任务">
              <Timeline mode="left">
                {recentTasks.map(task => (
                  <Timeline.Item
                    key={task.id}
                    label={task.startTime}
                    color={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : 'blue'}
                  >
                    <Space direction="vertical" size={0}>
                      <Text strong>{task.name}</Text>
                      <Space>
                        {getTaskStatusTag(task.status)}
                        {task.duration > 0 && <Text type="secondary">耗时: {task.duration}s</Text>}
                      </Space>
                      <Space wrap>
                        {task.toolsUsed.map(tool => (
                          <Tag key={tool}>{tool}</Tag>
                        ))}
                      </Space>
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="系统信息">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row>
                  <Col span={12}><Text type="secondary">系统版本</Text></Col>
                  <Col span={12}><Text>{systemStatus?.version || '1.0.0'}</Text></Col>
                </Row>
                <Row>
                  <Col span={12}><Text type="secondary">Node.js 版本</Text></Col>
                  <Col span={12}><Text>{process.env.NODE_VERSION || 'v20.x'}</Text></Col>
                </Row>
                <Row>
                  <Col span={12}><Text type="secondary">已注册工具</Text></Col>
                  <Col span={12}><Text>{toolStats.length} 个</Text></Col>
                </Row>
                <Row>
                  <Col span={12}><Text type="secondary">活跃工具</Text></Col>
                  <Col span={12}>
                    <Text>{toolStats.filter(t => t.status === 'active').length} 个</Text>
                  </Col>
                </Row>

                <Divider />

                <Title level={5}>已注册工具列表</Title>
                <Space wrap>
                  {toolStats.map(tool => (
                    <Tooltip key={tool.name} title={tool.description}>
                      <Tag color={toolCategories[tool.category]?.color || 'default'}>
                        {tool.name}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
