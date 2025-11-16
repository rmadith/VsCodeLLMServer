/**
 * Configuration management for the VS Code LLM Server
 */

import * as vscode from 'vscode';
import { ServerConfig } from '../models/types';

/**
 * Get server configuration from VS Code settings and environment variables
 */
export function getServerConfig(): ServerConfig {
  const config = vscode.workspace.getConfiguration('vscodellmserver');

  // Environment variables can override settings
  const port = parseInt(process.env.VSCODE_LLM_SERVER_PORT || '') || config.get<number>('port', 3000);
  const host = process.env.VSCODE_LLM_SERVER_HOST || config.get<string>('host', '127.0.0.1');

  return {
    port,
    host,
    enableAuth: config.get<boolean>('enableAuth', true),
    enableOpenAI: config.get<boolean>('enableOpenAI', true),
    enableAnthropic: config.get<boolean>('enableAnthropic', true),
    rateLimit: config.get<number>('rateLimit', 60),
    corsOrigins: config.get<string[]>('corsOrigins', ['http://localhost:*']),
    logLevel: config.get<'debug' | 'info' | 'warn' | 'error'>('logLevel', 'info'),
    modelSelector: config.get('modelSelector', {}),
  };
}

/**
 * Get API key from secret storage or environment variable
 */
export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  // Check environment variable first
  const envApiKey = process.env.VSCODE_LLM_SERVER_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }

  // Check secret storage
  const secretKey = await context.secrets.get('vscodellmserver.apiKey');
  return secretKey;
}

/**
 * Set API key in secret storage
 */
export async function setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
  await context.secrets.store('vscodellmserver.apiKey', apiKey);
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): string[] {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }

  if (config.rateLimit < 0) {
    errors.push('Rate limit must be non-negative (0 to disable)');
  }

  return errors;
}

