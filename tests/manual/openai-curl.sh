#!/bin/bash

# OpenAI API Manual Test Scripts
# Usage: ./openai-curl.sh
# Make sure server is running on localhost:3000

API_KEY="${VSCODE_LLM_SERVER_API_KEY:-test-key}"
BASE_URL="${VSCODE_LLM_SERVER_URL:-http://localhost:3000}"

echo "Testing OpenAI-compatible endpoints..."
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Health Check
echo "=== Test 1: Health Check ==="
curl -s "${BASE_URL}/health" | jq '.'
echo ""
echo ""

# Test 2: List Models
echo "=== Test 2: List Models ==="
curl -s "${BASE_URL}/v1/models" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.'
echo ""
echo ""

# Test 3: Chat Completion (Non-streaming)
echo "=== Test 3: Chat Completion (Non-streaming) ==="
curl -s "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Say hello in one sentence"}
    ],
    "temperature": 0.7,
    "max_tokens": 50
  }' | jq '.'
echo ""
echo ""

# Test 4: Chat Completion (Streaming)
echo "=== Test 4: Chat Completion (Streaming) ==="
curl -s -N "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Count from 1 to 5"}
    ],
    "stream": true
  }'
echo ""
echo ""

# Test 5: Legacy Completion
echo "=== Test 5: Legacy Completion (Non-streaming) ==="
curl -s "${BASE_URL}/v1/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "prompt": "Say hello in one sentence",
    "max_tokens": 50
  }' | jq '.'
echo ""
echo ""

# Test 6: Invalid Request (Missing model)
echo "=== Test 6: Invalid Request (Missing model) ==="
curl -s "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }' | jq '.'
echo ""
echo ""

# Test 7: Invalid Request (Empty messages)
echo "=== Test 7: Invalid Request (Empty messages) ==="
curl -s "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4",
    "messages": []
  }' | jq '.'
echo ""
echo ""

# Test 8: Authentication Error (Missing API key)
echo "=== Test 8: Authentication Error (Missing API key) ==="
curl -s "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }' | jq '.'
echo ""
echo ""

# Test 9: Authentication Error (Invalid API key)
echo "=== Test 9: Authentication Error (Invalid API key) ==="
curl -s "${BASE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-key-12345" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }' | jq '.'
echo ""
echo ""

# Test 10: 404 Error
echo "=== Test 10: 404 Error ==="
curl -s "${BASE_URL}/v1/nonexistent" \
  -H "Authorization: Bearer ${API_KEY}" | jq '.'
echo ""
echo ""

echo "All tests completed!"

