/**
 * VS Code Language Model Handler
 * Adapts vscode.lm API for use with the HTTP server
 */

import * as vscode from 'vscode';
import { VsCodeLmHandlerOptions, StreamChunk } from '../models/types';
import { logger } from '../utils/logger';

/**
 * Handles interaction with VS Code's Language Model API
 */
export class VsCodeLmHandler {
  private options: VsCodeLmHandlerOptions;
  private client: vscode.LanguageModelChat | null = null;
  private disposable: vscode.Disposable | null = null;
  private currentRequestCancellation: vscode.CancellationTokenSource | null = null;

  constructor(options: VsCodeLmHandlerOptions = {}) {
    this.options = options;

    try {
      // Listen for model changes and reset client
      this.disposable = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration('lm')) {
          try {
            this.client = null;
            this.ensureCleanState();
            logger.info('VS Code LM client reset due to configuration change');
          } catch (error) {
            logger.error('Error during configuration change cleanup', { error });
          }
        }
      });

      // Initialize client asynchronously
      this.initializeClient().catch(error => {
        logger.error('Failed to initialize VS Code LM client', { error });
      });
    } catch (error) {
      this.dispose();
      throw new Error(`Failed to initialize VsCodeLmHandler: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize the VS Code Language Model client
   */
  async initializeClient(): Promise<void> {
    try {
      if (this.client) {
        logger.debug('VS Code LM client already initialized');
        return;
      }

      this.client = await this.createClient(this.options.vsCodeLmModelSelector || {});
      logger.info('VS Code LM client initialized successfully', {
        model: this.client.id,
        vendor: this.client.vendor,
        family: this.client.family,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('VS Code LM client initialization failed', { error: errorMessage });
      throw new Error(`Failed to initialize VS Code LM client: ${errorMessage}`);
    }
  }

  /**
   * Create a language model chat client based on selector
   */
  private async createClient(selector: vscode.LanguageModelChatSelector): Promise<vscode.LanguageModelChat> {
    try {
      const models = await vscode.lm.selectChatModels(selector);

      if (models && Array.isArray(models) && models.length > 0) {
        logger.debug('Found VS Code LM models', { count: models.length });
        return models[0];
      }

      logger.warn('No VS Code LM models found, using default model');
      
      // Return a minimal fallback model
      return {
        id: 'default-lm',
        name: 'Default Language Model',
        vendor: 'vscode',
        family: 'lm',
        version: '1.0',
        maxInputTokens: 8192,
        sendRequest: async (
          _messages: vscode.LanguageModelChatMessage[],
          _options?: vscode.LanguageModelChatRequestOptions,
          _token?: vscode.CancellationToken
        ) => {
          return {
            stream: (async function* () {
              yield new vscode.LanguageModelTextPart(
                'Language model functionality is limited. Please check VS Code configuration.'
              );
            })(),
            text: (async function* () {
              yield 'Language model functionality is limited. Please check VS Code configuration.';
            })(),
          };
        },
        countTokens: async () => 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to select VS Code LM model: ${errorMessage}`);
    }
  }

  /**
   * Get the current client, initializing if necessary
   */
  private async getClient(): Promise<vscode.LanguageModelChat> {
    if (!this.client) {
      logger.debug('Getting VS Code LM client');
      try {
        const selector = this.options.vsCodeLmModelSelector || {};
        this.client = await this.createClient(selector);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('VS Code LM client creation failed', { error: message });
        throw new Error(`Failed to create VS Code LM client: ${message}`);
      }
    }

    return this.client;
  }

  /**
   * Count tokens in text or message
   */
  async countTokens(text: string | vscode.LanguageModelChatMessage): Promise<number> {
    if (!this.client) {
      logger.warn('No VS Code LM client available for token counting');
      return 0;
    }

    if (!this.currentRequestCancellation) {
      logger.warn('No cancellation token available for token counting');
      return 0;
    }

    if (!text) {
      return 0;
    }

    try {
      let tokenCount: number;
      
      if (typeof text === 'string') {
        tokenCount = await this.client.countTokens(text, this.currentRequestCancellation.token);
      } else {
        // For chat messages, extract text content
        const content = typeof text.content === 'string' 
          ? text.content 
          : text.content.map((part) => {
              if (part instanceof vscode.LanguageModelTextPart) {
                return part.value;
              }
              return '';
            }).join('');
        
        tokenCount = await this.client.countTokens(content, this.currentRequestCancellation.token);
      }

      if (typeof tokenCount !== 'number' || tokenCount < 0) {
        logger.warn('Invalid token count received', { tokenCount });
        return 0;
      }

      return tokenCount;
    } catch (error) {
      if (error instanceof vscode.CancellationError) {
        logger.debug('Token counting cancelled by user');
        return 0;
      }

      logger.warn('Token counting failed', { error });
      return 0;
    }
  }

  /**
   * Calculate total input tokens for an array of messages
   */
  private async calculateTotalInputTokens(messages: vscode.LanguageModelChatMessage[]): Promise<number> {
    const messageTokens = await Promise.all(messages.map(msg => this.countTokens(msg)));
    return messageTokens.reduce((sum, tokens) => sum + tokens, 0);
  }

  /**
   * Ensure clean state for cancellation tokens
   */
  private ensureCleanState(): void {
    if (this.currentRequestCancellation) {
      this.currentRequestCancellation.cancel();
      this.currentRequestCancellation.dispose();
      this.currentRequestCancellation = null;
    }
  }

  /**
   * Create and stream a message using VS Code LM API
   */
  async *createMessage(
    messages: vscode.LanguageModelChatMessage[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Ensure clean state before starting
    this.ensureCleanState();

    const client = await this.getClient();

    // Initialize cancellation token
    this.currentRequestCancellation = new vscode.CancellationTokenSource();

    // Calculate input tokens
    const totalInputTokens = await this.calculateTotalInputTokens(messages);

    // Accumulate text for final token count
    let accumulatedText = '';

    try {
      const requestOptions: vscode.LanguageModelChatRequestOptions = {
        justification: `VS Code LLM Server is using '${client.name}' from '${client.vendor}'. Click 'Allow' to proceed.`,
      };

      logger.debug('Sending request to VS Code LM', {
        model: client.id,
        messageCount: messages.length,
      });

      const response = await client.sendRequest(
        messages,
        requestOptions,
        this.currentRequestCancellation.token
      );

      // Stream response chunks
      for await (const chunk of response.stream) {
        if (chunk instanceof vscode.LanguageModelTextPart) {
          if (typeof chunk.value !== 'string') {
            logger.warn('Invalid text part value received');
            continue;
          }

          accumulatedText += chunk.value;

          yield {
            type: 'text',
            text: chunk.value,
          };
        } else if (chunk instanceof vscode.LanguageModelToolCallPart) {
          try {
            if (!chunk.name || typeof chunk.name !== 'string') {
              logger.warn('Invalid tool call name received');
              continue;
            }

            if (!chunk.callId || typeof chunk.callId !== 'string') {
              logger.warn('Invalid tool call ID received');
              continue;
            }

            if (!chunk.input || typeof chunk.input !== 'object') {
              logger.warn('Invalid tool call input received');
              continue;
            }

            // Convert tool calls to text format
            const toolCallText = JSON.stringify({
              type: 'tool_call',
              name: chunk.name,
              arguments: chunk.input,
              callId: chunk.callId,
            });

            accumulatedText += toolCallText;

            logger.debug('Processing tool call', {
              name: chunk.name,
              callId: chunk.callId,
            });

            yield {
              type: 'text',
              text: toolCallText,
            };
          } catch (error) {
            logger.error('Failed to process tool call', { error });
            continue;
          }
        } else {
          logger.warn('Unknown chunk type received', { chunk });
        }
      }

      // Count output tokens
      const totalOutputTokens = await this.countTokens(accumulatedText);

      // Report final usage
      yield {
        type: 'usage',
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      };

      logger.debug('Request completed', {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      });
    } catch (error: unknown) {
      this.ensureCleanState();

      if (error instanceof vscode.CancellationError) {
        throw new Error('Request cancelled by user');
      }

      if (error instanceof Error) {
        logger.error('VS Code LM stream error', { error: error.message });
        throw error;
      }

      const errorMessage = String(error);
      logger.error('Unknown VS Code LM stream error', { error: errorMessage });
      throw new Error(`VS Code LM response stream error: ${errorMessage}`);
    }
  }

  /**
   * Get model information
   */
  getModel(): { id: string; vendor: string; family: string; version: string; maxInputTokens: number } | null {
    if (this.client) {
      return {
        id: this.client.id,
        vendor: this.client.vendor,
        family: this.client.family,
        version: this.client.version,
        maxInputTokens: this.client.maxInputTokens,
      };
    }

    return null;
  }

  /**
   * List all available models
   */
  async listModels(): Promise<Array<{ id: string; vendor: string; family: string; version: string; maxInputTokens: number }>> {
    try {
      const models = await vscode.lm.selectChatModels({});
      return models.map((model: vscode.LanguageModelChat) => ({
        id: model.id,
        vendor: model.vendor,
        family: model.family,
        version: model.version,
        maxInputTokens: model.maxInputTokens,
      }));
    } catch (error) {
      logger.error('Failed to list VS Code LM models', { error });
      return [];
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }

    if (this.currentRequestCancellation) {
      this.currentRequestCancellation.cancel();
      this.currentRequestCancellation.dispose();
      this.currentRequestCancellation = null;
    }

    logger.debug('VsCodeLmHandler disposed');
  }
}

