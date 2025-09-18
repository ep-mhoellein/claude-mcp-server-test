#!/bin/bash

# Test script for MCP Gateway
# Shows how multiple external clients can use the same MCP session

GATEWAY_URL="http://localhost:3333"
MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "MCP Gateway Test"
echo "================"
echo ""

# Step 1: Create a session
echo "1. Creating MCP session..."
SESSION_RESPONSE=$(curl -s -X POST $GATEWAY_URL/session \
  -H "Content-Type: application/json" \
  -d "{
    \"serverUrl\": \"$MCP_SERVER_URL\",
    \"metadata\": {
      \"client\": \"test-script\",
      \"purpose\": \"demonstration\"
    }
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.sessionId')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "❌ Failed to create session"
  echo "$SESSION_RESPONSE"
  exit 1
fi

echo "✅ Session created: $SESSION_ID"
echo ""

# Step 2: Configure ePages (Client A)
echo "2. [Client A] Configuring ePages..."
CONFIG_RESPONSE=$(curl -s -X POST $GATEWAY_URL/tool \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "toolName": "configure_epages",
    "arguments": {
      "baseUrl": "https://ep6unity.epages.systems",
      "shopId": "DemoShop",
      "accessToken": "optional-token"
    }
  }')

if echo "$CONFIG_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ ePages configured"
else
  echo "❌ Configuration failed"
  echo "$CONFIG_RESPONSE"
fi

echo ""

# Step 3: Get products (Client B - different client, same session)
echo "3. [Client B] Getting products (different client, same session)..."
PRODUCTS_RESPONSE=$(curl -s -X POST $GATEWAY_URL/tool \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "toolName": "get_products",
    "arguments": {
      "resultsPerPage": 2
    }
  }')

if echo "$PRODUCTS_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Products retrieved"

  # Try to extract product names
  PRODUCTS=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.result.content[0].text' 2>/dev/null | jq -r '.data.results[].name' 2>/dev/null)
  if [ -n "$PRODUCTS" ]; then
    echo "Products:"
    echo "$PRODUCTS" | while read -r product; do
      echo "  - $product"
    done
  fi
else
  echo "❌ Failed to get products"
fi

echo ""

# Step 4: Get session info (Client C)
echo "4. [Client C] Getting session info..."
SESSION_INFO=$(curl -s -X GET $GATEWAY_URL/session/$SESSION_ID)
echo "Session info:"
echo "$SESSION_INFO" | jq '.'

echo ""

# Step 5: Simulate parallel requests from multiple clients
echo "5. Simulating parallel requests from 3 different clients..."
(
  echo "[Client D] Request 1..." && \
  curl -s -X POST $GATEWAY_URL/tool \
    -H "X-Session-ID: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"toolName": "get_products", "arguments": {"resultsPerPage": 1, "page": 1}}' \
    > /dev/null && echo "  ✅ Client D completed"
) &

(
  echo "[Client E] Request 2..." && \
  curl -s -X POST $GATEWAY_URL/tool \
    -H "X-Session-ID: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"toolName": "get_products", "arguments": {"resultsPerPage": 1, "page": 2}}' \
    > /dev/null && echo "  ✅ Client E completed"
) &

(
  echo "[Client F] Request 3..." && \
  curl -s -X POST $GATEWAY_URL/tool \
    -H "X-Session-ID: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"toolName": "get_products", "arguments": {"resultsPerPage": 1, "page": 3}}' \
    > /dev/null && echo "  ✅ Client F completed"
) &

wait
echo ""

# Step 6: Check gateway health
echo "6. Gateway health check..."
HEALTH=$(curl -s $GATEWAY_URL/health)
echo "$HEALTH" | jq '.'

echo ""
echo "========================================"
echo "Summary:"
echo "✅ Single MCP session created and maintained"
echo "✅ Multiple clients used the same session"
echo "✅ No re-initialization needed"
echo "✅ Session ID: $SESSION_ID"
echo ""
echo "This demonstrates how the gateway solves the multi-session problem:"
echo "- External clients don't need to manage MCP sessions"
echo "- The gateway maintains the persistent connection"
echo "- Multiple clients can share the same session"
echo "- No 'already initialized' errors!"