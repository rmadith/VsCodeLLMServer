#!/bin/bash

# Streaming Test Script
# Usage: ./test-streaming.sh
# Tests Server-Sent Events (SSE) streaming for both APIs

API_KEY="${VSCODE_LLM_SERVER_API_KEY:-test-key}"
BASE_URL="${VSCODE_LLM_SERVER_URL:-http://localhost:3000}"

echo "Testing SSE Streaming..."
echo "Base URL: $BASE_URL"
echo ""

# Test 1: OpenAI Streaming
echo "=== Test 1: OpenAI Streaming Chat Completion ==="
echo "Should receive multiple chunks followed by [DONE]"
echo ""

curl -s -N "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Write a haiku about coding"}
    ],
    "stream": true,
    "max_tokens": 100
  }' 

echo ""
echo ""

# Test 2: Anthropic Streaming
echo "=== Test 2: Anthropic Streaming Messages ==="
echo "Should receive message_start, content_block_start, content_block_delta events, etc."
echo ""

curl -s -N "${BASE_URL}/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3",
    "messages": [
      {"role": "user", "content": "Write a haiku about coding"}
    ],
    "max_tokens": 100,
    "stream": true
  }'

echo ""
echo ""

# Test 3: Long-running Stream
echo "=== Test 3: Long-running OpenAI Stream ==="
echo "Should stream a longer response"
echo ""

curl -s -N "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Explain what TypeScript is in 3 paragraphs"}
    ],
    "stream": true,
    "max_tokens": 300
  }'

echo ""
echo ""

echo "All streaming tests completed!"
echo ""
echo "Note: Check that:"
echo "- Chunks arrive incrementally (not all at once)"
echo "- OpenAI streams end with 'data: [DONE]'"
echo "- Anthropic streams have proper event types"
echo "- No buffering delays"

