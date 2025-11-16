/**
 * Anthropic API types based on official specification
 */

/**
 * Message role
 */
export type AnthropicRole = 'user' | 'assistant';

/**
 * Content block types
 */
export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

/**
 * Text content block
 */
export interface TextBlock {
  type: 'text';
  text: string;
}

/**
 * Image content block
 */
export interface ImageBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: string;
    data: string;
  };
}

/**
 * Tool use block - when model wants to use a tool
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool result block - result from tool execution
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

/**
 * Message in conversation
 */
export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | ContentBlock[];
}

/**
 * System prompt - can be string or array
 */
export type SystemPrompt = string | SystemBlock[];

export interface SystemBlock {
  type: 'text';
  text: string;
}

/**
 * Metadata for tracking
 */
export interface Metadata {
  user_id?: string;
  [key: string]: any;
}

/**
 * Tool input schema
 */
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * Tool definition
 */
export interface Tool {
  name: string;
  description?: string;
  input_schema: ToolInputSchema;
}

/**
 * Tool choice configuration
 */
export type ToolChoice = 
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

/**
 * Messages API request
 */
export interface MessagesRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: SystemPrompt;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  metadata?: Metadata;
  // Tool use support
  tools?: Tool[];
  tool_choice?: ToolChoice;
}

/**
 * Stop reason
 */
export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;

/**
 * Usage information
 */
export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Messages API response
 */
export interface MessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: StopReason;
  stop_sequence?: string | null;
  usage: Usage;
}

/**
 * Streaming event types
 */
export type StreamEvent = 
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | PingEvent
  | ErrorEvent;

/**
 * Message start event
 */
export interface MessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: [];
    model: string;
    stop_reason: null;
    stop_sequence: null;
    usage: Usage;
  };
}

/**
 * Content block start event
 */
export interface ContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text';
    text: string;
  };
}

/**
 * Content block delta event
 */
export interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta';
    text: string;
  };
}

/**
 * Content block stop event
 */
export interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

/**
 * Message delta event
 */
export interface MessageDeltaEvent {
  type: 'message_delta';
  delta: {
    stop_reason: StopReason;
    stop_sequence?: string | null;
  };
  usage: {
    output_tokens: number;
  };
}

/**
 * Message stop event
 */
export interface MessageStopEvent {
  type: 'message_stop';
}

/**
 * Ping event
 */
export interface PingEvent {
  type: 'ping';
}

/**
 * Error event
 */
export interface ErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * Anthropic API error response
 */
export interface AnthropicError {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

