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
  ToolCall,
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

    // Map roles - tool messages become user messages
    switch (message.role) {
      case 'system':
      case 'assistant':
        role = vscode.LanguageModelChatMessageRole.Assistant;
        break;
      case 'user':
      case 'tool':
      default:
        role = vscode.LanguageModelChatMessageRole.User;
        break;
    }

    // Build message content parts
    const contentParts: (vscode.LanguageModelTextPart | vscode.LanguageModelToolResultPart | vscode.LanguageModelToolCallPart)[] = [];

    // Handle tool results first (for messages with role='tool')
    // These should NOT include text content separately
    if (message.role === 'tool' && message.tool_call_id && message.content) {
      const toolResult = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      contentParts.push(new vscode.LanguageModelToolResultPart(message.tool_call_id, [
        new vscode.LanguageModelTextPart(toolResult)
      ]));
    } else {
      // Handle regular text content (for non-tool messages)
      let textContent = '';
      if (typeof message.content === 'string') {
        textContent = message.content;
      } else if (Array.isArray(message.content)) {
        // For multimodal content, extract text parts
        textContent = message.content
          .filter(part => part.type === 'text' && part.text)
          .map(part => part.text)
          .join('\n');
      }

      if (textContent) {
        contentParts.push(new vscode.LanguageModelTextPart(textContent));
      }
    }

    // Handle tool calls in assistant messages
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        try {
          // Parse arguments (they come as JSON string from OpenAI)
          const args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

          contentParts.push(new vscode.LanguageModelToolCallPart(
            toolCall.id,
            toolCall.function.name,
            args
          ));
        } catch (error) {
          logger.warn('Failed to parse tool call arguments', {
            toolCallId: toolCall.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (contentParts.length > 0) {
      vsCodeMessages.push(new vscode.LanguageModelChatMessage(role, contentParts));
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
  const { messages, model, temperature, max_tokens, frequency_penalty, presence_penalty, tools, tool_choice } = request;

  // Log unsupported parameters
  if (frequency_penalty !== undefined) {
    logger.warn('frequency_penalty is not supported by VS Code LM', { requestId });
  }
  if (presence_penalty !== undefined) {
    logger.warn('presence_penalty is not supported by VS Code LM', { requestId });
  }
  if (tools && tools.length > 0) {
    logger.debug('Tool definitions provided', { requestId, toolCount: tools.length });
    // Note: VS Code LM API doesn't accept tool definitions in request options
    // The client is responsible for executing tools and sending results back
  }
  if (tool_choice !== undefined) {
    logger.debug('Tool choice specified', { requestId, tool_choice });
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
  const toolCalls: ToolCall[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        accumulatedText += chunk.text;
      } else if (chunk.type === 'tool_call') {
        // Convert tool call to OpenAI format
        toolCalls.push({
          id: chunk.id,
          type: 'function',
          function: {
            name: chunk.name,
            arguments: JSON.stringify(chunk.arguments),
          },
        });
      } else if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // Build response message
    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: accumulatedText || null as any,
    };

    // Add tool calls if present
    if (toolCalls.length > 0) {
      responseMessage.tool_calls = toolCalls;
      // When tool calls are present, content can be null
      responseMessage.content = accumulatedText || null as any;
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
          message: responseMessage,
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
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
      toolCallCount: toolCalls.length,
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
  const { messages, model, tools } = request;

  // Initialize SSE
  initSSE(res);

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages);

  if (tools && tools.length > 0) {
    logger.debug('Tool definitions provided for streaming request', { requestId, toolCount: tools.length });
  }

  logger.debug('Processing OpenAI streaming chat completion', {
    requestId,
    model,
    messageCount: messages.length,
  });

  const completionId = `chatcmpl-${uuidv4()}`;
  const created = Math.floor(Date.now() / 1000);
  let isFirstChunk = true;
  let hasToolCalls = false;
  let toolCallIndex = 0;

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
      } else if (chunk.type === 'tool_call') {
        hasToolCalls = true;

        // Send role if this is the first chunk
        if (isFirstChunk) {
          const roleChunk: ChatCompletionChunk = {
            id: completionId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [
              {
                index: 0,
                delta: { role: 'assistant' },
                finish_reason: null,
              },
            ],
          };
          sendOpenAIChunk(res, roleChunk);
          isFirstChunk = false;
        }

        // Send tool call chunk
        const toolCallChunk: ChatCompletionChunk = {
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: toolCallIndex,
                    id: chunk.id,
                    type: 'function',
                    function: {
                      name: chunk.name,
                      arguments: JSON.stringify(chunk.arguments),
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        };

        sendOpenAIChunk(res, toolCallChunk);
        toolCallIndex++;
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
              finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
            },
          ],
        };

        sendOpenAIChunk(res, finalChunk);

        logger.debug('OpenAI streaming chat completion completed', {
          requestId,
          inputTokens: chunk.inputTokens,
          outputTokens: chunk.outputTokens,
          hasToolCalls,
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

