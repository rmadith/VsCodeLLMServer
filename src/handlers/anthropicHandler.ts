/**
 * Anthropic API Format Converter
 * Converts between Anthropic API format and VS Code LM format
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import {
  MessagesRequest,
  MessagesResponse,
  AnthropicMessage,
  SystemPrompt,
  ContentBlock,
} from '../models/anthropicTypes';
import { VsCodeLmHandler } from './vsCodeLmHandler';
import { logger } from '../utils/logger';
import {
  initSSE,
  sendAnthropicEvent,
  closeSSE,
  handleSSEError,
} from '../utils/streaming';

/**
 * Extract system prompt as string
 */
function extractSystemPrompt(system?: SystemPrompt): string {
  if (!system) {
    return '';
  }

  if (typeof system === 'string') {
    return system;
  }

  // Array of system blocks
  return system.map(block => block.text).join('\n');
}

/**
 * Extract text content from message
 */
function extractMessageContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }

  // Extract text from content blocks
  return content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('\n');
}

/**
 * Convert Anthropic messages to VS Code LM messages
 */
export function convertToVsCodeLmMessages(
  messages: AnthropicMessage[],
  system?: SystemPrompt
): vscode.LanguageModelChatMessage[] {
  const vsCodeMessages: vscode.LanguageModelChatMessage[] = [];

  // Add system prompt as assistant message if provided
  const systemPrompt = extractSystemPrompt(system);
  if (systemPrompt) {
    vsCodeMessages.push(
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.Assistant,
        systemPrompt
      )
    );
  }

  // Convert messages
  for (const message of messages) {
    const role =
      message.role === 'assistant'
        ? vscode.LanguageModelChatMessageRole.Assistant
        : vscode.LanguageModelChatMessageRole.User;

    const content = extractMessageContent(message.content);

    if (content) {
      vsCodeMessages.push(new vscode.LanguageModelChatMessage(role, content));
    }
  }

  return vsCodeMessages;
}

/**
 * Handle non-streaming Anthropic messages request
 */
export async function handleMessages(
  request: MessagesRequest,
  handler: VsCodeLmHandler,
  requestId: string
): Promise<MessagesResponse> {
  const { messages, system, model, max_tokens, temperature, top_p, top_k } = request;

  // Log parameters
  logger.debug('Processing Anthropic messages request', {
    requestId,
    model,
    messageCount: messages.length,
    max_tokens,
    temperature,
    top_p,
    top_k,
  });

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages, system);

  // Collect response
  let accumulatedText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        accumulatedText += chunk.text;
      } else if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // Build response
    const response: MessagesResponse = {
      id: `msg_${uuidv4().replace(/-/g, '')}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: accumulatedText,
        },
      ],
      model: model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    };

    logger.debug('Anthropic messages request completed', {
      requestId,
      inputTokens,
      outputTokens,
    });

    return response;
  } catch (error) {
    logger.error('Anthropic messages request error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle streaming Anthropic messages request
 */
export async function handleStreamingMessages(
  request: MessagesRequest,
  handler: VsCodeLmHandler,
  requestId: string,
  res: Response
): Promise<void> {
  const { messages, system, model } = request;

  // Initialize SSE
  initSSE(res);

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages, system);

  logger.debug('Processing Anthropic streaming messages request', {
    requestId,
    model,
    messageCount: messages.length,
  });

  const messageId = `msg_${uuidv4().replace(/-/g, '')}`;
  let inputTokens = 0;
  let outputTokens = 0;
  let isFirstChunk = true;

  try {
    // Send message_start event
    sendAnthropicEvent(res, 'message_start', {
      type: 'message_start',
      message: {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: model,
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      },
    });

    // Send content_block_start event (for first text block)
    if (isFirstChunk) {
      sendAnthropicEvent(res, 'content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: '',
        },
      });
      isFirstChunk = false;
    }

    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        // Send content_block_delta event
        sendAnthropicEvent(res, 'content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'text_delta',
            text: chunk.text,
          },
        });
      } else if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // Send content_block_stop event
    sendAnthropicEvent(res, 'content_block_stop', {
      type: 'content_block_stop',
      index: 0,
    });

    // Send message_delta event
    sendAnthropicEvent(res, 'message_delta', {
      type: 'message_delta',
      delta: {
        stop_reason: 'end_turn',
        stop_sequence: null,
      },
      usage: {
        output_tokens: outputTokens,
      },
    });

    // Send message_stop event
    sendAnthropicEvent(res, 'message_stop', {
      type: 'message_stop',
    });

    logger.debug('Anthropic streaming messages request completed', {
      requestId,
      inputTokens,
      outputTokens,
    });

    closeSSE(res);
  } catch (error) {
    logger.error('Anthropic streaming messages request error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    handleSSEError(res, error instanceof Error ? error : new Error(String(error)), 'anthropic');
  }
}

