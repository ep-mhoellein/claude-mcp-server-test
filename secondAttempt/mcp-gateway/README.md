# MCP Gateway Solution

## Project Structure

```
mcp-gateway/
├── src/
│   ├── mcp-gateway.ts           # Main gateway server
│   └── messages-api-adapter.ts  # Messages API adapter
├── scripts/
│   └── test-gateway.sh          # Test script
├── dist/                        # Compiled JavaScript (generated)
├── package.json                 # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Problem

The MCP SDK maintains global initialization state, preventing multiple sessions from being created. This causes issues when:

- The Messages API creates a new session for each request
- Multiple clients need to access the same MCP server
- You want to avoid server restarts between requests

## Solution: MCP Gateway

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │ Messages API│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       ▼                   ▼                    ▼
    ┌──────────────────────────────────────────────┐
    │            MCP Gateway (Port 3333)           │
    │                                              │
    │  • Maintains persistent MCP connections      │
    │  • Manages session lifecycle                 │
    │  • Handles multiple concurrent clients        │
    │  • Provides REST API                         │
    └──────────────────┬───────────────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   MCP Server     │
              │ (Single Session) │
              └──────────────────┘
```

## Components

### 1. MCP Gateway (`mcp-gateway.ts`)

- Maintains persistent connections to MCP servers
- Manages session lifecycle
- Provides REST API for external clients
- Handles session cleanup

### 2. Messages API Adapter (`messages-api-adapter.ts`)

- Translates Messages API requests to Gateway requests
- Maintains session mapping
- Formats responses as SSE

## Installation & Setup

```bash
# Navigate to the gateway directory
cd mcp-gateway

# Install dependencies
npm install

# Compile TypeScript
npm run build
```

## Usage

### NPM Scripts

```bash
npm start                 # Start gateway on port 3333
npm run start-adapter     # Start adapter on port 3334
npm run dev              # Build and start gateway
npm run dev-adapter      # Build and start adapter
npm test                 # Run test script
npm run clean            # Clean build directory
```

### Manual Usage

#### Step 1: Start the MCP Gateway

```bash
# Start gateway on port 3333
npm start
# or manually:
GATEWAY_PORT=3333 node dist/mcp-gateway.js
```

#### Step 2: For Messages API - Start the Adapter

```bash
# Start adapter on port 3334
npm run start-adapter
# or manually:
ADAPTER_PORT=3334 GATEWAY_URL=http://localhost:3333 node dist/messages-api-adapter.js
```

### Step 3: Use the Gateway

#### Direct Usage (REST API)

```bash
# Create session
SESSION=$(curl -s -X POST http://localhost:3333/session \
  -H "Content-Type: application/json" \
  -d '{"serverUrl": "https://mcp.quaese.uber.space/mcp"}' \
  | jq -r '.sessionId')

# Configure ePages
curl -X POST http://localhost:3333/tool \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION" \
  -d '{
    "toolName": "configure_epages",
    "arguments": {
      "baseUrl": "https://ep6unity.epages.systems",
      "shopId": "DemoShop",
      "accessToken": "optional-token"
    }
  }'

# Get products
curl -X POST http://localhost:3333/tool \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION" \
  -d '{
    "toolName": "get_products",
    "arguments": {"resultsPerPage": 3}
  }'
```

#### Messages API Usage

```bash
# Point Messages API to adapter
export MCP_SERVER_URL="http://localhost:3334/mcp"

curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-04-04" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "messages": [{
      "role": "user",
      "content": "Get products from ePages"
    }],
    "mcp_servers": [{
      "type": "url",
      "url": "'$MCP_SERVER_URL'",
      "name": "gateway"
    }]
  }'
```

## API Endpoints

### Gateway Endpoints

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| POST   | `/session`            | Create new MCP session |
| POST   | `/execute`            | Execute MCP method     |
| POST   | `/tool`               | Call MCP tool          |
| GET    | `/tools/:sessionId`   | List available tools   |
| GET    | `/session/:sessionId` | Get session info       |
| GET    | `/sessions`           | List all sessions      |
| DELETE | `/session/:sessionId` | Close session          |
| GET    | `/health`             | Health check           |

### Request Examples

#### Create Session

```json
POST /session
{
  "serverUrl": "https://mcp.quaese.uber.space/mcp",
  "metadata": {
    "client": "my-app",
    "version": "1.0.0"
  }
}
```

#### Call Tool

```json
POST /tool
Headers: X-Session-ID: <session-id>
{
  "toolName": "get_products",
  "arguments": {
    "resultsPerPage": 5
  }
}
```

## Benefits

1. **No Server Restarts**: Gateway maintains persistent connections
2. **Session Sharing**: Multiple clients can use the same MCP session
3. **Load Distribution**: Can scale horizontally with multiple gateways
4. **Session Management**: Automatic cleanup of idle sessions
5. **Protocol Translation**: Handles SSE/JSON conversion
6. **Error Handling**: Graceful error recovery

## Architecture Advantages

- **Decoupling**: Clients don't need to understand MCP protocol
- **Scalability**: Gateway can be scaled independently
- **Reliability**: Session persistence across client reconnects
- **Flexibility**: Easy to add caching, rate limiting, auth

## Testing

```bash
# Run the test script via npm
npm test

# Or run manually
chmod +x scripts/test-gateway.sh
./scripts/test-gateway.sh
```

This will demonstrate:

- Creating a session
- Multiple clients using the same session
- Parallel requests
- No re-initialization errors

## Production Considerations

1. **Authentication**: Add API keys or JWT tokens
2. **Rate Limiting**: Implement per-client rate limits
3. **Monitoring**: Add metrics and logging
4. **Persistence**: Store sessions in Redis for high availability
5. **Load Balancing**: Use multiple gateway instances

## Conclusion

The MCP Gateway solves the fundamental incompatibility between:

- MCP SDK (expects persistent connections)
- Messages API (creates new connections per request)

By acting as a middleman, it provides the best of both worlds: persistent MCP sessions with stateless client access.

## Verwendung:

cd mcp-gateway
npm install
npm run build
npm start # Gateway auf Port 3333
npm run start-adapter # Adapter auf Port 3334
npm test # Test-Script ausführen

Das Gateway löst das Kernproblem: MCP SDK (persistent) ↔ Messages API (stateless) durch eine Middleware-Architektur mit persistenten
Verbindungen
