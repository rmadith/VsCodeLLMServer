# Tool Calling / Function Calling

## Overview

The VS Code LLM Server now supports **client-side tool calling** for both OpenAI and Anthropic API formats. This allows external agents and applications to use GitHub Copilot's language models with tool/function calling capabilities.

## How It Works

Tool calling follows the **standard client-side execution pattern**:

1. **Client sends request** with tool definitions and conversation history
2. **Server forwards** the request to GitHub Copilot via VS Code LM API
3. **Model decides** whether to use a tool and returns tool call(s)
4. **Server returns** the tool call request to the client
5. **Client executes** the tool in their environment
6. **Client sends** the tool result back in the next request
7. **Model processes** the result and continues the conversation

```
┌─────────┐         ┌────────────┐         ┌──────────────┐
│ Client  │────1───▶│   Server   │────2───▶│  Copilot LM  │
│         │         │            │         │              │
│         │◀───4────│            │◀───3────│              │
│         │         │            │         │              │
│ Execute │         │            │         │              │
│  Tool   │         │            │         │              │
│         │────5───▶│            │────6───▶│              │
│         │         │            │         │              │
│         │◀───8────│            │◀───7────│              │
└─────────┘         └────────────┘         └──────────────┘
```

## OpenAI Format

### Request with Tools

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in San Francisco?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and state"
              },
              "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"]
              }
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

### Response with Tool Call

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1699999999,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": "{\"location\": \"San Francisco, CA\", \"unit\": \"fahrenheit\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

### Sending Tool Result

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in San Francisco?"
      },
      {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": "{\"location\": \"San Francisco, CA\", \"unit\": \"fahrenheit\"}"
            }
          }
        ]
      },
      {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "content": "{\"temperature\": 72, \"condition\": \"sunny\"}"
      }
    ]
  }'
```

## Anthropic Format

### Request with Tools

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in San Francisco?"
      }
    ],
    "tools": [
      {
        "name": "get_weather",
        "description": "Get the current weather for a location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"]
            }
          },
          "required": ["location"]
        }
      }
    ]
  }'
```

### Response with Tool Use

```json
{
  "id": "msg_01234567",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll check the weather for you."
    },
    {
      "type": "tool_use",
      "id": "toolu_01A2B3C4D5",
      "name": "get_weather",
      "input": {
        "location": "San Francisco, CA",
        "unit": "fahrenheit"
      }
    }
  ],
  "stop_reason": "tool_use"
}
```

### Sending Tool Result

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in San Francisco?"
      },
      {
        "role": "assistant",
        "content": [
          {
            "type": "tool_use",
            "id": "toolu_01A2B3C4D5",
            "name": "get_weather",
            "input": {
              "location": "San Francisco, CA",
              "unit": "fahrenheit"
            }
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "tool_result",
            "tool_use_id": "toolu_01A2B3C4D5",
            "content": "{\"temperature\": 72, \"condition\": \"sunny\"}"
          }
        ]
      }
    ]
  }'
```

## Streaming Support

Both OpenAI and Anthropic formats support **streaming with tool calls**. Tool calls are streamed as they are generated by the model.

### OpenAI Streaming Example

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "What is the weather?"}],
    "tools": [...],
    "stream": true
  }'
```

Stream format:
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{...}"}}]},"finish_reason":null}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{},"finish_reason":"tool_calls"}]}

data: [DONE]
```

### Anthropic Streaming Example

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "What is the weather?"}],
    "tools": [...],
    "stream": true
  }'
```

Stream format:
```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_123","name":"get_weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{...}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":50}}

event: message_stop
data: {"type":"message_stop"}
```

## Implementation Details

### Message Conversion

The server automatically converts between API formats and VS Code LM format:

- **OpenAI `tool` role** → VS Code LM User message with `ToolResultPart`
- **OpenAI `tool_calls`** → VS Code LM `ToolCallPart`
- **Anthropic `tool_use` block** → VS Code LM `ToolCallPart`
- **Anthropic `tool_result` block** → VS Code LM `ToolResultPart`

### VS Code LM API Support

The implementation uses VS Code's native tool calling support:

- `LanguageModelToolCallPart` - Tool calls from the model
- `LanguageModelToolResultPart` - Tool results from the client

### Tool Definitions

**Note:** The VS Code LM API does not currently accept tool definitions in request options. Tool definitions are logged but not passed to the model. The model may still decide to call tools based on conversation context and its training.

## Testing

Test scripts are provided in `tests/manual/`:

```bash
# Test OpenAI format
./tests/manual/openai-tools-test.sh

# Test Anthropic format
./tests/manual/anthropic-tools-test.sh
```

## Security Considerations

### Client-Side Execution

Tool execution happens **on the client side**, which means:

- ✅ **Secure** - No arbitrary code execution on the server
- ✅ **Flexible** - Clients control which tools are available
- ✅ **Context-aware** - Tools have access to client's local environment
- ✅ **Standard** - Follows OpenAI and Anthropic API patterns

### Best Practices

1. **Validate tool results** before sending them back to the model
2. **Sanitize inputs** when executing tools
3. **Rate limit** tool execution to prevent abuse
4. **Log tool calls** for monitoring and debugging
5. **Implement timeouts** for tool execution

## Compatibility

### Supported Features

- ✅ Tool/function definitions
- ✅ Tool calls in responses
- ✅ Tool results in messages
- ✅ Streaming with tool calls
- ✅ Multiple tool calls
- ✅ Multi-turn conversations
- ✅ OpenAI and Anthropic formats

### Unsupported Features

- ❌ Server-side tool execution (by design)
- ❌ Tool definition validation by VS Code LM
- ❌ Automatic tool orchestration

## Use Cases

### Agent Frameworks

Use with popular agent frameworks:

- **LangChain** - Full OpenAI tool calling support
- **AutoGen** - Multi-agent conversations with tools
- **CrewAI** - Tool-equipped agent crews
- **Semantic Kernel** - Function calling plugins

### Custom Applications

Build applications that need:

- **Web scraping** - Tools to fetch and parse web content
- **Database queries** - Tools to read/write databases
- **API integrations** - Tools to call external APIs
- **File operations** - Tools to read/write files
- **Calculations** - Tools for complex computations

## Examples

See `tests/manual/langchain-test.py` for a complete example using LangChain with tools.

## Troubleshooting

### Tool Calls Not Generated

- Check that tool definitions are properly formatted
- Verify the conversation context suggests tool use
- Try being more explicit in the user prompt
- Note: VS Code LM doesn't receive tool definitions directly

### Tool Results Not Processed

- Ensure `tool_call_id` matches the original tool call ID
- Verify tool result is in the correct format
- Check that tool results are in the proper message structure

### Streaming Issues

- Confirm client supports Server-Sent Events (SSE)
- Check for proper Content-Type headers
- Verify no proxy buffering is interfering

## References

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use](https://docs.anthropic.com/claude/docs/tool-use)
- [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)

