#!/bin/bash

# Set variables
export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing MCP Server at: $MCP_SERVER_URL"
echo "========================================"
echo ""

# Function to extract JSON from SSE or plain JSON response
extract_json() {
  local response="$1"
  # Check if it's SSE format (starts with "event:" or contains "data:")
  if echo "$response" | grep -q "^event:\|^data:"; then
    # Extract from SSE format
    echo "$response" | grep "^data: " | sed 's/^data: //'
  else
    # Already JSON, return as is
    echo "$response"
  fi
}

# 1. Initialize session and get session ID from server
echo "1. Initializing session..."
echo "--------------------------"
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
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }')

# Extract session ID from response headers
SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')

if [ -n "$SESSION_ID" ]; then
  echo "✓ Session initialized"
  echo "  Session ID: $SESSION_ID"

  # Extract and parse the JSON body
  BODY=$(echo "$RESPONSE" | sed -n '/^$/,$p' | tail -n +2)
  JSON_RESPONSE=$(extract_json "$BODY")

  if echo "$JSON_RESPONSE" | jq -e '.result' > /dev/null 2>&1; then
    SERVER_INFO=$(echo "$JSON_RESPONSE" | jq -r '.result.serverInfo.name // "Unknown"')
    echo "  Server: $SERVER_INFO"
  fi
else
  echo "✗ Failed to initialize session"
  echo "Response:"
  echo "$RESPONSE"
  exit 1
fi

echo ""

# 2. List available tools
echo "2. Listing available tools..."
echo "-----------------------------"
TOOLS_RESPONSE=$(curl -sX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }')

TOOLS_JSON=$(extract_json "$TOOLS_RESPONSE")

if echo "$TOOLS_JSON" | jq -e '.result.tools' > /dev/null 2>&1; then
  echo "✓ Available tools:"
  echo "$TOOLS_JSON" | jq -r '.result.tools[].name' | while read tool; do
    echo "  - $tool"
  done
else
  echo "✗ Failed to list tools"
  echo "Response: $TOOLS_JSON"
fi

echo ""

# 3. Configure ePages
echo "3. Configuring ePages..."
echo "------------------------"
CONFIG_RESPONSE=$(curl -sX POST $MCP_SERVER_URL \
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
    "id": 3
  }')

CONFIG_JSON=$(extract_json "$CONFIG_RESPONSE")

if echo "$CONFIG_JSON" | jq -e '.result' > /dev/null 2>&1; then
  echo "✓ ePages configured successfully"
else
  echo "✗ Failed to configure ePages"
  echo "Response: $CONFIG_JSON" | jq '.' 2>/dev/null || echo "$CONFIG_JSON"
fi

echo ""

# 4. Get products
echo "4. Getting first 3 products..."
echo "------------------------------"
PRODUCTS_RESPONSE=$(curl -sX POST $MCP_SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_products",
      "arguments": {
        "resultsPerPage": 3
      }
    },
    "id": 4
  }')

PRODUCTS_JSON=$(extract_json "$PRODUCTS_RESPONSE")

if echo "$PRODUCTS_JSON" | jq -e '.result' > /dev/null 2>&1; then
  echo "✓ Products retrieved:"

  # Try to parse the nested JSON in the content
  PRODUCTS_DATA=$(echo "$PRODUCTS_JSON" | jq -r '.result.content[0].text' 2>/dev/null | jq '.' 2>/dev/null)

  if [ -n "$PRODUCTS_DATA" ] && [ "$PRODUCTS_DATA" != "null" ]; then
    echo "$PRODUCTS_DATA" | jq -r '.data.results[]? | "  - \(.name) (\(.priceInfo.price.formatted // "N/A"))"' 2>/dev/null || echo "  Could not parse product details"
  else
    echo "  Response structure:"
    echo "$PRODUCTS_JSON" | jq '.' | head -20
  fi
else
  echo "✗ Failed to get products"
  echo "Response: $PRODUCTS_JSON" | jq '.' 2>/dev/null || echo "$PRODUCTS_JSON"
fi

echo ""
echo "Test completed!"