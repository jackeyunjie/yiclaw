/**
 * 长期记忆管理页面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Slider,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Progress,
  Timeline,
  Descriptions,
  Badge,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  BulbOutlined,
  FlagOutlined,
  ExperimentOutlined,
  BookOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { memoryApi } from '../services/api';
import dayjs from 'dayjs';
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

// 记忆类型配置
const memoryTypeConfig = {
  strategic: { label: '战略目标', color: 'red', icon: <FlagOutlined /> },
  first_principle: { label: '第一性原理', color: 'blue', icon: <BulbOutlined /> },
  fundamental: { label: '底层逻辑', color: 'purple', icon: <BookOutlined /> },
  experience: { label: '经验教训', color: 'orange', icon: <ExperimentOutlined /> },
  preference: { label: '用户偏好', color: 'green', icon: <CheckCircleOutlined /> },
  knowledge: { label: '知识积累', color: 'cyan', icon: <BookOutlined /> }
};

// 记忆状态配置
const memoryStatusConfig = {
  active: { label: '坚持', color: 'success' },
  deprecated: { label: '已放弃', color: 'error' },
  pending: { label: '新尝试', color: 'warning' },
  archived: { label: '已归档', color: 'default' }
};

interface Memory {
  memoryId: string;
  type: keyof typeof memoryTypeConfig;
  title: string;
  content: string;
  status: keyof typeof memoryStatusConfig;
  priority: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  category: string;
  accessCount: number;
  successCount: number;
  failureCount: number;
  // 类型特定字段
  goalLevel?: string;
  progress?: number;
  stickiness?: number;
  reviewHistory?: any[];
}

interface MemoryStats {
  totalMemories: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  mostAccessed: Memory[];
  recentlyCreated: Memory[];
  needsReview: Memory[];
}

const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState('');

  // 加载记忆列表
  const loadMemories = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await memoryApi.getMemories(params);
      setMemories(response.data?.items || []);
    } catch (error) {
      message.error('加载记忆失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const response = await memoryApi.getMemoryStats();
      setStats(response.data);
    } catch (error) {
      console.error('加载统计失败', error);
    }
  };

  useEffect(() => {
    loadMemories();
    loadStats();
  }, [activeTab, searchQuery]);

  // 创建记忆
  const handleCreate = async (values: any) => {
    try {
      const params: any = {
        type: values.type,
        title: values.title,
        content: values.content,
        priority: values.priority,
        confidence: values.confidence,
        tags: values.tags?.split(',').map((t: string) => t.trim()) || [],
        category: values.category
      };

      if (values.type === 'strategic') {
        await memoryApi.createStrategicMemory({
          ...params,
          objective: values.content,
          keyResults: values.keyResults?.split('\n').map((kr: string) => ({
            description: kr,
            target: 100,
            unit: '%',
            deadline: dayjs().add(3, 'month').toISOString()
          })) || [],
          milestones: [],
          startDate: dayjs().toISOString(),
          targetDate: dayjs().add(6, 'month').toISOString(),
          rationale: values.rationale,
          stickiness: values.stickiness
        });
      } else if (values.type === 'first_principle') {
        await memoryApi.createFirstPrincipleMemory({
          ...params,
          problemStatement: values.content,
          problemDomain: values.category
        });
      } else if (values.type === 'fundamental') {
        await memoryApi.createFundamentalMemory({
          ...params,
          pattern: values.content,
          patternType: 'causal',
          causeEffectChain: [],
          conditions: []
        });
      } else {
        await memoryApi.createMemory(params);
      }

      message.success('记忆创建成功');
      setModalVisible(false);
      form.resetFields();
      loadMemories();
      loadStats();
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 查看详情
  const handleView = async (memory: Memory) => {
    try {
      const response = await memoryApi.getMemory(memory.memoryId);
      if (response.data) {
        setSelectedMemory(response.data);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('加载详情失败');
    }
  };

  // 执行复盘
  const handleReview = async (values: any) => {
    if (!selectedMemory) return;

    try {
      await memoryApi.conductReview(selectedMemory.memoryId, {
        reviewType: values.reviewType,
        originalPlan: values.originalPlan,
        actualOutcome: values.actualOutcome,
        successes: values.successes?.split('\n').filter(Boolean) || [],
        failures: values.failures?.split('\n').filter(Boolean) || []
      });

      message.success('复盘完成');
      setReviewModalVisible(false);
      reviewForm.resetFields();
      loadMemories();
    } catch (error) {
      message.error('复盘失败');
    }
  };

  // 更新状态
  const handleStatusChange = async (memory: Memory, newStatus: string, reason: string) => {
    try {
      await memoryApi.updateMemoryStatus(memory.memoryId, newStatus, reason);
      message.success('状态更新成功');
      loadMemories();
      loadStats();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 战略决策
  const handleDecision = async (memory: Memory) => {
    try {
      const response = await memoryApi.makeStrategicDecision(memory.memoryId);
      const decision = response.data;

      Modal.info({
        title: '战略决策分析',
        content: (
          <div>
            <p><strong>决策建议：</strong>{decision.decision === 'continue' ? '继续' : decision.decision === 'stop' ? '停止' : decision.decision === 'pivot' ? '转向' : decision.decision === 'accelerate' ? '加速' : '减速'}</p>
            <p><strong>理由：</strong>{decision.rationale}</p>
            <p><strong>置信度：</strong>{decision.confidence}%</p>
            {decision.newApproach && (
              <p><strong>新方向：</strong>{decision.newApproach}</p>
            )}
          </div>
        ),
        onOk() {
          loadMemories();
        }
      });
    } catch (error) {
      message.error('决策分析失败');
    }
  };

  // 删除记忆
  const handleDelete = async (memory: Memory) => {
    try {
      await memoryApi.deleteMemory(memory.memoryId);
      message.success('删除成功');
      loadMemories();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 表格列
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: keyof typeof memoryTypeConfig) => (
        <Tag color={memoryTypeConfig[type]?.color} icon={memoryTypeConfig[type]?.icon}>
          {memoryTypeConfig[type]?.label}
        </Tag>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: keyof typeof memoryStatusConfig) => (
        <Badge
          status={memoryStatusConfig[status]?.color as any}
          text={memoryStatusConfig[status]?.label}
        />
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      render: (priority: number) => (
        <Progress
          percent={priority}
          size="small"
          strokeColor={priority >= 75 ? '#f5222d' : priority >= 50 ? '#faad14' : '#52c41a'}
          showInfo={false}
        />
      )
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      width: 100,
      render: (confidence: number) => (
        <Progress
          percent={confidence}
          size="small"
          strokeColor="#1890ff"
          showInfo={false}
        />
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space size={4} wrap>
          {tags.slice(0, 3).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </Space>
      )
    },
    {
      title: '更新于',
      dataIndex: 'updatedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: Memory) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="复盘">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => {
                setSelectedMemory(record);
                setReviewModalVisible(true);
              }}
            />
          </Tooltip>
          {record.type === 'strategic' && (
            <Tooltip title="决策分析">
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={() => handleDecision(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部记忆" key="all" />
          <TabPane tab={<span><FlagOutlined /> 战略目标</span>} key="strategic" />
          <TabPane tab={<span><BulbOutlined /> 第一性原理</span>} key="first_principle" />
          <TabPane tab={<span><BookOutlined /> 底层逻辑</span>} key="fundamental" />
          <TabPane tab={<span><ExperimentOutlined /> 经验教训</span>} key="experience" />
        </Tabs>

        {/* 统计卡片 */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Card size="small">
                <Statistic title="总记忆数" value={stats.totalMemories} />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="战略目标"
                  value={stats.byType?.strategic || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="坚持中"
                  value={stats.byStatus?.active || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="待复盘"
                  value={stats.needsReview?.length || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Space style={{ float: 'right' }}>
                <Input.Search
                  placeholder="搜索记忆..."
                  allowClear
                  onSearch={setSearchQuery}
                  style={{ width: 200 }}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(true)}
                >
                  新建记忆
                </Button>
              </Space>
            </Col>
          </Row>
        )}

        {/* 记忆表格 */}
        <Table
          columns={columns}
          dataSource={memories}
          rowKey="memoryId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建记忆模态框 */}
      <Modal
        title="创建新记忆"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="type"
            label="记忆类型"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择记忆类型">
              <Option value="strategic">战略目标</Option>
              <Option value="first_principle">第一性原理</Option>
              <Option value="fundamental">底层逻辑</Option>
              <Option value="experience">经验教训</Option>
              <Option value="knowledge">知识积累</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true }]}
          >
            <Input placeholder="输入记忆标题" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} placeholder="输入记忆内容" />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
          >
            <Input placeholder="输入分类（可选）" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="输入标签，用逗号分隔" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                initialValue={50}
              >
                <Slider min={0} max={100} marks={{ 0: '低', 50: '中', 100: '高' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confidence"
                label="置信度"
                initialValue={50}
              >
                <Slider min={0} max={100} marks={{ 0: '低', 50: '中', 100: '高' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 战略目标特有字段 */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) => {
              if (getFieldValue('type') === 'strategic') {
                return (
                  <>
                    <Form.Item name="rationale" label="战略理由">
                      <TextArea rows={2} placeholder="为什么这个目标重要？" />
                    </Form.Item>
                    <Form.Item name="stickiness" label="坚持程度" initialValue={80}>
                      <Slider min={0} max={100} marks={{ 0: '灵活', 50: '适中', 100: '坚定' }} />
                    </Form.Item>
                    <Form.Item name="keyResults" label="关键结果">
                      <TextArea rows={3} placeholder="每行一个关键结果" />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title="记忆详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedMemory && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="基本信息" key="info">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="类型">
                  {memoryTypeConfig[selectedMemory.type]?.label}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {memoryStatusConfig[selectedMemory.status]?.label}
                </Descriptions.Item>
                <Descriptions.Item label="优先级">{selectedMemory.priority}%</Descriptions.Item>
                <Descriptions.Item label="置信度">{selectedMemory.confidence}%</Descriptions.Item>
                <Descriptions.Item label="访问次数">{selectedMemory.accessCount}</Descriptions.Item>
                <Descriptions.Item label="成功率">
                  {selectedMemory.successCount + selectedMemory.failureCount > 0
                    ? Math.round((selectedMemory.successCount / (selectedMemory.successCount + selectedMemory.failureCount)) * 100)
                    : 0}%
                </Descriptions.Item>
                <Descriptions.Item label="标签" span={2}>
                  {selectedMemory.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(selectedMemory.createdAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {dayjs(selectedMemory.updatedAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16 }}>
                <h4>内容</h4>
                <p>{selectedMemory.content}</p>
              </div>

              {/* 战略目标特有信息 */}
              {selectedMemory.type === 'strategic' && selectedMemory.progress !== undefined && (
                <div style={{ marginTop: 16 }}>
                  <h4>进度</h4>
                  <Progress percent={selectedMemory.progress} status="active" />
                  {selectedMemory.stickiness !== undefined && (
                    <p>坚持程度: {selectedMemory.stickiness}%</p>
                  )}
                </div>
              )}

              {/* 状态操作 */}
              <div style={{ marginTop: 24 }}>
                <h4>状态管理</h4>
                <Space>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleStatusChange(selectedMemory, 'active', '决定坚持这个方向')}
                  >
                    坚持
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => handleStatusChange(selectedMemory, 'deprecated', '决定放弃这个方向')}
                  >
                    放弃
                  </Button>
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={() => handleStatusChange(selectedMemory, 'pending', '作为新尝试')}
                  >
                    新尝试
                  </Button>
                </Space>
              </div>
            </TabPane>

            {/* 复盘历史 */}
            {selectedMemory.reviewHistory && selectedMemory.reviewHistory.length > 0 && (
              <TabPane tab={`复盘历史 (${selectedMemory.reviewHistory.length})`} key="reviews">
                <Timeline>
                  {selectedMemory.reviewHistory.map((review: any, index: number) => (
                    <Timeline.Item key={index}>
                      <p><strong>{dayjs(review.timestamp).format('YYYY-MM-DD')}</strong> - {review.reviewType}</p>
                      <p>差异: {review.variance}</p>
                      <p>洞察: {review.keyInsights?.join(', ')}</p>
                      {review.decisions && (
                        <div>
                          <p>决策:</p>
                          <ul>
                            {review.decisions.map((d: any, i: number) => (
                              <li key={i}>{d.item}: {d.decision} ({d.rationale})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
            )}
          </Tabs>
        )}
      </Modal>

      {/* 复盘模态框 */}
      <Modal
        title="执行复盘"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        onOk={() => reviewForm.submit()}
        width={700}
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item
            name="reviewType"
            label="复盘类型"
            rules={[{ required: true }]}
            initialValue="weekly"
          >
            <Select>
              <Option value="weekly">周复盘</Option>
              <Option value="monthly">月复盘</Option>
              <Option value="quarterly">季度复盘</Option>
              <Option value="milestone">里程碑复盘</Option>
              <Option value="ad_hoc">临时复盘</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="originalPlan"
            label="原计划"
            rules={[{ required: true }]}
          >
            <TextArea rows={2} placeholder="最初计划是什么？" />
          </Form.Item>

          <Form.Item
            name="actualOutcome"
            label="实际结果"
            rules={[{ required: true }]}
          >
            <TextArea rows={2} placeholder="实际结果如何？" />
          </Form.Item>

          <Form.Item
            name="successes"
            label="成功之处"
          >
            <TextArea rows={3} placeholder="每行一个成功点" />
          </Form.Item>

          <Form.Item
            name="failures"
            label="失败之处"
          >
            <TextArea rows={3} placeholder="每行一个失败点" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemoryPage;
