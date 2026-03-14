/**
 * 认证中间件
 *
 * 验证 JWT Token，保护需要登录的接口
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthMiddleware');

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
      };
    }
  }
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未提供认证令牌',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: string;
    };

    // 将用户信息附加到请求对象
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '无效的认证令牌',
        },
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: '认证令牌已过期',
        },
      });
      return;
    }

    logger.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
}

/**
 * 可选认证中间件
 * 验证 token 但不强制要求，用于需要识别用户但不强制登录的场景
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有 token，继续但不设置用户信息
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch {
    // token 验证失败，继续但不设置用户信息
    next();
  }
}
