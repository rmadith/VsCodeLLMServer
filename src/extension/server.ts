/**
 * HTTP Server Implementation
 * Exposes OpenAI and Anthropic-compatible endpoints
 */

import * as vscode from 'vscode';
import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'http';

import { ServerConfig } from '../models/types';
import { Model, ModelsResponse } from '../models/openaiTypes';
import { VsCodeLmHandler } from '../handlers/vsCodeLmHandler';
import {
  handleChatCompletion,
  handleStreamingChatCompletion,
  handleCompletion,
  handleStreamingCompletion,
} from '../handlers/openaiHandler';
import {
  handleMessages,
  handleStreamingMessages,
} from '../handlers/anthropicHandler';
import { createAuthMiddleware } from '../middleware/auth';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import { validateOpenAIRequest, validateAnthropicRequest } from '../middleware/validator';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * LLM Server class
 */
export class LLMServer implements vscode.Disposable {
  private app: Application;
  private server: Server | null = null;
  private handler: VsCodeLmHandler;
  private config: ServerConfig;
  private context: vscode.ExtensionContext;
  private apiKey: string | undefined;

  constructor(handler: VsCodeLmHandler, config: ServerConfig, context: vscode.ExtensionContext, apiKey?: string) {
    this.handler = handler;
    this.config = config;
    this.context = context;
    this.apiKey = apiKey;
    this.app = express();

    // Set log level
    logger.setLogLevel(config.logLevel);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
    }));

    // Body parser
    this.app.use(express.json({ limit: '10mb' }));

    // Request ID generation
    this.app.use((req, _res, next) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = uuidv4();
      }
      next();
    });

    // Logging
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] as string;
      logger.logRequest(req.method, req.path, requestId);

      // Log response status
      res.on('finish', () => {
        logger.logRequest(req.method, req.path, requestId, res.statusCode);
      });

      next();
    });

    // Authentication
    this.app.use(createAuthMiddleware({
      enableAuth: this.config.enableAuth,
      apiKey: this.apiKey,
    }));

    // Rate limiting
    this.app.use(createRateLimitMiddleware({
      rateLimit: this.config.rateLimit,
    }));
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      });
    });

    // Models endpoints
    this.app.get('/v1/models', async (_req: Request, res: Response) => {
      try {
        const models = await this.handler.listModels();
        const modelList: Model[] = models.map(model => ({
          id: model.id,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: model.vendor,
        }));

        const response: ModelsResponse = {
          object: 'list',
          data: modelList,
        };

        res.json(response);
      } catch (error) {
        logger.error('Failed to list models', { error });
        res.status(500).json({
          error: {
            message: 'Failed to list models',
            type: 'api_error',
            code: 'internal_error',
          },
        });
      }
    });

    this.app.get('/v1/models/:model', async (req: Request, res: Response) => {
      const modelInfo = this.handler.getModel();
      
      if (!modelInfo) {
        res.status(404).json({
          error: {
            message: 'Model not found',
            type: 'invalid_request_error',
            code: 'model_not_found',
          },
        });
        return;
      }

      const model: Model = {
        id: modelInfo.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: modelInfo.vendor,
      };

      res.json(model);
    });

    // OpenAI endpoints
    if (this.config.enableOpenAI) {
      this.app.post('/v1/chat/completions', validateOpenAIRequest, async (req: Request, res: Response) => {
        const requestId = req.headers['x-request-id'] as string;
        
        try {
          if (req.body.stream) {
            await handleStreamingChatCompletion(req.body, this.handler, requestId, res);
          } else {
            const response = await handleChatCompletion(req.body, this.handler, requestId);
            res.json(response);
          }
        } catch (error) {
          if (!res.headersSent) {
            throw error;
          }
        }
      });

      this.app.post('/v1/completions', async (req: Request, res: Response) => {
        const requestId = req.headers['x-request-id'] as string;
        const { prompt, model, stream } = req.body;

        if (!prompt || !model) {
          res.status(400).json({
            error: {
              message: 'prompt and model are required',
              type: 'invalid_request_error',
              code: 'invalid_request',
            },
          });
          return;
        }

        try {
          if (stream) {
            await handleStreamingCompletion(prompt, model, this.handler, requestId, res);
          } else {
            const response = await handleCompletion(prompt, model, this.handler, requestId);
            res.json(response);
          }
        } catch (error) {
          if (!res.headersSent) {
            throw error;
          }
        }
      });
    }

    // Anthropic endpoints
    if (this.config.enableAnthropic) {
      this.app.post('/v1/messages', validateAnthropicRequest, async (req: Request, res: Response) => {
        const requestId = req.headers['x-request-id'] as string;

        // Check anthropic-version header
        const anthropicVersion = req.headers['anthropic-version'] as string;
        if (!anthropicVersion) {
          res.status(400).json({
            type: 'error',
            error: {
              type: 'invalid_request_error',
              message: 'anthropic-version header is required',
            },
          });
          return;
        }

        try {
          if (req.body.stream) {
            await handleStreamingMessages(req.body, this.handler, requestId, res);
          } else {
            const response = await handleMessages(req.body, this.handler, requestId);
            res.json(response);
          }
        } catch (error) {
          if (!res.headersSent) {
            throw error;
          }
        }
      });
    }

    // 404 handler
    this.app.use(notFoundHandler);

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.server) {
      logger.warn('Server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          logger.info(`VS Code LLM Server started`, {
            host: this.config.host,
            port: this.config.port,
            openai: this.config.enableOpenAI,
            anthropic: this.config.enableAnthropic,
          });
          
          vscode.window.showInformationMessage(
            `VS Code LLM Server running on ${this.config.host}:${this.config.port}`
          );
          
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('Server error', { error: error.message });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start server', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      logger.warn('Server is not running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          logger.error('Error stopping server', { error: error.message });
          reject(error);
        } else {
          logger.info('VS Code LLM Server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Restart the server
   */
  async restart(): Promise<void> {
    logger.info('Restarting VS Code LLM Server');
    await this.stop();
    await this.start();
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.server) {
      this.stop().catch(error => {
        logger.error('Error during disposal', { error });
      });
    }
  }
}

