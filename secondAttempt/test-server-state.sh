#!/bin/bash

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing Server State Issue"
echo "==========================="
echo ""

# Test 1: Try to initialize with a new session
echo "Test 1: Initialize with new session"
SESSION1=$(date +%s)-1
curl -X POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: test-$SESSION1" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test1",
        "version": "1.0.0"
      }
    },
    "id": 1
  }' 2>/dev/null

echo ""
echo ""

# Test 2: Try another initialization
echo "Test 2: Try another session immediately"
SESSION2=$(date +%s)-2
curl -X POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: test-$SESSION2" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test2",
        "version": "1.0.0"
      }
    },
    "id": 1
  }' 2>/dev/null

echo ""