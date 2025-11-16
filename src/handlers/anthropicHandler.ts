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

    // Build content parts
    const contentParts: (vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelToolResultPart)[] = [];

    if (typeof message.content === 'string') {
      contentParts.push(new vscode.LanguageModelTextPart(message.content));
    } else {
      // Process content blocks
      for (const block of message.content) {
        if (block.type === 'text') {
          contentParts.push(new vscode.LanguageModelTextPart(block.text));
        } else if (block.type === 'tool_use') {
          // Convert Anthropic tool_use to VS Code tool call
          contentParts.push(new vscode.LanguageModelToolCallPart(
            block.id,
            block.name,
            block.input
          ));
        } else if (block.type === 'tool_result') {
          // Convert Anthropic tool_result to VS Code tool result
          const resultContent = typeof block.content === 'string'
            ? block.content
            : block.content.map(c => c.type === 'text' ? c.text : '').join('\n');
          
          contentParts.push(new vscode.LanguageModelToolResultPart(
            block.tool_use_id,
            [new vscode.LanguageModelTextPart(resultContent)]
          ));
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
 * Handle non-streaming Anthropic messages request
 */
export async function handleMessages(
  request: MessagesRequest,
  handler: VsCodeLmHandler,
  requestId: string
): Promise<MessagesResponse> {
  const { messages, system, model, max_tokens, temperature, top_p, top_k, tools, tool_choice } = request;

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

  if (tools && tools.length > 0) {
    logger.debug('Tool definitions provided', { requestId, toolCount: tools.length });
  }
  if (tool_choice !== undefined) {
    logger.debug('Tool choice specified', { requestId, tool_choice });
  }

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages, system);

  // Collect response
  let accumulatedText = '';
  const contentBlocks: ContentBlock[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        accumulatedText += chunk.text;
      } else if (chunk.type === 'tool_call') {
        // Convert VS Code tool call to Anthropic tool_use format
        contentBlocks.push({
          type: 'tool_use',
          id: chunk.id,
          name: chunk.name,
          input: chunk.arguments,
        });
      } else if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // Build content blocks
    const responseContent: ContentBlock[] = [];
    
    // Add text if present
    if (accumulatedText) {
      responseContent.push({
        type: 'text',
        text: accumulatedText,
      });
    }

    // Add tool use blocks
    responseContent.push(...contentBlocks);

    // Determine stop reason
    const stopReason: StopReason = contentBlocks.length > 0 ? 'tool_use' : 'end_turn';

    // Build response
    const response: MessagesResponse = {
      id: `msg_${uuidv4().replace(/-/g, '')}`,
      type: 'message',
      role: 'assistant',
      content: responseContent,
      model: model,
      stop_reason: stopReason,
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
      toolUseCount: contentBlocks.length,
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
  const { messages, system, model, tools } = request;

  // Initialize SSE
  initSSE(res);

  // Convert messages to VS Code LM format
  const vsCodeMessages = convertToVsCodeLmMessages(messages, system);

  if (tools && tools.length > 0) {
    logger.debug('Tool definitions provided for streaming request', { requestId, toolCount: tools.length });
  }

  logger.debug('Processing Anthropic streaming messages request', {
    requestId,
    model,
    messageCount: messages.length,
  });

  const messageId = `msg_${uuidv4().replace(/-/g, '')}`;
  let inputTokens = 0;
  let outputTokens = 0;
  let contentBlockIndex = 0;
  let currentBlockIsOpen = false;
  let hasToolUse = false;

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

    for await (const chunk of handler.createMessage(vsCodeMessages)) {
      if (chunk.type === 'text') {
        // Start text block if not already open
        if (!currentBlockIsOpen) {
          sendAnthropicEvent(res, 'content_block_start', {
            type: 'content_block_start',
            index: contentBlockIndex,
            content_block: {
              type: 'text',
              text: '',
            },
          });
          currentBlockIsOpen = true;
        }

        // Send content_block_delta event
        sendAnthropicEvent(res, 'content_block_delta', {
          type: 'content_block_delta',
          index: contentBlockIndex,
          delta: {
            type: 'text_delta',
            text: chunk.text,
          },
        });
      } else if (chunk.type === 'tool_call') {
        hasToolUse = true;

        // Close previous block if open
        if (currentBlockIsOpen) {
          sendAnthropicEvent(res, 'content_block_stop', {
            type: 'content_block_stop',
            index: contentBlockIndex,
          });
          contentBlockIndex++;
          currentBlockIsOpen = false;
        }

        // Send tool_use block start
        sendAnthropicEvent(res, 'content_block_start', {
          type: 'content_block_start',
          index: contentBlockIndex,
          content_block: {
            type: 'tool_use',
            id: chunk.id,
            name: chunk.name,
            input: {},
          },
        });

        // Send tool input as delta
        sendAnthropicEvent(res, 'content_block_delta', {
          type: 'content_block_delta',
          index: contentBlockIndex,
          delta: {
            type: 'input_json_delta',
            partial_json: JSON.stringify(chunk.arguments),
          },
        });

        // Close tool_use block
        sendAnthropicEvent(res, 'content_block_stop', {
          type: 'content_block_stop',
          index: contentBlockIndex,
        });

        contentBlockIndex++;
      } else if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
    }

    // Close any open content block
    if (currentBlockIsOpen) {
      sendAnthropicEvent(res, 'content_block_stop', {
        type: 'content_block_stop',
        index: contentBlockIndex,
      });
    }

    // Send message_delta event
    sendAnthropicEvent(res, 'message_delta', {
      type: 'message_delta',
      delta: {
        stop_reason: hasToolUse ? 'tool_use' : 'end_turn',
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
      hasToolUse,
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

