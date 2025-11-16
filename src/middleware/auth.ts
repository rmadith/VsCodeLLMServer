/**
 * API Key Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthConfig {
  enableAuth: boolean;
  apiKey?: string;
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip authentication if disabled
    if (!config.enableAuth) {
      next();
      return;
    }

    // Skip authentication for health check
    if (req.path === '/health') {
      next();
      return;
    }

    const requestId = req.headers['x-request-id'] as string || 'unknown';

    // Determine API type from path
    const isAnthropicEndpoint = req.path.includes('/messages');

    let providedKey: string | undefined;

    if (isAnthropicEndpoint) {
      // Anthropic uses x-api-key header
      providedKey = req.headers['x-api-key'] as string;
    } else {
      // OpenAI uses Authorization: Bearer <key>
      const authHeader = req.headers['authorization'] as string;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        providedKey = authHeader.substring(7);
      }
    }

    // Check if API key is provided
    if (!providedKey) {
      logger.warn('Missing API key', { requestId, path: req.path });
      
      if (isAnthropicEndpoint) {
        res.status(401).json({
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'Missing API key. Please provide x-api-key header.',
          },
        });
      } else {
        res.status(401).json({
          error: {
            message: 'Missing API key. Please provide Authorization: Bearer <key> header.',
            type: 'authentication_error',
            code: 'missing_api_key',
          },
        });
      }
      return;
    }

    // Validate API key
    if (config.apiKey && providedKey !== config.apiKey) {
      logger.warn('Invalid API key', { requestId, path: req.path });
      
      if (isAnthropicEndpoint) {
        res.status(401).json({
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'Invalid API key.',
          },
        });
      } else {
        res.status(401).json({
          error: {
            message: 'Invalid API key.',
            type: 'authentication_error',
            code: 'invalid_api_key',
          },
        });
      }
      return;
    }

    next();
  };
}

