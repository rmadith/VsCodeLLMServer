# Utils Module

This directory contains utility functions for logging, configuration, and streaming.

## Files

### `logger.ts`

Structured logging utility with configurable log levels.

**Class: Logger**

Singleton logger instance.

**Log Levels**:
- `debug` - Detailed debugging information
- `info` - Normal operational messages
- `warn` - Warning messages
- `error` - Error messages

**Methods**:

**`setLogLevel(level: LogLevel)`**
Sets the minimum log level.

**`debug(message: string, context?: LogContext)`**
Logs debug-level message.

**`info(message: string, context?: LogContext)`**
Logs info-level message.

**`warn(message: string, context?: LogContext)`**
Logs warning message.

**`error(message: string, context?: LogContext)`**
Logs error message.

**`logRequest(method, path, requestId, statusCode?)`**
Logs HTTP request/response.

**`logError(error: Error, requestId?)`**
Logs error with context.

**Usage**:
```typescript
import { logger } from '../utils/logger';

// Set log level
logger.setLogLevel('debug');

// Log messages
logger.info('Server started', { port: 3000 });
logger.error('Request failed', { requestId: '123', error: err.message });

// Log requests
logger.logRequest('POST', '/v1/chat/completions', 'req-123');
logger.logRequest('POST', '/v1/chat/completions', 'req-123', 200);

// Log errors
logger.logError(error, 'req-123');
```

**Best Practices**:
- Never log sensitive data (API keys, passwords)
- Include request ID in context
- Use appropriate log level
- Provide useful context
- Keep messages concise

### `config.ts`

Configuration management for the extension.

**Functions**:

**`getServerConfig(): ServerConfig`**

Gets complete server configuration from VS Code settings and environment variables.

**Priority**:
1. Environment variables
2. VS Code settings
3. Defaults

**Returns**:
```typescript
interface ServerConfig {
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
```

**`getApiKey(context): Promise<string | undefined>`**

Gets API key from environment variable or VS Code SecretStorage.

**Priority**:
1. `VSCODE_LLM_SERVER_API_KEY` environment variable
2. VS Code SecretStorage

**`setApiKey(context, apiKey): Promise<void>`**

Stores API key in VS Code SecretStorage (encrypted).

**`validateConfig(config): string[]`**

Validates configuration and returns array of error messages.

**Validations**:
- Port: 1-65535
- Rate limit: non-negative
- (Add more as needed)

**Usage**:
```typescript
import { getServerConfig, getApiKey, validateConfig } from '../utils/config';

// Get config
const config = getServerConfig();

// Validate
const errors = validateConfig(config);
if (errors.length > 0) {
  console.error('Config errors:', errors);
}

// Get API key
const apiKey = await getApiKey(context);

// Set API key
await setApiKey(context, 'new-key');
```

### `streaming.ts`

Server-Sent Events (SSE) streaming utilities.

**Functions**:

**`initSSE(res: Response)`**

Initializes SSE response with proper headers.

Sets:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

**`sendSSE(res: Response, data: string, event?: string)`**

Sends SSE data chunk.

Format:
```
event: <event_name>
data: <data>

```

**`sendOpenAIChunk(res: Response, data: any)`**

Sends OpenAI-style SSE chunk (JSON data).

**`sendOpenAIDone(res: Response)`**

Sends OpenAI-style done message: `data: [DONE]`

**`sendAnthropicEvent(res: Response, event: string, data: any)`**

Sends Anthropic-style event with event type.

**`closeSSE(res: Response)`**

Closes SSE connection properly.

**`handleSSEError(res: Response, error: Error, apiType)`**

Handles errors during SSE streaming and closes connection.

**Usage**:

**OpenAI Streaming**:
```typescript
import { 
  initSSE, 
  sendOpenAIChunk, 
  sendOpenAIDone, 
  closeSSE 
} from '../utils/streaming';

// Initialize
initSSE(res);

// Send chunks
for await (const chunk of stream) {
  sendOpenAIChunk(res, {
    id: 'chatcmpl-123',
    object: 'chat.completion.chunk',
    created: Date.now(),
    model: 'gpt-4',
    choices: [{ index: 0, delta: { content: chunk.text }, finish_reason: null }]
  });
}

// Send done
sendOpenAIDone(res);

// Close
closeSSE(res);
```

**Anthropic Streaming**:
```typescript
import { 
  initSSE, 
  sendAnthropicEvent, 
  closeSSE 
} from '../utils/streaming';

// Initialize
initSSE(res);

// Send events
sendAnthropicEvent(res, 'message_start', {
  type: 'message_start',
  message: { ... }
});

sendAnthropicEvent(res, 'content_block_delta', {
  type: 'content_block_delta',
  delta: { type: 'text_delta', text: 'Hello' }
});

sendAnthropicEvent(res, 'message_stop', {
  type: 'message_stop'
});

// Close
closeSSE(res);
```

**Error Handling**:
```typescript
try {
  // Streaming logic
} catch (error) {
  handleSSEError(res, error, 'openai');
}
```

## Adding New Utilities

1. **Create Function**:
   ```typescript
   export function utilityFunction(param: Type): ReturnType {
     // Implementation
     return result;
   }
   ```

2. **Add JSDoc**:
   ```typescript
   /**
    * Description of function
    * 
    * @param param - Description
    * @returns Description
    * 
    * @example
    * ```typescript
    * const result = utilityFunction(value);
    * ```
    */
   ```

3. **Add Tests**

4. **Document in README**

## Utility Best Practices

### Pure Functions

Prefer pure functions:
```typescript
// Good
export function formatMessage(message: string): string {
  return message.trim().toLowerCase();
}

// Avoid
let state = '';
export function formatMessage(message: string): void {
  state = message.trim();
}
```

### Error Handling

Handle errors gracefully:
```typescript
export function parseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.error('JSON parse error', { error });
    return null;
  }
}
```

### Type Safety

Use TypeScript types:
```typescript
export interface Config {
  port: number;
  host: string;
}

export function getConfig(): Config {
  // Type-safe implementation
}
```

### Documentation

Document all utilities:
- Purpose
- Parameters
- Return value
- Examples
- Edge cases

### Testing

Test all utilities:
- Unit tests for each function
- Test edge cases
- Test error handling
- Test with realistic data

## Common Patterns

### Singleton

```typescript
class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
}

export const logger = Logger.getInstance();
```

### Factory Functions

```typescript
export function createValidator(config: ValidatorConfig) {
  return (data: any): boolean => {
    // Validation logic using config
    return true;
  };
}
```

### Async Utilities

```typescript
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
  throw new Error('Should not reach here');
}
```

