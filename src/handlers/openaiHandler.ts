/**
 * OpenAI API Format Converter
 * Converts between OpenAI API format and VS Code LM format
 */

import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ChatMessage,
} from '../models/openaiTypes';
import { VsCodeLmHandler } from './vsCodeLmHandler';
import { logger } from '../utils/logger';
import {
  initSSE,
  sendOpenAIChunk,
  sendOpenAIDone,
  closeSSE,
  handleSSEError,
} from '../utils/streaming';

/**
 * Convert OpenAI messages to VS Code LM messages
 */
export function convertToVsCodeLmMessages(messages: ChatMessage[]): vscode.LanguageModelChatMessage[] {
  const vsCodeMessages: vscode.LanguageModelChatMessage[] = [];

  for (const message of messages) {
    let role: vscode.LanguageModelChatMessageRole;

    // Map roles
    switch (message.role) {
      case 'system':
      case 'assistant':
        role = vscode.LanguageModelChatMessageRole.Assistant;
        break;
      case 'user':
      default:
        role = vscode.LanguageModelChatMessageRole.User;
        break;
    }

    // Extract text content
    let content: string;
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      // For multimodal content, extract text parts
      content = message.content
        .filter(part => part.type === 'text' && part.text)
        .map(part => part.text)
        .join('\n');
    } else {
      content = '';
    }

    if (content) {
      vsCodeMessages.push(new vscode.LanguageModelChatMessage(role, content));
    }
  }

  return vsCodeMessages;
}

/**
 * Handle non-streaming OpenAI chat completion request
 */
export async function handleChatCompletion(
  request: ChatCompletionRequest,
  handler: VsCodeLmHandler,
  requestId: string
): Promise<ChatCompletionResponse> {
  const { messages, model, temperature, max_tokens, frequency_penalty, presence_penalty } = request;

  // Log unsupported parameters
  if (frequency_penalty !== undefined) {
    logger.warn('frequency_penalty is not supported by VS Code LM', { requestId });
  }
  if (presence_penalty !== undefined) {
    logger.warn('presence_penalty is not supported by VS Code LM', { requestId });
  }

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages);

  logger.debug('Processing OpenAI chat completion', {
    requestId,
    model,
    messageCount: messages.length,
    temperature,
    max_tokens,
  });

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
    const response: ChatCompletionResponse = {
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: accumulatedText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
    };

    logger.debug('OpenAI chat completion completed', {
      requestId,
      inputTokens,
      outputTokens,
    });

    return response;
  } catch (error) {
    logger.error('OpenAI chat completion error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle streaming OpenAI chat completion request
 */
export async function handleStreamingChatCompletion(
  request: ChatCompletionRequest,
  handler: VsCodeLmHandler,
  requestId: string,
  res: Response
): Promise<void> {
  const { messages, model } = request;

  // Initialize SSE
  initSSE(res);

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages);

  logger.debug('Processing OpenAI streaming chat completion', {
    requestId,
    model,
    messageCount: messages.length,
  });

  const completionId = `chatcmpl-${uuidv4()}`;
  const created = Math.floor(Date.now() / 1000);
  let isFirstChunk = true;

  try {
    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        // Send delta chunk
        const streamChunk: ChatCompletionChunk = {
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: isFirstChunk
                ? { role: 'assistant', content: chunk.text }
                : { content: chunk.text },
              finish_reason: null,
            },
          ],
        };

        sendOpenAIChunk(res, streamChunk);
        isFirstChunk = false;
      } else if (chunk.type === 'usage') {
        // Send final chunk with finish_reason
        const finalChunk: ChatCompletionChunk = {
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };

        sendOpenAIChunk(res, finalChunk);

        logger.debug('OpenAI streaming chat completion completed', {
          requestId,
          inputTokens: chunk.inputTokens,
          outputTokens: chunk.outputTokens,
        });
      }
    }

    // Send [DONE] message
    sendOpenAIDone(res);
    closeSSE(res);
  } catch (error) {
    logger.error('OpenAI streaming chat completion error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    handleSSEError(res, error instanceof Error ? error : new Error(String(error)), 'openai');
  }
}

/**
 * Handle legacy OpenAI completion request (non-chat)
 */
export async function handleCompletion(
  prompt: string,
  model: string,
  handler: VsCodeLmHandler,
  requestId: string
): Promise<ChatCompletionResponse> {
  logger.debug('Processing OpenAI legacy completion', { requestId, model });

  // Convert to chat format
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Use chat completion handler
  return handleChatCompletion({ messages, model }, handler, requestId);
}

/**
 * Handle streaming legacy OpenAI completion request
 */
export async function handleStreamingCompletion(
  prompt: string,
  model: string,
  handler: VsCodeLmHandler,
  requestId: string,
  res: Response
): Promise<void> {
  logger.debug('Processing OpenAI streaming legacy completion', { requestId, model });

  // Convert to chat format
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Use streaming chat completion handler
  await handleStreamingChatCompletion({ messages, model }, handler, requestId, res);
}

