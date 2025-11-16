/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export interface RateLimitConfig {
  rateLimit: number; // requests per minute
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  // If rate limit is 0, disable rate limiting
  if (config.rateLimit <= 0) {
    return (_req: Request, _res: Response, next: () => void) => next();
  }

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimit,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    
    // Key generator: use IP address or API key
    keyGenerator: (req: Request): string => {
      // Try to get API key for more accurate rate limiting
      const apiKey = req.headers['x-api-key'] || 
                     (req.headers['authorization'] as string)?.replace('Bearer ', '');
      
      if (apiKey) {
        return `key:${apiKey}`;
      }

      // Fall back to IP address
      return req.ip || 'unknown';
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response): void => {
      const isAnthropicEndpoint = req.path.includes('/messages');
      
      if (isAnthropicEndpoint) {
        res.status(429).json({
          type: 'error',
          error: {
            type: 'rate_limit_error',
            message: 'Rate limit exceeded. Please try again later.',
          },
        });
      } else {
        res.status(429).json({
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        });
      }
    },

    // Skip rate limiting for health check
    skip: (req: Request): boolean => {
      return req.path === '/health';
    },
  });
}

