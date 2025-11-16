# Handlers Module

This directory contains format converters and the VS Code LM adapter.

## Architecture

```
API Request → Handler (Format Converter) → VsCodeLmHandler → vscode.lm API → GitHub Copilot
```

Handlers translate between standard API formats (OpenAI, Anthropic) and VS Code's Language Model API.

## Files

### `vsCodeLmHandler.ts`

Adapter for VS Code Language Model API.

**Class: VsCodeLmHandler**

Manages interaction with vscode.lm API.

**Responsibilities**:
- Initialize and manage vscode.lm client
- Handle request lifecycle
- Streaming response management
- Token counting
- Error handling
- Resource cleanup

**Key Methods**:
```typescript
async initializeClient(): Promise<void>
async countTokens(text: string | vscode.LanguageModelChatMessage): Promise<number>
async *createMessage(messages: vscode.LanguageModelChatMessage[]): AsyncGenerator<StreamChunk>
getModel(): ModelInfo | null
async listModels(): Promise<ModelInfo[]>
dispose(): void
```

**Stream Chunks**:
- `TextChunk` - Content delta
- `UsageChunk` - Token usage info

### `openaiHandler.ts`

Converts between OpenAI API format and VS Code LM format.

**Functions**:

**`convertToVsCodeLmMessages(messages: ChatMessage[])`**
- Converts OpenAI messages to VS Code LM messages
- Maps roles (system → assistant, user → user)
- Extracts text from multimodal content
- Returns array of `vscode.LanguageModelChatMessage`

**`handleChatCompletion(request, handler, requestId)`**
- Non-streaming chat completion
- Returns complete `ChatCompletionResponse`

**`handleStreamingChatCompletion(request, handler, requestId, res)`**
- Streaming chat completion
- Sends Server-Sent Events (SSE)
- Returns chunks with deltas
- Sends `[DONE]` at end

**`handleCompletion(prompt, model, handler, requestId)`**
- Legacy completion endpoint
- Converts to chat format internally

**`handleStreamingCompletion(prompt, model, handler, requestId, res)`**
- Legacy streaming completion
- Converts to chat format internally

**Supported Parameters**:
- `messages`, `model`, `temperature`, `max_tokens`, `top_p`, `stop`, `stream`, `n` (=1), `user`, `response_format`

**Unsupported** (warnings logged):
- `frequency_penalty`, `presence_penalty`, `logprobs`, `top_logprobs`, `seed`

### `anthropicHandler.ts`

Converts between Anthropic API format and VS Code LM format.

**Functions**:

**`extractSystemPrompt(system?: SystemPrompt)`**
- Extracts system prompt as string
- Handles string or array format

**`extractMessageContent(content: string | ContentBlock[])`**
- Extracts text from content blocks
- Handles string or array format

**`convertToVsCodeLmMessages(messages, system?)`**
- Converts Anthropic messages to VS Code LM messages
- Prepends system prompt as assistant message
- Maps roles (assistant → assistant, user → user)

**`handleMessages(request, handler, requestId)`**
- Non-streaming messages request
- Returns complete `MessagesResponse`

**`handleStreamingMessages(request, handler, requestId, res)`**
- Streaming messages request
- Sends Server-Sent Events with event types:
  - `message_start`
  - `content_block_start`
  - `content_block_delta`
  - `content_block_stop`
  - `message_delta`
  - `message_stop`

**Supported Parameters**:
- `model`, `messages`, `system`, `max_tokens`, `temperature`, `top_p`, `top_k`, `stop_sequences`, `stream`, `metadata`

## Adding a New Provider

To add a new API provider (e.g., Google Gemini):

1. **Create Types** (`src/models/geminiTypes.ts`):
   ```typescript
   export interface GeminiRequest { ... }
   export interface GeminiResponse { ... }
   ```

2. **Create Handler** (`src/handlers/geminiHandler.ts`):
   ```typescript
   export function convertToVsCodeLmMessages(messages: GeminiMessage[]) { ... }
   export async function handleGemini(request, handler, requestId) { ... }
   export async function handleStreamingGemini(request, handler, requestId, res) { ... }
   ```

3. **Add Route** (in `src/extension/server.ts`):
   ```typescript
   this.app.post('/v1/gemini', async (req, res) => {
     // Handle request
   });
   ```

4. **Add Validation** (in `src/middleware/validator.ts`):
   ```typescript
   export function validateGeminiRequest(req, res, next) { ... }
   ```

5. **Update Documentation**

## Conversion Best Practices

### Role Mapping

Map roles appropriately:
- System prompts → Assistant messages (VS Code LM format)
- User messages → User messages
- Assistant messages → Assistant messages

### Content Extraction

For multimodal content:
- Extract text parts
- Log warnings for unsupported types (images, etc.)
- Join multiple text parts

### Parameter Mapping

Map parameters to VS Code LM capabilities:
- Note which parameters are supported
- Log warnings for unsupported parameters
- Use sensible defaults

### Error Handling

- Catch and handle all errors
- Log with request ID
- Return API-appropriate error format
- Don't expose internal details

### Streaming

- Initialize SSE properly
- Send chunks in correct format
- Handle cancellation
- Close stream properly
- Send final usage information

## Testing Handlers

### Unit Tests

Test conversion functions:
```typescript
test('converts OpenAI messages to VS Code LM', () => {
  const openaiMessages = [
    { role: 'user', content: 'Hello' }
  ];
  const vsCodeMessages = convertToVsCodeLmMessages(openaiMessages);
  expect(vsCodeMessages).toHaveLength(1);
  expect(vsCodeMessages[0].role).toBe(vscode.LanguageModelChatMessageRole.User);
});
```

### Integration Tests

Test with mocked VsCodeLmHandler:
```typescript
test('handles chat completion', async () => {
  const mockHandler = createMockHandler();
  const response = await handleChatCompletion(request, mockHandler, 'test-id');
  expect(response.choices).toHaveLength(1);
  expect(response.usage).toBeDefined();
});
```

### Manual Tests

Use curl to test endpoints:
```bash
# OpenAI chat completion
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hi"}]}'

# Anthropic messages
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: test" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude", "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 1024}'
```

## Performance Considerations

### Token Counting

- Token counting can be slow
- Count in parallel when possible
- Cache counts for repeated messages
- Use estimates for very long texts

### Streaming

- Start streaming immediately
- Flush chunks as received
- Don't buffer unnecessarily
- Handle backpressure

### Memory

- Don't accumulate all text before returning
- Stream through, don't store
- Clean up resources promptly
- Cancel operations on errors

