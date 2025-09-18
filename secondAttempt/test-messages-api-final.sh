#!/bin/bash

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing Anthropic Messages API with Multi-Session MCP Server"
echo "============================================================="
echo "MCP Server URL: $MCP_SERVER_URL"
echo ""
echo "Sending request to Messages API..."
echo "-----------------------------------"

# Test with Messages API - the API will create its own session
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-anthropic-api-key" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-04-04" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1500,
    "messages": [
      {
        "role": "user",
        "content": "You are connected to an ePages MCP server. Please:\n1. Configure ePages with baseUrl=\"https://ep6unity.epages.systems\" and shopId=\"DemoShop\" and accessToken=\"optional-token\"\n2. Get the first 3 products\n3. Show them in a nice markdown table with product names, prices, and product numbers"
      }
    ],
    "mcp_servers": [
      {
        "type": "url",
        "url": "'"$MCP_SERVER_URL"'",
        "name": "epages-server"
      }
    ]
  }' 2>/dev/null | jq '.'

echo ""
echo "=========================================="
echo "Note: Each Messages API call creates its own MCP session."
echo "The server now supports multiple concurrent sessions!"