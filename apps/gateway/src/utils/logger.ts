/**
 * 日志工具
 *
 * 使用 Winston 实现结构化日志
 * 包含敏感信息脱敏功能
 */

import winston from 'winston';
import type { Request, Response, NextFunction } from 'express';

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 敏感字段列表
const SENSITIVE_FIELDS = [
  'password',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'authorization',
  'cookie',
  'jwt',
  'key',
  'private',
  'credential',
  'credit_card',
  'ssn',
];

// 添加颜色支持
winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// 创建日志记录器
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports: [
    // 控制台输出
    new winston.transports.Console(),
    // 文件输出（生产环境）
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});

/**
 * 检查字段是否为敏感字段
 * @param key 字段名
 */
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
}

/**
 * 脱敏对象中的敏感信息
 * @param obj 原始对象
 * @returns 脱敏后的对象
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // 如果是字符串且可能是敏感值（长度较长），进行截断
    if (obj.length > 50) {
      return obj.substring(0, 10) + '***REDACTED***' + obj.substring(obj.length - 5);
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 安全日志中间件
 * 自动脱敏请求中的敏感信息
 */
export function securityLogger(req: Request, _res: Response, next: NextFunction): void {
  // 脱敏 query 参数
  const sanitizedQuery = req.query && Object.keys(req.query).length > 0
    ? sanitizeObject(req.query)
    : undefined;

  // 脱敏请求体（仅在开发环境记录）
  const sanitizedBody = process.env.NODE_ENV === 'development' && req.body
    ? sanitizeObject(req.body)
    : undefined;

  // 脱敏 headers（只保留必要的）
  const safeHeaders = {
    'content-type': req.get('content-type'),
    'user-agent': req.get('user-agent'),
    'x-request-id': req.get('x-request-id'),
  };

  const logData: Record<string, unknown> = {
    ip: req.ip,
    headers: safeHeaders,
  };
  
  if (sanitizedQuery) {
    logData.query = sanitizedQuery;
  }
  if (sanitizedBody) {
    logData.body = sanitizedBody;
  }
  
  logger.info(`${req.method} ${req.path}`, logData);

  next();
}

/**
 * 创建带上下文的日志记录器
 * @param context 上下文信息
 */
export function createLogger(context: string) {
  return {
    error: (message: string, meta?: unknown) => {
      const sanitizedMeta = meta ? sanitizeObject(meta) : meta;
      logger.error(`[${context}] ${message}`, sanitizedMeta);
    },
    warn: (message: string, meta?: unknown) => {
      const sanitizedMeta = meta ? sanitizeObject(meta) : meta;
      logger.warn(`[${context}] ${message}`, sanitizedMeta);
    },
    info: (message: string, meta?: unknown) => {
      const sanitizedMeta = meta ? sanitizeObject(meta) : meta;
      logger.info(`[${context}] ${message}`, sanitizedMeta);
    },
    debug: (message: string, meta?: unknown) => {
      const sanitizedMeta = meta ? sanitizeObject(meta) : meta;
      logger.debug(`[${context}] ${message}`, sanitizedMeta);
    },
  };
}
