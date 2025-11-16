#!/usr/bin/env python3
"""
LangChain Integration Test
Tests VS Code LLM Server with LangChain

Requirements:
    pip install langchain openai

Usage:
    export VSCODE_LLM_SERVER_API_KEY=test-key
    python langchain-test.py
"""

import os
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

# Configuration
API_KEY = os.getenv("VSCODE_LLM_SERVER_API_KEY", "test-key")
BASE_URL = os.getenv("VSCODE_LLM_SERVER_URL", "http://localhost:3000/v1")

print("Testing VS Code LLM Server with LangChain...")
print(f"Base URL: {BASE_URL}")
print()

# Initialize LangChain with custom base URL
llm = ChatOpenAI(
    openai_api_base=BASE_URL,
    openai_api_key=API_KEY,
    model="gpt-4",
    temperature=0.7,
)

# Test 1: Simple completion
print("=== Test 1: Simple Completion ===")
try:
    messages = [
        SystemMessage(content="You are a helpful assistant."),
        HumanMessage(content="Say hello in one sentence"),
    ]
    response = llm(messages)
    print(f"Response: {response.content}")
    print()
except Exception as e:
    print(f"Error: {e}")
    print()

# Test 2: Streaming
print("=== Test 2: Streaming Completion ===")
try:
    llm_streaming = ChatOpenAI(
        openai_api_base=BASE_URL,
        openai_api_key=API_KEY,
        model="gpt-4",
        temperature=0.7,
        streaming=True,
    )
    
    messages = [HumanMessage(content="Count from 1 to 5")]
    
    print("Streaming response: ", end="", flush=True)
    for chunk in llm_streaming.stream(messages):
        print(chunk.content, end="", flush=True)
    print()
    print()
except Exception as e:
    print(f"Error: {e}")
    print()

# Test 3: Question answering
print("=== Test 3: Question Answering ===")
try:
    messages = [
        SystemMessage(content="You are a programming expert."),
        HumanMessage(content="What is the difference between const and let in JavaScript?"),
    ]
    response = llm(messages)
    print(f"Response: {response.content}")
    print()
except Exception as e:
    print(f"Error: {e}")
    print()

# Test 4: Multiple turns
print("=== Test 4: Multiple Turns ===")
try:
    conversation = [
        SystemMessage(content="You are a helpful assistant."),
        HumanMessage(content="My name is Alice."),
    ]
    
    response1 = llm(conversation)
    print(f"Assistant: {response1.content}")
    
    conversation.append(response1)
    conversation.append(HumanMessage(content="What is my name?"))
    
    response2 = llm(conversation)
    print(f"Assistant: {response2.content}")
    print()
except Exception as e:
    print(f"Error: {e}")
    print()

print("All LangChain tests completed!")

