#!/bin/bash

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing Session Reuse"
echo "====================="
echo ""

# Initialize ONCE and get session ID
echo "1. Initializing session..."
RESPONSE=$(curl -siX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "persistent-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }')

SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')
echo "Got session ID: $SESSION_ID"
echo ""

# Now you can reuse this session for multiple operations
echo "2. Configure ePages (using same session)..."
curl -sX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "configure_epages",
      "arguments": {
        "baseUrl": "https://ep6unity.epages.systems",
        "shopId": "DemoShop",
        "accessToken": "optional-token"
      }
    },
    "id": 2
  }' | grep -q "success" && echo "✓ Configured"

echo ""
echo "3. Get products (same session)..."
curl -sX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_products",
      "arguments": {"resultsPerPage": 1}
    },
    "id": 3
  }' | grep -q "success" && echo "✓ Got products"

echo ""
echo "4. Get more products (still same session)..."
curl -sX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_products",
      "arguments": {"resultsPerPage": 2}
    },
    "id": 4
  }' | grep -q "success" && echo "✓ Got more products"

echo ""
echo "========================================"
echo "✓ Same session ($SESSION_ID) used for all operations!"
echo "✓ No re-initialization needed!"
echo ""
echo "You can save this SESSION_ID and reuse it for hours/days,"
echo "as long as the server keeps running."