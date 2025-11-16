#!/bin/bash

# Anthropic Tool Use Test Script
# Tests the tool use functionality with Anthropic API format

API_KEY="${API_KEY:-test-api-key}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Anthropic Tool Use Test ==="
echo "Testing tool use with VS Code LLM Server"
echo ""

# Test 1: Simple tool use request
echo "Test 1: Request with tool definitions"
echo "--------------------------------------"
curl -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
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
    ]
  }'
echo -e "\n\n"

# Test 2: Multi-turn conversation with tool result
echo "Test 2: Multi-turn with tool result"
echo "------------------------------------"
curl -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
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
            "type": "text",
            "text": "I will check the weather for you."
          },
          {
            "type": "tool_use",
            "id": "toolu_123",
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
            "tool_use_id": "toolu_123",
            "content": "{\"temperature\": 72, \"condition\": \"sunny\", \"humidity\": 65}"
          }
        ]
      }
    ]
  }'
echo -e "\n\n"

# Test 3: Streaming with tools
echo "Test 3: Streaming with tool definitions"
echo "----------------------------------------"
curl -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Calculate 25 * 4 + 10"
      }
    ],
    "tools": [
      {
        "name": "calculate",
        "description": "Perform mathematical calculations",
        "input_schema": {
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
    ],
    "stream": true
  }'
echo -e "\n\n"

# Test 4: Tool choice specification
echo "Test 4: Specific tool choice"
echo "-----------------------------"
curl -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "What is 2+2?"
      }
    ],
    "tools": [
      {
        "name": "calculate",
        "description": "Perform mathematical calculations",
        "input_schema": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string"
            }
          },
          "required": ["expression"]
        }
      }
    ],
    "tool_choice": {
      "type": "tool",
      "name": "calculate"
    }
  }'
echo -e "\n\n"

# Test 5: Multiple tools
echo "Test 5: Multiple tool definitions"
echo "----------------------------------"
curl -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "What is the weather in Paris and what time is it there?"
      }
    ],
    "tools": [
      {
        "name": "get_weather",
        "description": "Get weather for a location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {"type": "string"}
          },
          "required": ["location"]
        }
      },
      {
        "name": "get_time",
        "description": "Get current time for a location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {"type": "string"}
          },
          "required": ["location"]
        }
      }
    ]
  }'
echo -e "\n\n"

echo "=== Tests Complete ==="
echo ""
echo "Note: Actual tool execution happens on the client side."
echo "The server passes through tool definitions and handles tool use responses."

