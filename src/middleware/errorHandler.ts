/**
 * Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Map common errors to HTTP status codes
 */
function getStatusCode(error: Error): number {
  const message = error.message.toLowerCase();

  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 401;
  }

  if (message.includes('forbidden')) {
    return 403;
  }

  if (message.includes('not found')) {
    return 404;
  }

  if (message.includes('rate limit')) {
    return 429;
  }

  if (message.includes('invalid') || message.includes('validation')) {
    return 400;
  }

  if (message.includes('cancelled')) {
    return 499; // Client closed request
  }

  if (message.includes('unavailable') || message.includes('timeout')) {
    return 503;
  }

  return 500;
}

/**
 * Determine API type from request path
 */
function getApiType(req: Request): 'openai' | 'anthropic' {
  return req.path.includes('/messages') ? 'anthropic' : 'openai';
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const statusCode = getStatusCode(err);
  const apiType = getApiType(req);

  // Log error with context
  logger.logError(err, requestId);

  // Don't send error if response already started (streaming)
  if (res.headersSent) {
    return;
  }

  // Format error based on API type
  if (apiType === 'anthropic') {
    res.status(statusCode).json({
      type: 'error',
      error: {
        type: statusCode === 500 ? 'api_error' : 'invalid_request_error',
        message: err.message || 'An error occurred processing your request.',
      },
    });
  } else {
    res.status(statusCode).json({
      error: {
        message: err.message || 'An error occurred processing your request.',
        type: statusCode === 500 ? 'api_error' : 'invalid_request_error',
        code: statusCode === 500 ? 'internal_error' : 'invalid_request',
      },
    });
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const apiType = getApiType(req);

  if (apiType === 'anthropic') {
    res.status(404).json({
      type: 'error',
      error: {
        type: 'not_found_error',
        message: `Route ${req.method} ${req.path} not found.`,
      },
    });
  } else {
    res.status(404).json({
      error: {
        message: `Route ${req.method} ${req.path} not found.`,
        type: 'invalid_request_error',
        code: 'route_not_found',
      },
    });
  }
}

