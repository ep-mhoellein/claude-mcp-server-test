#!/bin/bash

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "MCP Server Connection Debug"
echo "==========================="
echo ""

echo "1. Testing basic connectivity..."
echo "---------------------------------"
curl -I $MCP_SERVER_URL 2>/dev/null | head -10
echo ""

echo "2. Testing initialization without session ID (should fail)..."
echo "--------------------------------------------------------------"
curl -X POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }' 2>&1
echo ""
echo ""

echo "3. Testing with empty session ID..."
echo "------------------------------------"
curl -X POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: " \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }' 2>&1
echo ""
echo ""

echo "4. Testing with new UUID session ID..."
echo "---------------------------------------"
NEW_SESSION=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Using session ID: $NEW_SESSION"
echo ""

RESPONSE=$(curl -siX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $NEW_SESSION" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "messages-api-test",
        "version": "1.0.0"
      }
    },
    "id": 1
  }')

echo "Full response:"
echo "$RESPONSE" | head -20
echo ""

# Extract session ID
SERVER_SESSION=$(echo "$RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')
echo "Server returned session ID: $SERVER_SESSION"
echo ""

echo "5. Check response format..."
echo "---------------------------"
BODY=$(echo "$RESPONSE" | sed -n '/^$/,$p' | tail -n +2)
echo "Response body format:"
echo "$BODY" | head -5
echo ""

if echo "$BODY" | grep -q "^event:"; then
  echo "✓ Server responds with SSE format"
else
  echo "✗ Server does not use SSE format"
fi

if echo "$BODY" | grep -q "^data:"; then
  echo "✓ SSE data field found"
  JSON_DATA=$(echo "$BODY" | grep "^data: " | sed 's/^data: //')
  echo "JSON data:"
  echo "$JSON_DATA" | jq '.' 2>/dev/null || echo "$JSON_DATA"
fi