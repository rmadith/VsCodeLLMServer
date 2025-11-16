#!/bin/bash

# Anthropic API Manual Test Scripts
# Usage: ./anthropic-curl.sh
# Make sure server is running on localhost:3000

API_KEY="${VSCODE_LLM_SERVER_API_KEY:-test-key}"
BASE_URL="${VSCODE_LLM_SERVER_URL:-http://localhost:3000}"
ANTHROPIC_VERSION="2023-06-01"

echo "Testing Anthropic-compatible endpoints..."
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Messages (Non-streaming)
echo "=== Test 1: Messages (Non-streaming) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Say hello in one sentence"}
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }' | jq '.'
echo ""
echo ""

# Test 2: Messages with System Prompt (Non-streaming)
echo "=== Test 2: Messages with System Prompt (Non-streaming) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "system": "You are a helpful assistant.",
    "messages": [
      {"role": "user", "content": "What is TypeScript?"}
    ],
    "max_tokens": 200
  }' | jq '.'
echo ""
echo ""

# Test 3: Messages (Streaming)
echo "=== Test 3: Messages (Streaming) ==="
curl -s -N "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Count from 1 to 5"}
    ],
    "max_tokens": 100,
    "stream": true
  }'
echo ""
echo ""

# Test 4: Messages with top_k and top_p
echo "=== Test 4: Messages with top_k and top_p ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Tell me a short joke"}
    ],
    "max_tokens": 150,
    "temperature": 0.8,
    "top_p": 0.9,
    "top_k": 50
  }' | jq '.'
echo ""
echo ""

# Test 5: Messages with stop_sequences
echo "=== Test 5: Messages with stop_sequences ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "List three colors: red,"}
    ],
    "max_tokens": 100,
    "stop_sequences": [",", "."]
  }' | jq '.'
echo ""
echo ""

# Test 6: Invalid Request (Missing max_tokens)
echo "=== Test 6: Invalid Request (Missing max_tokens) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }' | jq '.'
echo ""
echo ""

# Test 7: Invalid Request (Empty messages)
echo "=== Test 7: Invalid Request (Empty messages) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [],
    "max_tokens": 100
  }' | jq '.'
echo ""
echo ""

# Test 8: Invalid Request (max_tokens out of range)
echo "=== Test 8: Invalid Request (max_tokens out of range) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 10000
  }' | jq '.'
echo ""
echo ""

# Test 9: Authentication Error (Missing API key)
echo "=== Test 9: Authentication Error (Missing API key) ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: ${ANTHROPIC_VERSION}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }' | jq '.'
echo ""
echo ""

# Test 10: Missing anthropic-version header
echo "=== Test 10: Missing anthropic-version header ==="
curl -s "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }' | jq '.'
echo ""
echo ""

echo "All tests completed!"

