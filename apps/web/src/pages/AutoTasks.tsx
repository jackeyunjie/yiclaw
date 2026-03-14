/**
 * 全自动任务管理页面
 *
 * 参考 Claude Team 的 Agent 运行模式
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Tag,
  Space,
  Typography,
  Empty,
  message,
  Progress,
  Timeline,
  Collapse,
  Tooltip,
  Badge,
  Divider
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  ToolOutlined,
  FileTextOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { taskAutoApi, type AutoTask, type TaskStatus, type Tool } from '../services/taskAutoApi';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

/**
 * 自动任务页面组件
 */
const AutoTasks: React.FC = () => {
  const [tasks, setTasks] = useState<AutoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AutoTask | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await taskAutoApi.getTasks();
      if (response.success && response.data) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载工具列表
  const loadTools = useCallback(async () => {
    try {
      const response = await taskAutoApi.getTools();
      if (response.success && response.data) {
        setTools(response.data.tools);
      }
    } catch (error) {
      console.error('加载工具列表失败', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadTasks();
    loadTools();

    // 定时刷新
    const interval = setInterval(() => {
      loadTasks();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadTasks, loadTools]);

  // 创建新任务
  const handleCreateTask = async () => {
    if (!taskInput.trim()) {
      message.warning('请输入任务描述');
      return;
    }

    try {
      setCreating(true);
      const response = await taskAutoApi.createTask(taskInput, {
        requireConfirmation: true,
        maxIterations: 50,
        autoRetry: true
      });

      if (response.success && response.data) {
        message.success('任务创建成功');
        setTaskInput('');
        loadTasks();

        // 自动选中新创建的任务
        const newTaskId = response.data.taskId;
        const taskDetail = await taskAutoApi.getTask(newTaskId);
        if (taskDetail.success && taskDetail.data) {
          setSelectedTask(taskDetail.data);
        }
      }
    } catch (error) {
      message.error('创建任务失败');
    } finally {
      setCreating(false);
    }
  };

  // 查看任务详情
  const handleViewTask = async (taskId: string) => {
    try {
      const response = await taskAutoApi.getTask(taskId);
      if (response.success && response.data) {
        setSelectedTask(response.data);
      }
    } catch (error) {
      message.error('加载任务详情失败');
    }
  };

  // 暂停任务
  const handlePauseTask = async (taskId: string) => {
    try {
      await taskAutoApi.pauseTask(taskId);
      message.success('任务已暂停');
      loadTasks();
    } catch (error) {
      message.error('暂停任务失败');
    }
  };

  // 恢复任务
  const handleResumeTask = async (taskId: string) => {
    try {
      await taskAutoApi.resumeTask(taskId);
      message.success('任务已恢复');
      loadTasks();
    } catch (error) {
      message.error('恢复任务失败');
    }
  };

  // 取消任务
  const handleCancelTask = async (taskId: string) => {
    try {
      await taskAutoApi.cancelTask(taskId);
      message.success('任务已取消');
      loadTasks();
    } catch (error) {
      message.error('取消任务失败');
    }
  };

  // 确认任务继续
  const handleConfirmTask = async (taskId: string) => {
    try {
      await taskAutoApi.confirmTask(taskId);
      message.success('已确认，任务继续执行');
      loadTasks();
    } catch (error) {
      message.error('确认失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: TaskStatus) => {
    const statusMap: Record<TaskStatus, { color: string; text: string; icon: React.ReactNode }> = {
      planning: { color: 'processing', text: '规划中', icon: <LoadingOutlined /> },
      running: { color: 'processing', text: '执行中', icon: <LoadingOutlined /> },
      paused: { color: 'warning', text: '已暂停', icon: <PauseCircleOutlined /> },
      completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      failed: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
      waiting_confirmation: { color: 'warning', text: '等待确认', icon: <ClockCircleOutlined /> }
    };

    const { color, text, icon } = statusMap[status];
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  // 获取子任务状态图标
  const getSubtaskIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>
        <ToolOutlined /> 全自动任务
      </Title>
      <Paragraph type="secondary">
        AI 自动规划并执行任务，支持工具调用、状态监控和人工确认
      </Paragraph>

      <Divider />

      {/* 创建任务区域 */}
      <Card title="创建新任务" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="描述您想要 AI 自动完成的任务，例如：
• 帮我分析项目代码，找出所有 TODO 注释并生成报告
• 检查服务器磁盘空间，如果超过 80% 就发送警告邮件
• 读取 data.csv 文件，统计每列数据的平均值"
            rows={4}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleCreateTask}
            loading={creating}
            disabled={!taskInput.trim()}
          >
            开始自动执行
          </Button>
        </Space>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 任务列表 */}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              任务列表
              <Badge count={tasks.filter(t => t.status === 'running').length} style={{ backgroundColor: '#1890ff' }} />
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadTasks} loading={loading}>
              刷新
            </Button>
          }
        >
          <List
            loading={loading}
            dataSource={tasks}
            locale={{ emptyText: <Empty description="暂无任务" /> }}
            renderItem={(task) => (
              <List.Item
                actions={[
                  task.status === 'running' && (
                    <Tooltip title="暂停">
                      <Button
                        icon={<PauseCircleOutlined />}
                        onClick={() => handlePauseTask(task.taskId)}
                      />
                    </Tooltip>
                  ),
                  task.status === 'paused' && (
                    <Tooltip title="恢复">
                      <Button
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleResumeTask(task.taskId)}
                      />
                    </Tooltip>
                  ),
                  task.status === 'waiting_confirmation' && (
                    <Tooltip title="确认继续">
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleConfirmTask(task.taskId)}
                      />
                    </Tooltip>
                  ),
                  <Tooltip title="查看详情">
                    <Button onClick={() => handleViewTask(task.taskId)}>
                      详情
                    </Button>
                  </Tooltip>,
                  (task.status === 'running' || task.status === 'paused' || task.status === 'waiting_confirmation') && (
                    <Tooltip title="取消">
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleCancelTask(task.taskId)}
                      />
                    </Tooltip>
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{task.goal}</Text>
                      {getStatusTag(task.status)}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="secondary" ellipsis>
                        {task.originalRequest}
                      </Text>
                      <Progress
                        percent={Math.round((task.currentStep / task.totalSteps) * 100)}
                        size="small"
                        status={task.status === 'failed' ? 'exception' : 'active'}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(task.createdAt).toLocaleString()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 任务详情 */}
        <Card title="任务详情">
          {selectedTask ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 任务基本信息 */}
              <div>
                <Text strong>任务目标：</Text>
                <Paragraph>{selectedTask.goal}</Paragraph>
              </div>

              <div>
                <Text strong>状态：</Text>
                {getStatusTag(selectedTask.status)}
              </div>

              <div>
                <Text strong>进度：</Text>
                <Progress
                  percent={Math.round((selectedTask.currentStep / selectedTask.totalSteps) * 100)}
                  status={selectedTask.status === 'failed' ? 'exception' : 'active'}
                  format={(percent) => `${selectedTask.currentStep}/${selectedTask.totalSteps} (${percent}%)`}
                />
              </div>

              {/* 执行时间线 */}
              {selectedTask.history.length > 0 && (
                <div>
                  <Text strong>执行记录：</Text>
                  <Timeline style={{ marginTop: '16px' }}>
                    {selectedTask.history.map((step) => (
                      <Timeline.Item
                        key={step.stepId}
                        dot={getSubtaskIcon(step.status)}
                      >
                        <Text>{step.stepId}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(step.startTime).toLocaleTimeString()}
                          {step.endTime && ` - ${new Date(step.endTime).toLocaleTimeString()}`}
                        </Text>
                        {step.aiDecision && (
                          <Collapse ghost>
                            <Panel header="AI 决策" key="1">
                              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                                {step.aiDecision}
                              </pre>
                            </Panel>
                          </Collapse>
                        )}
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              )}

              {/* 子任务列表 */}
              {selectedTask.subtasks.length > 0 && (
                <div>
                  <Text strong>执行步骤：</Text>
                  <List
                    size="small"
                    dataSource={selectedTask.subtasks}
                    renderItem={(subtask) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={getSubtaskIcon(subtask.status)}
                          title={subtask.name}
                          description={
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Text type="secondary">{subtask.description}</Text>
                              {subtask.tool && (
                                <Tag>
                                  <ToolOutlined /> {subtask.tool}
                                </Tag>
                              )}
                              {subtask.error && (
                                <Text type="danger" style={{ fontSize: '12px' }}>
                                  错误: {subtask.error}
                                </Text>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {/* 错误信息 */}
              {selectedTask.error && (
                <div style={{ background: '#fff2f0', padding: '12px', borderRadius: '4px' }}>
                  <Text type="danger" strong>错误：</Text>
                  <Text type="danger">{selectedTask.error}</Text>
                </div>
              )}
            </Space>
          ) : (
            <Empty description="选择任务查看详情" />
          )}
        </Card>
      </div>

      {/* 可用工具说明 */}
      <Card title="可用工具" style={{ marginTop: '24px' }}>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={tools}
          renderItem={(tool) => (
            <List.Item>
              <Card size="small" title={tool.name}>
                <Text type="secondary">{tool.description}</Text>
              </Card>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default AutoTasks;
