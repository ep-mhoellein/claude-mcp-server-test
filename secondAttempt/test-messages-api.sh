#!/bin/bash

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY environment variable is not set"
  echo "Please set it with: export ANTHROPIC_API_KEY='your-key-here'"
  exit 1
fi

export MCP_SERVER_URL="https://mcp.quaese.uber.space/mcp"

echo "Testing Anthropic Messages API with MCP Server"
echo "==============================================="
echo "MCP Server URL: $MCP_SERVER_URL"
echo ""

# The Messages API will handle the session initialization itself
# We don't need to pass a session ID - the API will create its own

echo "Sending request to Messages API..."
echo ""

curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-04-04" \
  -d "{
    \"model\": \"claude-3-haiku-20240307\",
    \"max_tokens\": 1000,
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"You are connected to an ePages MCP server. Please: 1) First configure ePages with baseUrl='https://ep6unity.epages.systems' and shopId='DemoShop'. 2) Then get the first 3 products and show them in a nice table format with names and prices.\"
      }
    ],
    \"mcp_servers\": [
      {
        \"type\": \"http\",
        \"url\": \"$MCP_SERVER_URL\",
        \"name\": \"epages-mcp\"
      }
    ]
  }" | jq '.'

echo ""
echo "Note: The Messages API creates and manages its own MCP session."
echo "Each API call creates a new session with the MCP server."