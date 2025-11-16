#!/bin/bash

# OpenAI Tool Calling Test Script
# Tests the tool calling functionality with OpenAI API format

API_KEY="${API_KEY:-test-api-key}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== OpenAI Tool Calling Test ==="
echo "Testing tool calling with VS Code LLM Server"
echo ""

# Test 1: Simple tool call request
echo "Test 1: Request with tool definitions"
echo "--------------------------------------"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
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
                "description": "The city and state, e.g. San Francisco, CA"
              },
              "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "The temperature unit"
              }
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
echo -e "\n\n"

# Test 2: Multi-turn conversation with tool result
echo "Test 2: Multi-turn with tool result"
echo "------------------------------------"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
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
            "id": "call_123",
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
        "tool_call_id": "call_123",
        "content": "{\"temperature\": 72, \"condition\": \"sunny\", \"humidity\": 65}"
      }
    ]
  }'
echo -e "\n\n"

# Test 3: Streaming with tools
echo "Test 3: Streaming with tool definitions"
echo "----------------------------------------"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Calculate 25 * 4 + 10"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "calculate",
          "description": "Perform mathematical calculations",
          "parameters": {
            "type": "object",
            "properties": {
              "expression": {
                "type": "string",
                "description": "The mathematical expression to evaluate"
              }
            },
            "required": ["expression"]
          }
        }
      }
    ],
    "stream": true
  }'
echo -e "\n\n"

# Test 4: Legacy function calling (deprecated but still supported)
echo "Test 4: Legacy function calling format"
echo "---------------------------------------"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Search for information about artificial intelligence"
      }
    ],
    "functions": [
      {
        "name": "search",
        "description": "Search for information",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The search query"
            }
          },
          "required": ["query"]
        }
      }
    ],
    "function_call": "auto"
  }'
echo -e "\n\n"

echo "=== Tests Complete ==="
echo ""
echo "Note: Actual tool execution happens on the client side."
echo "The server passes through tool definitions and handles tool call responses."

