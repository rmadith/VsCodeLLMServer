/**
 * OpenAI API types based on official specification
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Message content - can be string or array of content parts
 */
export type MessageContent = string | ContentPart[];

/**
 * Content part for multimodal messages
 */
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Message object in the conversation
 */
export interface ChatMessage {
  role: MessageRole;
  content: MessageContent;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * Tool call in assistant message
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Response format specification
 */
export interface ResponseFormat {
  type: 'text' | 'json_object';
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  user?: string;
  response_format?: ResponseFormat;
  seed?: number;
  logprobs?: boolean;
  top_logprobs?: number;
}

/**
 * Legacy completion request
 */
export interface CompletionRequest {
  prompt: string | string[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  n?: number;
  user?: string;
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

/**
 * Streaming chunk delta
 */
export interface ChatCompletionDelta {
  role?: MessageRole;
  content?: string;
  tool_calls?: Partial<ToolCall>[];
}

/**
 * Streaming chunk choice
 */
export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionDelta;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

/**
 * Chat completion streaming chunk
 */
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  system_fingerprint?: string;
}

/**
 * Model information
 */
export interface Model {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

/**
 * Models list response
 */
export interface ModelsResponse {
  object: 'list';
  data: Model[];
}

/**
 * OpenAI API error response
 */
export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
    param?: string;
  };
}

