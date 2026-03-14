/**
 * ReAct Agent 页面
 *
 * ReAct = Reasoning (推理) + Acting (行动)
 *
 * 可视化展示 AI 的思考和行动过程
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Timeline,
  Tag,
  Spin,
  message,
  Collapse,
  Divider,
  Badge,
  Alert,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ToolOutlined,
  EyeOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

/**
 * ReAct 步骤类型
 */
type StepType = 'thought' | 'action' | 'observation' | 'final_answer';

/**
 * ReAct 步骤
 */
interface ReActStep {
  type: StepType;
  content: string;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * ReAct 结果
 */
interface ReActResult {
  success: boolean;
  finalAnswer: string;
  steps: ReActStep[];
  totalTokens: number;
  executionTime: number;
}

/**
 * ReAct 页面组件
 */
const ReAct: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReActResult | null>(null);
  const [streamingSteps, setStreamingSteps] = useState<ReActStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingSteps, result]);

  /**
   * 执行 ReAct
   */
  const handleExecute = async () => {
    if (!query.trim()) {
      message.warning('请输入查询内容');
      return;
    }

    setLoading(true);
    setResult(null);
    setStreamingSteps([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/v1/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          config: {
            maxIterations: 10,
            temperature: 0.7,
            requireConfirmation: false
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        message.success('执行完成');
      } else {
        message.error(data.error?.message || '执行失败');
      }
    } catch (error) {
      message.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 清空结果
   */
  const handleClear = () => {
    setQuery('');
    setResult(null);
    setStreamingSteps([]);
  };

  /**
   * 获取步骤图标
   */
  const getStepIcon = (type: StepType) => {
    switch (type) {
      case 'thought':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      case 'action':
        return <ToolOutlined style={{ color: '#faad14' }} />;
      case 'observation':
        return <EyeOutlined style={{ color: '#52c41a' }} />;
      case 'final_answer':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      default:
        return <LoadingOutlined />;
    }
  };

  /**
   * 获取步骤标签
   */
  const getStepTag = (type: StepType) => {
    const colors: Record<StepType, string> = {
      thought: 'blue',
      action: 'orange',
      observation: 'green',
      final_answer: 'success'
    };

    const labels: Record<StepType, string> = {
      thought: '思考',
      action: '行动',
      observation: '观察',
      final_answer: '最终答案'
    };

    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <PlayCircleOutlined /> ReAct Agent
      </Title>
      <Paragraph type="secondary">
        ReAct = Reasoning (推理) + Acting (行动)。观察 AI 如何思考、使用工具、观察结果，最终解决问题。
      </Paragraph>

      <Divider />

      {/* 输入区域 */}
      <Card title="输入任务" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入你想让 AI 解决的问题，例如：
• 查找项目根目录下所有包含 TODO 的文件
• 分析 package.json 中的依赖版本
• 检查当前目录的磁盘使用情况"
            rows={4}
          />
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleExecute}
              loading={loading}
              disabled={!query.trim()}
            >
              开始执行
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={loading}
            >
              清空
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 执行结果 */}
      {(loading || result) && (
        <Card
          title={
            <Space>
              <FileTextOutlined />
              执行过程
              {loading && <Spin size="small" />}
              {result && (
                <Badge
                  status={result.success ? 'success' : 'error'}
                  text={result.success ? '完成' : '失败'}
                />
              )}
            </Space>
          }
        >
          {/* 统计信息 */}
          {result && (
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={8}>
                <Statistic
                  title="执行步骤"
                  value={result.steps.length}
                  prefix={<PlayCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Token 消耗"
                  value={result.totalTokens}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="执行时间"
                  value={`${(result.executionTime / 1000).toFixed(2)}s`}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          )}

          {/* 执行时间线 */}
          <Timeline>
            {(result?.steps || streamingSteps).map((step, index) => (
              <Timeline.Item
                key={index}
                dot={getStepIcon(step.type)}
              >
                <Card
                  size="small"
                  title={
                    <Space>
                      {getStepTag(step.type)}
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </Text>
                    </Space>
                  }
                  style={{
                    background: step.type === 'thought' ? '#e6f7ff' :
                               step.type === 'action' ? '#fff7e6' :
                               step.type === 'observation' ? '#f6ffed' :
                               '#f6ffed',
                    border: 'none'
                  }}
                >
                  {/* 思考内容 */}
                  {step.type === 'thought' && (
                    <Paragraph style={{ margin: 0 }}>
                      {step.content}
                    </Paragraph>
                  )}

                  {/* 行动内容 */}
                  {step.type === 'action' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>工具: {step.toolName}</Text>
                      {step.toolParameters && (
                        <Collapse ghost>
                          <Panel header="参数" key="1">
                            <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                              {JSON.stringify(step.toolParameters, null, 2)}
                            </pre>
                          </Panel>
                        </Collapse>
                      )}
                    </Space>
                  )}

                  {/* 观察内容 */}
                  {step.type === 'observation' && (
                    <Paragraph style={{ margin: 0 }}>
                      {step.content}
                    </Paragraph>
                  )}

                  {/* 最终答案 */}
                  {step.type === 'final_answer' && (
                    <Alert
                      message="最终答案"
                      description={
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {step.content}
                        </div>
                      }
                      type="success"
                      showIcon
                    />
                  )}
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>

          {/* 最终答案（独立显示） */}
          {result?.finalAnswer && (
            <Card
              title="最终答案"
              style={{ marginTop: '24px', background: '#f6ffed' }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {result.finalAnswer}
              </div>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </Card>
      )}

      {/* 使用说明 */}
      <Card title="ReAct 模式说明" style={{ marginTop: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            <strong>ReAct</strong> 是一种结合推理（Reasoning）和行动（Acting）的 AI 模式：
          </Paragraph>
          <Timeline>
            <Timeline.Item dot={<MessageOutlined style={{ color: '#1890ff' }} />}>
              <Text strong>Thought（思考）</Text>
              <Paragraph type="secondary">
                AI 分析问题，思考解决方案，决定下一步行动
              </Paragraph>
            </Timeline.Item>
            <Timeline.Item dot={<ToolOutlined style={{ color: '#faad14' }} />}>
              <Text strong>Action（行动）</Text>
              <Paragraph type="secondary">
                AI 调用工具（如读取文件、执行命令）获取信息
              </Paragraph>
            </Timeline.Item>
            <Timeline.Item dot={<EyeOutlined style={{ color: '#52c41a' }} />}>
              <Text strong>Observation（观察）</Text>
              <Paragraph type="secondary">
                AI 观察工具返回的结果，评估是否满足需求
              </Paragraph>
            </Timeline.Item>
            <Timeline.Item dot={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>
              <Text strong>Final Answer（最终答案）</Text>
              <Paragraph type="secondary">
                当收集到足够信息，AI 给出最终答案
              </Paragraph>
            </Timeline.Item>
          </Timeline>
        </Space>
      </Card>
    </div>
  );
};

export default ReAct;
