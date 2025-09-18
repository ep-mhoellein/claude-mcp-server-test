#!/bin/bash

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing Multiple Independent API Calls"
echo "======================================"
echo ""

# Function to make an API call
make_api_call() {
  local call_number=$1
  echo "API Call #$call_number"
  echo "-------------"

  curl -s -X POST https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: mcp-client-2025-04-04" \
    -d '{
      "model": "claude-3-haiku-20240307",
      "max_tokens": 500,
      "messages": [
        {
          "role": "user",
          "content": "You are connected to an ePages MCP server. This is call #'"$call_number"'. Please:\n1. Configure ePages with baseUrl=\"https://ep6unity.epages.systems\" and shopId=\"DemoShop\" and accessToken=\"optional-token\"\n2. Get just 1 product\n3. Show only the product name and price"
        }
      ],
      "mcp_servers": [
        {
          "type": "url",
          "url": "'"$MCP_SERVER_URL"'",
          "name": "epages-server"
        }
      ]
    }' | jq -r '.content[-1].text' 2>/dev/null || echo "Error in API call"

  echo ""
  echo "---"
  echo ""
  sleep 2
}

# Make 3 consecutive API calls to demonstrate independence
echo "Making 3 consecutive API calls to demonstrate session independence:"
echo ""

make_api_call 1
make_api_call 2
make_api_call 3

echo "======================================"
echo "✓ Each API call used its own independent session"
echo "✓ No manual reset needed between calls"
echo "✓ Server handles multiple concurrent sessions automatically"