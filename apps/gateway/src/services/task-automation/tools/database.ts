/**
 * 数据库操作工具
 *
 * 支持 SQL 查询、数据导出、报表生成
 */

import { createLogger } from '../../../utils/logger';
import type { Tool } from '../ToolExecutor';
import { getPrismaClient } from '../../../utils/db';

const logger = createLogger('DatabaseTool');

/**
 * 执行 SQL 查询工具
 */
export const sqlQueryTool: Tool = {
  name: 'sql_query',
  description: '执行 SQL 查询（仅 SELECT，安全只读）',
  parameters: {
    type: 'object',
    properties: {
      connectionId: {
        type: 'string',
        description: '数据库连接 ID（可选，默认使用系统数据库）'
      },
      sql: {
        type: 'string',
        description: 'SQL 查询语句（仅支持 SELECT）'
      },
      limit: {
        type: 'number',
        description: '返回结果数量限制（默认 100）'
      }
    },
    required: ['sql']
  },
  async execute(params) {
    const startTime = Date.now();
    const sql = String(params.sql).trim();
    const limit = Number(params.limit || 100);

    // 安全检查：只允许 SELECT 语句
    const upperSql = sql.toUpperCase();
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];

    for (const keyword of forbiddenKeywords) {
      if (upperSql.includes(keyword)) {
        return {
          success: false,
          error: `安全限制：不允许执行 ${keyword} 操作，仅支持 SELECT 查询`,
          executionTime: Date.now() - startTime
        };
      }
    }

    if (!upperSql.startsWith('SELECT')) {
      return {
        success: false,
        error: '安全限制：仅支持 SELECT 查询语句',
        executionTime: Date.now() - startTime
      };
    }

    try {
      logger.info(`执行 SQL 查询: ${sql.substring(0, 100)}...`);

      const prisma = getPrismaClient();

      // 使用 Prisma 的 $queryRaw 执行原始 SQL
      // 添加 LIMIT 限制防止大数据量查询
      let limitedSql = sql;
      if (!upperSql.includes('LIMIT') && limit > 0) {
        // 移除末尾分号（如果有），然后添加 LIMIT
        limitedSql = sql.replace(/;\s*$/, '') + ` LIMIT ${limit}`;
      }

      const result = await prisma.$queryRawUnsafe(limitedSql);

      // 格式化结果
      const rows = Array.isArray(result) ? result : [result];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        success: true,
        data: {
          columns,
          rows,
          rowCount: rows.length,
          sql: limitedSql
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('SQL 查询失败', error);
      return {
        success: false,
        error: `查询失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 获取表结构工具
 */
export const getTableSchemaTool: Tool = {
  name: 'get_table_schema',
  description: '获取数据库表结构信息',
  parameters: {
    type: 'object',
    properties: {
      tableName: {
        type: 'string',
        description: '表名（可选，不传则返回所有表）'
      }
    }
  },
  async execute(params) {
    const startTime = Date.now();
    const tableName = params.tableName ? String(params.tableName) : null;

    try {
      const prisma = getPrismaClient();

      if (tableName) {
        // 获取特定表的结构
        const columns = await prisma.$queryRawUnsafe(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `);

        return {
          success: true,
          data: {
            tableName,
            columns
          },
          executionTime: Date.now() - startTime
        };
      } else {
        // 获取所有表列表 (MySQL 兼容)
        const tables = await prisma.$queryRawUnsafe(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'openclaw'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        return {
          success: true,
          data: {
            tables
          },
          executionTime: Date.now() - startTime
        };
      }
    } catch (error) {
      logger.error('获取表结构失败', error);
      return {
        success: false,
        error: `获取表结构失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 数据导出工具
 */
export const exportDataTool: Tool = {
  name: 'export_data',
  description: '将查询结果导出为 CSV 或 JSON 格式',
  parameters: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL 查询语句'
      },
      format: {
        type: 'string',
        description: '导出格式: csv 或 json'
      },
      filename: {
        type: 'string',
        description: '文件名（可选）'
      }
    },
    required: ['sql', 'format']
  },
  async execute(params) {
    const startTime = Date.now();
    const sql = String(params.sql).trim();
    const format = String(params.format).toLowerCase();
    const filename = params.filename ? String(params.filename) : `export_${Date.now()}`;

    // 安全检查
    if (!sql.toUpperCase().startsWith('SELECT')) {
      return {
        success: false,
        error: '仅支持 SELECT 查询',
        executionTime: Date.now() - startTime
      };
    }

    try {
      const prisma = getPrismaClient();
      const result = await prisma.$queryRawUnsafe(sql);
      const rows = Array.isArray(result) ? result : [result];

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'csv') {
        // 生成 CSV
        if (rows.length === 0) {
          content = '';
        } else {
          const columns = Object.keys(rows[0]);
          const header = columns.join(',');
          const dataRows = rows.map(row =>
            columns.map(col => {
              const val = row[col];
              // 处理包含逗号或引号的值
              if (val === null || val === undefined) return '';
              const str = String(val);
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            }).join(',')
          );
          content = [header, ...dataRows].join('\n');
        }
        mimeType = 'text/csv';
        extension = 'csv';
      } else if (format === 'json') {
        // 生成 JSON
        content = JSON.stringify(rows, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        return {
          success: false,
          error: `不支持的格式: ${format}，请使用 csv 或 json`,
          executionTime: Date.now() - startTime
        };
      }

      // 生成 base64 数据
      const base64Content = Buffer.from(content).toString('base64');

      return {
        success: true,
        data: {
          filename: `${filename}.${extension}`,
          format,
          mimeType,
          content: base64Content,
          rowCount: rows.length,
          downloadUrl: `data:${mimeType};base64,${base64Content}`
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('数据导出失败', error);
      return {
        success: false,
        error: `导出失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 生成数据报表工具
 */
export const generateReportTool: Tool = {
  name: 'generate_report',
  description: '生成数据报表（支持聚合统计）',
  parameters: {
    type: 'object',
    properties: {
      tableName: {
        type: 'string',
        description: '表名'
      },
      dateColumn: {
        type: 'string',
        description: '日期字段名（用于时间范围筛选）'
      },
      startDate: {
        type: 'string',
        description: '开始日期 (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        description: '结束日期 (YYYY-MM-DD)'
      },
      groupBy: {
        type: 'string',
        description: '分组字段（可选）'
      },
      metrics: {
        type: 'array',
        description: '统计指标列表'
      }
    },
    required: ['tableName']
  },
  async execute(params) {
    const startTime = Date.now();
    const tableName = String(params.tableName);
    const dateColumn = params.dateColumn ? String(params.dateColumn) : null;
    const startDate = params.startDate ? String(params.startDate) : null;
    const endDate = params.endDate ? String(params.endDate) : null;
    const groupBy = params.groupBy ? String(params.groupBy) : null;
    const metrics = params.metrics as string[] || ['count'];

    try {
      const prisma = getPrismaClient();

      // 构建查询
      let selectClause = '';
      const metricClauses: string[] = [];

      for (const metric of metrics) {
        switch (metric.toLowerCase()) {
          case 'count':
            metricClauses.push('COUNT(*) as count');
            break;
          case 'sum':
            metricClauses.push('SUM(1) as sum');
            break;
          default:
            metricClauses.push(`${metric}`);
        }
      }

      selectClause = metricClauses.join(', ');

      if (groupBy) {
        selectClause = `${groupBy}, ${selectClause}`;
      }

      let whereClause = '';
      const conditions: string[] = [];

      if (dateColumn && (startDate || endDate)) {
        if (startDate) {
          conditions.push(`${dateColumn} >= '${startDate}'`);
        }
        if (endDate) {
          conditions.push(`${dateColumn} <= '${endDate}'`);
        }
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      let groupClause = '';
      if (groupBy) {
        groupClause = `GROUP BY ${groupBy}`;
      }

      const sql = `SELECT ${selectClause} FROM "${tableName}" ${whereClause} ${groupClause} ORDER BY ${groupBy || 'count'} DESC LIMIT 100`;

      logger.info(`生成报表 SQL: ${sql}`);

      const result = await prisma.$queryRawUnsafe(sql);
      const rows = Array.isArray(result) ? result : [result];

      // 计算汇总统计
      const summary: Record<string, number> = {};
      for (const metric of metrics) {
        if (metric === 'count') {
          summary.total = rows.reduce((sum, row) => sum + (parseInt(row.count) || 0), 0);
        }
      }

      return {
        success: true,
        data: {
          tableName,
          dateRange: { startDate, endDate },
          groupBy,
          metrics,
          rows,
          summary,
          sql
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('生成报表失败', error);
      return {
        success: false,
        error: `生成报表失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 数据库健康检查工具
 */
export const dbHealthCheckTool: Tool = {
  name: 'db_health_check',
  description: '检查数据库健康状态',
  parameters: {
    type: 'object',
    properties: {}
  },
  async execute() {
    const startTime = Date.now();

    try {
      const prisma = getPrismaClient();

      // 检查连接
      await prisma.$queryRaw`SELECT 1`;

      // 获取数据库统计 (MySQL 兼容)
      const tableStats = await prisma.$queryRawUnsafe(`
        SELECT
          table_name as tablename,
          table_rows as live_tuples,
          ROUND(data_length / 1024 / 1024, 2) as data_size_mb
        FROM information_schema.tables
        WHERE table_schema = 'openclaw'
          AND table_type = 'BASE TABLE'
        ORDER BY table_rows DESC
        LIMIT 10
      `);

      // 获取连接数 (MySQL 兼容)
      const connections = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as connection_count
        FROM information_schema.processlist
      `);

      // 获取数据库大小 (MySQL 兼容)
      const dbSize = await prisma.$queryRawUnsafe(`
        SELECT
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables
        WHERE table_schema = 'openclaw'
      `);

      return {
        success: true,
        data: {
          status: 'healthy',
          connectionStatus: 'connected',
          databaseSize: (dbSize as any[])[0]?.size_mb + ' MB',
          activeConnections: parseInt(String((connections as any[])[0]?.connection_count)) || 0,
          topTables: tableStats,
          responseTime: Date.now() - startTime
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('数据库健康检查失败', error);
      return {
        success: false,
        error: `健康检查失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};
