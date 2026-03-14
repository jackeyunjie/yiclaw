/**
 * 插件统计卡片组件
 */

import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';

interface PluginStatsProps {
  total: number;
  active: number;
  inactive: number;
  error: number;
}

const PluginStats: React.FC<PluginStatsProps> = ({
  total,
  active,
  inactive,
  error,
}) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="插件总数"
            value={total}
            prefix={<AppstoreOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="运行中"
            value={active}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已停止"
            value={inactive}
            prefix={<SyncOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="错误"
            value={error}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default PluginStats;
