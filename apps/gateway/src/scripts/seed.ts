/**
 * 数据库种子脚本
 *
 * 初始化基础数据：
 * - 默认管理员用户
 * - 系统设置
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 创建默认管理员
 */
async function createDefaultAdmin() {
  const adminExists = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (adminExists) {
    logger.info('管理员用户已存在，跳过创建');
    return;
  }

  // 默认管理员账号
  const defaultAdmin = {
    username: 'admin',
    password: await bcrypt.hash('admin123', 10), // 首次登录后必须修改
    role: UserRole.ADMIN,
    isActive: true,
  };

  const admin = await prisma.user.create({
    data: defaultAdmin,
  });

  logger.info(`✅ 默认管理员创建成功: ${admin.username}`);
  logger.warn('⚠️  请立即登录并修改默认密码！');
}

/**
 * 创建系统默认设置
 */
async function createDefaultSettings() {
  const settings = [
    {
      key: 'system.name',
      value: 'OpenClaw',
    },
    {
      key: 'system.version',
      value: '1.0.0',
    },
    {
      key: 'system.allow_registration',
      value: true,
    },
    {
      key: 'chat.max_message_length',
      value: 4000,
    },
    {
      key: 'chat.max_context_messages',
      value: 20,
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  logger.info('✅ 系统默认设置已初始化');
}

/**
 * 创建预设数据库 Skills
 * Miessler PAI 风格的 SQL Skills
 */
async function createDefaultDbSkills() {
  const skillsExist = await prisma.dbSkill.findFirst({
    where: { isSystem: true },
  });

  if (skillsExist) {
    logger.info('系统 Skills 已存在，跳过创建');
    return;
  }

  const defaultSkills = [
    {
      name: '用户活跃度分析',
      description: '分析用户在指定时间段内的活跃情况，包括消息数、会话数等',
      category: 'analytics',
      skillDoc: `## 用途
分析用户活跃度，识别高活跃用户和沉默用户。

## 适用场景
- 用户运营分析
- 活跃度趋势监控
- 用户分层

## 参数说明
- startDate: 开始日期 (YYYY-MM-DD)
- endDate: 结束日期 (YYYY-MM-DD)
- limit: 返回用户数限制`,
      workflows: [
        { step: 1, name: '设置日期范围', description: '确定分析的时间段' },
        { step: 2, name: '执行查询', description: '获取用户活跃数据' },
        { step: 3, name: '分析结果', description: '根据消息数和会话数判断活跃度' }
      ],
      sqlTemplate: `SELECT
  u.username,
  COUNT(DISTINCT s.id) as session_count,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_active
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
  AND s.created_at BETWEEN '{{startDate}}' AND '{{endDate}}'
LEFT JOIN messages m ON s.id = m.session_id
GROUP BY u.id, u.username
ORDER BY message_count DESC
LIMIT {{limit}};`,
      parameters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 50
      },
      tags: ['用户分析', '活跃度', '运营'],
      isSystem: true,
    },
    {
      name: '消息统计报表',
      description: '按模型、渠道类型统计消息数量',
      category: 'report',
      skillDoc: `## 用途
统计系统的消息使用情况，分析各模型的使用频率。

## 适用场景
- 成本分析
- 模型使用偏好
- 渠道效果分析

## 参数说明
- startDate: 开始日期
- endDate: 结束日期`,
      workflows: [
        { step: 1, name: '选择时间范围' },
        { step: 2, name: '分组统计' },
        { step: 3, name: '生成报表' }
      ],
      sqlTemplate: `SELECT
  JSON_UNQUOTE(JSON_EXTRACT(m.metadata, '$.model')) as model,
  s.channel_type,
  COUNT(*) as message_count,
  DATE(m.created_at) as date
FROM messages m
JOIN sessions s ON m.session_id = s.id
WHERE m.created_at BETWEEN '{{startDate}}' AND '{{endDate}}'
  AND m.role = 'ASSISTANT'
GROUP BY JSON_UNQUOTE(JSON_EXTRACT(m.metadata, '$.model')), s.channel_type, DATE(m.created_at)
ORDER BY date DESC, message_count DESC;`,
      parameters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      tags: ['统计', '报表', '消息'],
      isSystem: true,
    },
    {
      name: '大表检查',
      description: '查找数据库中记录数最多的表',
      category: 'maintenance',
      skillDoc: `## 用途
识别数据库中占用空间最大的表，用于性能优化。

## 适用场景
- 数据库优化
- 容量规划
- 清理无用数据`,
      workflows: [
        { step: 1, name: '获取表统计' },
        { step: 2, name: '分析大小' },
        { step: 3, name: '确定优化目标' }
      ],
      sqlTemplate: `SELECT
  table_name as tablename,
  table_rows as live_rows,
  ROUND(data_length / 1024 / 1024, 2) as data_size_mb,
  ROUND(index_length / 1024 / 1024, 2) as index_size_mb
FROM information_schema.tables
WHERE table_schema = 'openclaw'
  AND table_type = 'BASE TABLE'
ORDER BY table_rows DESC
LIMIT {{limit}};`,
      parameters: {
        limit: 20
      },
      tags: ['维护', '性能', '优化'],
      isSystem: true,
    },
    {
      name: '会话质量分析',
      description: '分析会话的平均消息数、响应时间等指标',
      category: 'analytics',
      skillDoc: `## 用途
评估会话质量，识别异常会话。

## 适用场景
- 用户体验优化
- 异常检测
- 客服质量评估`,
      workflows: [
        { step: 1, name: '筛选会话' },
        { step: 2, name: '计算指标' },
        { step: 3, name: '识别异常' }
      ],
      sqlTemplate: `SELECT
  s.id,
  s.channel_type,
  s.created_at,
  COUNT(m.id) as message_count,
  TIMESTAMPDIFF(MINUTE, MIN(m.created_at), MAX(m.created_at)) as duration_minutes
FROM sessions s
JOIN messages m ON s.id = m.session_id
WHERE s.created_at BETWEEN '{{startDate}}' AND '{{endDate}}'
GROUP BY s.id, s.channel_type, s.created_at
HAVING message_count >= {{minMessages}}
ORDER BY message_count DESC
LIMIT {{limit}};`,
      parameters: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        minMessages: 5,
        limit: 100
      },
      tags: ['会话', '质量', '分析'],
      isSystem: true,
    },
    {
      name: '模型配置概览',
      description: '查看用户配置的模型和 API 使用情况',
      category: 'admin',
      skillDoc: `## 用途
查看系统中配置的 AI 模型。

## 适用场景
- 配置审核
- 成本监控`,
      workflows: [
        { step: 1, name: '获取配置列表' },
        { step: 2, name: '检查默认配置' }
      ],
      sqlTemplate: `SELECT
  provider,
  model_id,
  COUNT(*) as config_count,
  SUM(CASE WHEN is_default THEN 1 ELSE 0 END) as default_count
FROM model_configs
WHERE is_active = true
GROUP BY provider, model_id
ORDER BY config_count DESC;`,
      parameters: {},
      tags: ['模型', '配置', '管理'],
      isSystem: true,
    },
  ];

  for (const skillData of defaultSkills) {
    await prisma.dbSkill.create({
      data: skillData as any,
    });
  }

  logger.info(`✅ 已创建 ${defaultSkills.length} 个预设 Skills`);
}

/**
 * 主函数
 */
async function main() {
  logger.info('🌱 开始执行数据库种子脚本...');

  try {
    await createDefaultAdmin();
    await createDefaultSettings();
    await createDefaultDbSkills();

    logger.info('✅ 数据库种子脚本执行完成');
  } catch (error) {
    logger.error('❌ 数据库种子脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行种子脚本
main();
