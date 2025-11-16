/**
 * Server-Sent Events (SSE) streaming utilities
 */

import { Response } from 'express';
import { logger } from './logger';

/**
 * Initialize SSE response
 */
export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
}

/**
 * Send SSE data
 */
export function sendSSE(res: Response, data: string, event?: string): void {
  try {
    if (event) {
      res.write(`event: ${event}\n`);
    }
    res.write(`data: ${data}\n\n`);
  } catch (error) {
    logger.error('Failed to write SSE data', { error });
  }
}

/**
 * Send OpenAI-style SSE chunk
 */
export function sendOpenAIChunk(res: Response, data: any): void {
  sendSSE(res, JSON.stringify(data));
}

/**
 * Send OpenAI-style done message
 */
export function sendOpenAIDone(res: Response): void {
  sendSSE(res, '[DONE]');
}

/**
 * Send Anthropic-style SSE event
 */
export function sendAnthropicEvent(res: Response, event: string, data: any): void {
  sendSSE(res, JSON.stringify(data), event);
}

/**
 * Close SSE connection
 */
export function closeSSE(res: Response): void {
  try {
    res.end();
  } catch (error) {
    logger.error('Failed to close SSE connection', { error });
  }
}

/**
 * Handle SSE errors
 */
export function handleSSEError(res: Response, error: Error, apiType: 'openai' | 'anthropic'): void {
  try {
    if (apiType === 'openai') {
      sendOpenAIChunk(res, {
        error: {
          message: error.message,
          type: 'server_error',
        },
      });
    } else {
      sendAnthropicEvent(res, 'error', {
        type: 'error',
        error: {
          type: 'api_error',
          message: error.message,
        },
      });
    }
    closeSSE(res);
  } catch (e) {
    logger.error('Failed to send SSE error', { error: e });
  }
}

