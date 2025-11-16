/**
 * Shared types and interfaces for the VS Code LLM Server
 */

import * as vscode from 'vscode';

/**
 * Base configuration options
 */
export interface ServerConfig {
  port: number;
  host: string;
  enableAuth: boolean;
  enableOpenAI: boolean;
  enableAnthropic: boolean;
  rateLimit: number;
  corsOrigins: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  modelSelector: vscode.LanguageModelChatSelector;
}

/**
 * Request context for tracking and logging
 */
export interface RequestContext {
  id: string;
  apiType: 'openai' | 'anthropic';
  startTime: number;
  userId?: string;
}

/**
 * Usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Generic API error
 */
export interface ApiError {
  message: string;
  type: string;
  code?: string;
}

/**
 * Stream chunk types
 */
export type StreamChunk = TextChunk | ToolCallChunk | UsageChunk;

export interface TextChunk {
  type: 'text';
  text: string;
}

export interface ToolCallChunk {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface UsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
}

/**
 * VS Code LM Handler options
 */
export interface VsCodeLmHandlerOptions {
  vsCodeLmModelSelector?: vscode.LanguageModelChatSelector;
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  vendor: string;
  family: string;
  version: string;
  maxInputTokens: number;
}

