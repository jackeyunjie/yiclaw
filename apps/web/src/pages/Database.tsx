/**
 * 数据库工具页面
 *
 * SQL 查询、数据导出、报表生成
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Table,
  Tabs,
  Space,
  message,
  Typography,
  Alert,
  Tag,
  Spin,
  Statistic,
  Row,
  Col,
  DatePicker,
  Select,
  Form,
  Badge,
  Divider,
  List,
  Drawer,
  Descriptions,
  Popconfirm,
  Tooltip,
  Modal,
  Empty
} from 'antd';
import {
  DatabaseOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  BarChartOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  ToolOutlined,
  HistoryOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { databaseApi } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * DbSkill 类型
 */
interface DbSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  skillDoc: string;
  workflows?: any;
  sqlTemplate: string;
  parameters?: Record<string, any>;
  tags?: string[];
  useCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 查询历史类型
 */
interface QueryHistory {
  id: string;
  sql: string;
  resultSummary?: string;
  rowCount: number;
  executionTime: number;
  isFavorite: boolean;
  note?: string;
  skillId?: string;
  skill?: { name: string; category: string };
  createdAt: string;
}

/**
 * 表结构信息
 */
interface TableSchema {
  table_name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
}

/**
 * 查询结果
 */
interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  sql: string;
  executionTime?: number;
}

/**
 * 数据库健康状态
 */
interface DbHealth {
  status: string;
  connectionStatus: string;
  databaseSize: string;
  activeConnections: number;
  responseTime: number;
  topTables: Array<{
    tablename: string;
    live_tuples: number;
  }>;
}

const Database: React.FC = () => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [health, setHealth] = useState<DbHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [reportForm] = Form.useForm();

  // Skills 状态
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<DbSkill | null>(null);
  const [skillDrawerVisible, setSkillDrawerVisible] = useState(false);
  const [skillParams, setSkillParams] = useState<Record<string, any>>({});
  const [skillFormVisible, setSkillFormVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<DbSkill | null>(null);
  const [skillForm] = Form.useForm();

  // 查询历史状态
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 加载表列表和健康状态
  useEffect(() => {
    loadTables();
    loadHealth();
    loadSkills();
    loadHistory();
  }, []);

  // 当切换到历史标签时重新加载
  useEffect(() => {
    loadHistory();
  }, [showFavoritesOnly]);

  // 加载表列表
  const loadTables = async () => {
    try {
      const response = await databaseApi.getSchema();
      if (response.success && response.data?.tables) {
        setTables(response.data.tables.map((t: any) => t.table_name));
      }
    } catch (error) {
      message.error('加载表列表失败');
    }
  };

  // 加载表结构
  const loadTableSchema = async (tableName: string) => {
    if (!tableName) return;
    try {
      setSchemaLoading(true);
      const response = await databaseApi.getSchema(tableName);
      if (response.success) {
        setTableSchema(response.data);
      }
    } catch (error) {
      message.error('加载表结构失败');
    } finally {
      setSchemaLoading(false);
    }
  };

  // 加载健康状态
  const loadHealth = async () => {
    try {
      setHealthLoading(true);
      const response = await databaseApi.getHealth();
      if (response.success) {
        setHealth(response.data);
      }
    } catch (error) {
      message.error('加载健康状态失败');
    } finally {
      setHealthLoading(false);
    }
  };

  // 加载 Skills
  const loadSkills = async () => {
    try {
      setSkillsLoading(true);
      const response = await databaseApi.getSkills();
      if (response.success && response.data) {
        setSkills(response.data);
      }
    } catch (error) {
      message.error('加载 Skills 失败');
    } finally {
      setSkillsLoading(false);
    }
  };

  // 加载查询历史
  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await databaseApi.getHistory({
        favorite: showFavoritesOnly,
        limit: 100
      });
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (error) {
      message.error('加载查询历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 从 Skill 加载 SQL
  const loadSkillSQL = (skill: DbSkill) => {
    setSqlQuery(skill.sqlTemplate);
    setSkillParams(skill.parameters || {});
    setSelectedSkill(skill);
    message.success(`已加载 Skill「${skill.name}」的 SQL 模板`);
  };

  // 从历史加载 SQL
  const loadHistorySQL = (record: QueryHistory) => {
    setSqlQuery(record.sql);
    message.success('已加载历史查询');
  };

  // 收藏/取消收藏
  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const response = await databaseApi.favoriteHistory(id, isFavorite);
      if (response.success) {
        loadHistory();
        message.success(isFavorite ? '已收藏' : '已取消收藏');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 删除历史记录
  const deleteHistory = async (id: string) => {
    try {
      const response = await databaseApi.deleteHistory(id);
      if (response.success) {
        loadHistory();
        message.success('已删除');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 执行 Skill
  const executeSkill = async (skill: DbSkill) => {
    try {
      setQueryLoading(true);
      const response = await databaseApi.executeSkill(skill.id, skillParams);
      if (response.success) {
        setQueryResult(response.data);
        message.success(`Skill「${skill.name}」执行成功`);
      } else {
        message.error(response.error?.message || '执行失败');
      }
    } catch (error) {
      message.error('执行 Skill 失败');
    } finally {
      setQueryLoading(false);
    }
  };

  // 执行 SQL 查询
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      message.warning('请输入 SQL 查询语句');
      return;
    }

    try {
      setQueryLoading(true);
      const response = await databaseApi.executeQuery(sqlQuery);
      if (response.success) {
        setQueryResult(response.data);
        message.success(`查询成功，返回 ${response.data.rowCount} 条记录`);
      } else {
        message.error(response.error?.message || '查询失败');
      }
    } catch (error) {
      message.error('执行查询失败');
    } finally {
      setQueryLoading(false);
    }
  };

  // 导出数据
  const handleExport = async (format: 'csv' | 'json') => {
    if (!queryResult || !sqlQuery) {
      message.warning('请先执行查询');
      return;
    }

    try {
      const response = await databaseApi.exportData(sqlQuery, format);
      if (response.success) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('导出成功');
      } else {
        message.error(response.error?.message || '导出失败');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 生成报表
  const handleGenerateReport = async (values: any) => {
    try {
      const [startDate, endDate] = values.dateRange || [null, null];
      const response = await databaseApi.generateReport({
        tableName: values.tableName,
        dateColumn: values.dateColumn,
        startDate: startDate?.format('YYYY-MM-DD'),
        endDate: endDate?.format('YYYY-MM-DD'),
        groupBy: values.groupBy,
        metrics: values.metrics
      });

      if (response.success) {
        setQueryResult({
          columns: response.data.rows.length > 0 ? Object.keys(response.data.rows[0]) : [],
          rows: response.data.rows,
          rowCount: response.data.rows.length,
          sql: response.data.sql
        });
        message.success('报表生成成功');
      } else {
        message.error(response.error?.message || '生成报表失败');
      }
    } catch (error) {
      message.error('生成报表失败');
    }
  };

  // 生成表格列配置
  const generateColumns = (columns: string[]): ColumnsType<any> => {
    return columns.map(col => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      render: (value: any) => {
        if (value === null || value === undefined) return <Text type="secondary">NULL</Text>;
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
    }));
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DatabaseOutlined /> 数据库工具
      </Title>
      <Paragraph>
        执行 SQL 查询、导出数据、生成报表。仅支持 SELECT 查询，确保数据安全。
      </Paragraph>

      <Tabs defaultActiveKey="query">
        <TabPane
          tab={<span><PlayCircleOutlined /> SQL 查询</span>}
          key="query"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Card
                title="SQL 编辑器"
                extra={
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleExecuteQuery}
                      loading={queryLoading}
                    >
                      执行查询
                    </Button>
                    {queryResult && (
                      <>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => handleExport('csv')}
                        >
                          导出 CSV
                        </Button>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => handleExport('json')}
                        >
                          导出 JSON
                        </Button>
                      </>
                    )}
                  </Space>
                }
              >
                <Alert
                  message="安全提示"
                  description="仅支持 SELECT 查询，禁止 INSERT/UPDATE/DELETE/DROP 等操作"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <TextArea
                  rows={8}
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  placeholder={'输入 SQL 查询语句，例如: SELECT * FROM "User" LIMIT 10'}
                  style={{ fontFamily: 'monospace', fontSize: 14 }}
                />

                {queryResult && (
                  <div style={{ marginTop: 24 }}>
                    <Space style={{ marginBottom: 16 }}>
                      <Text strong>查询结果</Text>
                      <Tag color="blue">{queryResult.rowCount} 条记录</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        执行时间: {queryResult.executionTime}ms
                      </Text>
                    </Space>

                    <Table
                      dataSource={queryResult.rows}
                      columns={generateColumns(queryResult.columns)}
                      scroll={{ x: 'max-content', y: 400 }}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: total => `共 ${total} 条`
                      }}
                      size="small"
                    />
                  </div>
                )}
              </Card>
            </Col>

            <Col span={8}>
              <Card title="表结构" loading={schemaLoading}>
                <Select
                  placeholder="选择表"
                  style={{ width: '100%', marginBottom: 16 }}
                  value={selectedTable || undefined}
                  onChange={(value) => {
                    setSelectedTable(value);
                    loadTableSchema(value);
                  }}
                >
                  {tables.map(table => (
                    <Option key={table} value={table}>{table}</Option>
                  ))}
                </Select>

                {tableSchema && (
                  <Table
                    dataSource={tableSchema.columns}
                    columns={[
                      { title: '字段名', dataIndex: 'column_name', key: 'name' },
                      { title: '类型', dataIndex: 'data_type', key: 'type', width: 120 },
                      {
                        title: '可空',
                        dataIndex: 'is_nullable',
                        key: 'nullable',
                        width: 80,
                        render: (v) => v === 'YES' ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>
                      }
                    ]}
                    size="small"
                    pagination={false}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={<span><BarChartOutlined /> 报表生成</span>}
          key="report"
        >
          <Card title="数据报表">
            <Form
              form={reportForm}
              layout="vertical"
              onFinish={handleGenerateReport}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="tableName"
                    label="数据表"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="选择表">
                      {tables.map(table => (
                        <Option key={table} value={table}>{table}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="dateColumn"
                    label="日期字段"
                  >
                    <Input placeholder="例如: createdAt" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="dateRange"
                    label="日期范围"
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="groupBy"
                    label="分组字段"
                  >
                    <Input placeholder="例如: status" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="metrics"
                    label="统计指标"
                    initialValue={['count']}
                  >
                    <Select mode="multiple" placeholder="选择指标">
                      <Option value="count">计数</Option>
                      <Option value="sum">求和</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<BarChartOutlined />}>
                  生成报表
                </Button>
              </Form.Item>
            </Form>

            {queryResult && queryResult.rows.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Table
                  dataSource={queryResult.rows}
                  columns={generateColumns(queryResult.columns)}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          tab={<span><HeartOutlined /> 健康状态</span>}
          key="health"
        >
          <Spin spinning={healthLoading}>
            {health && (
              <>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="连接状态"
                        value={health.connectionStatus === 'connected' ? '正常' : '异常'}
                        valueStyle={{ color: health.connectionStatus === 'connected' ? '#3f8600' : '#cf1322' }}
                        prefix={<Badge status={health.connectionStatus === 'connected' ? 'success' : 'error'} />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="数据库大小"
                        value={health.databaseSize}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="活跃连接"
                        value={health.activeConnections}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="响应时间"
                        value={health.responseTime}
                        suffix="ms"
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="表统计信息">
                  <Table
                    dataSource={health.topTables}
                    columns={[
                      { title: '表名', dataIndex: 'tablename', key: 'name' },
                      { title: '活跃记录数', dataIndex: 'live_tuples', key: 'count', render: v => v?.toLocaleString() }
                    ]}
                    pagination={false}
                  />
                </Card>
              </>
            )}
          </Spin>
        </TabPane>

        <TabPane
          tab={<span><ToolOutlined /> Skills</span>}
          key="skills"
        >
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title="数据库 Skills"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="small"
                    onClick={() => {
                      setEditingSkill(null);
                      skillForm.resetFields();
                      setSkillFormVisible(true);
                    }}
                  >
                    新建
                  </Button>
                }
                loading={skillsLoading}
              >
                <List
                  dataSource={skills}
                  renderItem={(skill) => (
                    <List.Item
                      actions={[
                        <Tooltip title="查看详情">
                          <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setSelectedSkill(skill);
                              setSkillDrawerVisible(true);
                            }}
                          />
                        </Tooltip>,
                        <Tooltip title="加载 SQL">
                          <Button
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={() => loadSkillSQL(skill)}
                          />
                        </Tooltip>,
                        !skill.isSystem && (
                          <Tooltip title="编辑">
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingSkill(skill);
                                skillForm.setFieldsValue(skill);
                                setSkillFormVisible(true);
                              }}
                            />
                          </Tooltip>
                        ),
                        !skill.isSystem && (
                          <Popconfirm
                            title="确认删除？"
                            onConfirm={async () => {
                              await databaseApi.deleteSkill(skill.id);
                              loadSkills();
                              message.success('已删除');
                            }}
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      ].filter(Boolean)}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            {skill.name}
                            {skill.isSystem && <Tag color="blue">系统</Tag>}
                            <Tag color="default">{skill.category}</Tag>
                          </Space>
                        }
                        description={skill.description}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={16}>
              {selectedSkill ? (
                <Card title={`执行: ${selectedSkill.name}`}>
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="分类">{selectedSkill.category}</Descriptions.Item>
                    <Descriptions.Item label="使用次数">{selectedSkill.useCount}</Descriptions.Item>
                  </Descriptions>
                  <Divider />
                  <Paragraph>
                    <Text strong>参数设置:</Text>
                  </Paragraph>
                  {selectedSkill.parameters && Object.entries(selectedSkill.parameters).map(([key, value]) => (
                    <Form.Item key={key} label={key} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                      <Input
                        value={skillParams[key] ?? value}
                        onChange={(e) => setSkillParams({ ...skillParams, [key]: e.target.value })}
                        placeholder={`默认值: ${value}`}
                      />
                    </Form.Item>
                  ))}
                  <Space>
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => executeSkill(selectedSkill)}>
                      执行 Skill
                    </Button>
                    <Button onClick={() => setSelectedSkill(null)}>取消</Button>
                  </Space>
                </Card>
              ) : (
                <Empty description="选择一个 Skill 查看详情" />
              )}
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={<span><HistoryOutlined /> 查询历史</span>}
          key="history"
        >
          <Card
            title={
              <Space>
                <span>查询历史</span>
                <Button
                  type={showFavoritesOnly ? 'primary' : 'default'}
                  size="small"
                  icon={<StarOutlined />}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  {showFavoritesOnly ? '显示全部' : '仅收藏'}
                </Button>
              </Space>
            }
            loading={historyLoading}
          >
            <Table
              dataSource={history}
              columns={[
                {
                  title: '',
                  key: 'favorite',
                  width: 50,
                  render: (_, record) => (
                    <Button
                      type="text"
                      icon={record.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={() => toggleFavorite(record.id, !record.isFavorite)}
                    />
                  ),
                },
                {
                  title: 'SQL',
                  key: 'sql',
                  render: (_, record) => (
                    <Text code style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {record.sql.substring(0, 100)}...
                    </Text>
                  ),
                },
                {
                  title: '来源',
                  key: 'source',
                  width: 120,
                  render: (_, record) => record.skill ? (
                    <Tag color="blue">{record.skill.name}</Tag>
                  ) : <Tag>手动</Tag>,
                },
                {
                  title: '结果',
                  key: 'result',
                  width: 150,
                  render: (_, record) => (
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">{record.rowCount} 行</Text>
                      <Text type="secondary">{record.executionTime}ms</Text>
                    </Space>
                  ),
                },
                {
                  title: '时间',
                  key: 'time',
                  width: 180,
                  render: (_, record) => (
                    <Text type="secondary">
                      <ClockCircleOutlined /> {new Date(record.createdAt).toLocaleString()}
                    </Text>
                  ),
                },
                {
                  title: '操作',
                  key: 'actions',
                  width: 150,
                  render: (_, record) => (
                    <Space>
                      <Tooltip title="加载 SQL">
                        <Button
                          type="text"
                          icon={<ReloadOutlined />}
                          onClick={() => loadHistorySQL(record)}
                        />
                      </Tooltip>
                      <Tooltip title="备注">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => {
                            Modal.confirm({
                              title: '添加备注',
                              content: (
                                <Input.TextArea
                                  defaultValue={record.note || ''}
                                  placeholder="添加备注..."
                                  rows={3}
                                  id="history-note-input"
                                />
                              ),
                              onOk: async () => {
                                const note = (document.getElementById('history-note-input') as HTMLTextAreaElement)?.value;
                                await databaseApi.noteHistory(record.id, note);
                                loadHistory();
                              },
                            });
                          }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="确认删除？"
                        onConfirm={() => deleteHistory(record.id)}
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={<span><InfoCircleOutlined /> 使用说明</span>}
          key="help"
        >
          <Card title="数据库工具使用指南">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}><PlayCircleOutlined /> SQL 查询</Title>
                <Paragraph>
                  1. 在 SQL 编辑器中输入 SELECT 查询语句<br />
                  2. 点击「执行查询」按钮<br />
                  3. 查看结果并支持导出 CSV/JSON<br />
                  4. 查询结果限制最多 1000 条
                </Paragraph>
                <Alert
                  message="示例查询"
                  description={`
SELECT * FROM "User" LIMIT 10;
SELECT COUNT(*) FROM "Session" WHERE "createdAt" >= '2024-01-01';
SELECT "model", COUNT(*) FROM "Message" GROUP BY "model";
                  `.trim()}
                  type="info"
                />
              </div>

              <Divider />

              <div>
                <Title level={4}><BarChartOutlined /> 报表生成</Title>
                <Paragraph>
                  1. 选择要分析的数据表<br />
                  2. 指定日期字段和范围（可选）<br />
                  3. 选择分组字段和统计指标<br />
                  4. 自动生成汇总报表
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={4}><HeartOutlined /> 健康监控</Title>
                <Paragraph>
                  实时监控数据库状态，包括：<br />
                  - 连接状态检查<br />
                  - 数据库大小<br />
                  - 活跃连接数<br />
                  - 各表记录数统计
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={4}><FileTextOutlined /> 安全限制</Title>
                <Alert
                  message="安全提示"
                  description="为了数据安全，仅支持 SELECT 查询。禁止执行 INSERT、UPDATE、DELETE、DROP 等修改操作。"
                  type="warning"
                  showIcon
                />
              </div>
            </Space>
          </Card>
        </TabPane>
      </Tabs>

      {/* Skill 详情抽屉 */}
      <Drawer
        title={selectedSkill?.name}
        placement="right"
        width={600}
        onClose={() => setSkillDrawerVisible(false)}
        open={skillDrawerVisible}
      >
        {selectedSkill && (
          <>
            <Descriptions column={1}>
              <Descriptions.Item label="描述">{selectedSkill.description}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag>{selectedSkill.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="使用次数">{selectedSkill.useCount}</Tag></Descriptions.Item>
              <Descriptions.Item label="标签">
                {selectedSkill.tags?.map((tag: string) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Title level={5}>文档</Title>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
              {selectedSkill.skillDoc}
            </pre>
            <Divider />
            <Title level={5}>SQL 模板</Title>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
              {selectedSkill.sqlTemplate}
            </pre>
            <Divider />
            <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={() => loadSkillSQL(selectedSkill)}>
                加载 SQL
              </Button>
              <Button icon={<PlayCircleOutlined />} onClick={() => {
                setSkillDrawerVisible(false);
                setSkillParams(selectedSkill.parameters || {});
              }}>
                执行
              </Button>
            </Space>
          </>
        )}
      </Drawer>

      {/* Skill 创建/编辑模态框 */}
      <Modal
        title={editingSkill ? '编辑 Skill' : '新建 Skill'}
        open={skillFormVisible}
        onCancel={() => setSkillFormVisible(false)}
        onOk={() => skillForm.submit()}
        width={800}
      >
        <Form
          form={skillForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              if (editingSkill) {
                await databaseApi.updateSkill(editingSkill.id, values);
                message.success('更新成功');
              } else {
                await databaseApi.createSkill(values);
                message.success('创建成功');
              }
              setSkillFormVisible(false);
              loadSkills();
            } catch (error) {
              message.error('操作失败');
            }
          }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="Skill 名称" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="简要描述 Skill 的用途" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select placeholder="选择分类">
              <Option value="analytics">分析</Option>
              <Option value="report">报表</Option>
              <Option value="maintenance">维护</Option>
              <Option value="admin">管理</Option>
              <Option value="general">通用</Option>
            </Select>
          </Form.Item>
          <Form.Item name="skillDoc" label="文档 (Markdown)">
            <Input.TextArea rows={6} placeholder="## 用途..." />
          </Form.Item>
          <Form.Item name="sqlTemplate" label="SQL 模板" rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder="SELECT * FROM..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签">
              <Option value="用户分析">用户分析</Option>
              <Option value="统计">统计</Option>
              <Option value="优化">优化</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Database;
