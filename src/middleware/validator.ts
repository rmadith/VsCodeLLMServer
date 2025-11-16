/**
 * Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ChatCompletionRequest } from '../models/openaiTypes';
import { MessagesRequest } from '../models/anthropicTypes';
import { logger } from '../utils/logger';

/**
 * Validate OpenAI chat completion request
 */
export function validateOpenAIRequest(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const body = req.body as Partial<ChatCompletionRequest>;

  const errors: string[] = [];

  // Required fields
  if (!body.messages || !Array.isArray(body.messages)) {
    errors.push('messages field is required and must be an array');
  } else if (body.messages.length === 0) {
    errors.push('messages array cannot be empty');
  }

  if (!body.model || typeof body.model !== 'string') {
    errors.push('model field is required and must be a string');
  }

  // Optional field validation
  if (body.temperature !== undefined) {
    if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2) {
      errors.push('temperature must be a number between 0 and 2');
    }
  }

  if (body.max_tokens !== undefined) {
    if (typeof body.max_tokens !== 'number' || body.max_tokens < 1) {
      errors.push('max_tokens must be a positive number');
    }
  }

  if (body.top_p !== undefined) {
    if (typeof body.top_p !== 'number' || body.top_p < 0 || body.top_p > 1) {
      errors.push('top_p must be a number between 0 and 1');
    }
  }

  if (body.n !== undefined) {
    if (typeof body.n !== 'number' || body.n < 1) {
      errors.push('n must be a positive number');
    }
    if (body.n > 1) {
      logger.warn('n > 1 is not supported, only first completion will be returned', { requestId });
    }
  }

  if (errors.length > 0) {
    logger.warn('OpenAI request validation failed', { requestId, errors });
    res.status(400).json({
      error: {
        message: errors.join(', '),
        type: 'invalid_request_error',
        code: 'invalid_request',
      },
    });
    return;
  }

  next();
}

/**
 * Validate Anthropic messages request
 */
export function validateAnthropicRequest(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const body = req.body as Partial<MessagesRequest>;

  const errors: string[] = [];

  // Required fields
  if (!body.model || typeof body.model !== 'string') {
    errors.push('model field is required and must be a string');
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    errors.push('messages field is required and must be an array');
  } else if (body.messages.length === 0) {
    errors.push('messages array cannot be empty');
  }

  if (!body.max_tokens) {
    errors.push('max_tokens field is required');
  } else if (typeof body.max_tokens !== 'number' || body.max_tokens < 1 || body.max_tokens > 4096) {
    errors.push('max_tokens must be a number between 1 and 4096');
  }

  // Optional field validation
  if (body.temperature !== undefined) {
    if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 1) {
      errors.push('temperature must be a number between 0 and 1');
    }
  }

  if (body.top_p !== undefined) {
    if (typeof body.top_p !== 'number' || body.top_p < 0 || body.top_p > 1) {
      errors.push('top_p must be a number between 0 and 1');
    }
  }

  if (body.top_k !== undefined) {
    if (typeof body.top_k !== 'number' || body.top_k < 0 || body.top_k > 500) {
      errors.push('top_k must be a number between 0 and 500');
    }
  }

  if (errors.length > 0) {
    logger.warn('Anthropic request validation failed', { requestId, errors });
    res.status(400).json({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: errors.join(', '),
      },
    });
    return;
  }

  next();
}

