#!/usr/bin/env node
/**
 * Messages API Adapter for MCP Gateway
 *
 * This adapter allows the Anthropic Messages API to use the MCP Gateway
 * instead of connecting directly to MCP servers.
 */

import express from 'express';
import axios from 'axios';

class MessagesAPIAdapter {
  private app: express.Application;
  private gatewayUrl: string;
  private sessions: Map<string, string> = new Map(); // Maps request ID to gateway session
  private port: number;

  constructor(gatewayUrl: string = 'http://localhost:3333', port: number = 3334) {
    this.gatewayUrl = gatewayUrl;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', '*');
      res.header('Access-Control-Allow-Methods', '*');
      next();
    });
  }

  private setupRoutes(): void {
    // MCP endpoint that Messages API expects
    this.app.post('/mcp', async (req, res) => {
      const requestId = req.headers['mcp-session-id'] as string ||
                       req.headers['x-request-id'] as string ||
                       Date.now().toString();

      try {
        const { method, params, id } = req.body;

        // Handle initialization
        if (method === 'initialize') {
          // Create or get gateway session
          let sessionId = this.sessions.get(requestId);

          if (!sessionId) {
            // Create new gateway session
            const sessionResponse = await axios.post(`${this.gatewayUrl}/session`, {
              serverUrl: process.env.ACTUAL_MCP_SERVER || 'https://mcp.quaese.uber.space/mcp',
              metadata: {
                source: 'messages-api',
                requestId
              }
            });

            sessionId = sessionResponse.data.sessionId;
            this.sessions.set(requestId, sessionId);
            console.log(`Created gateway session: ${sessionId} for request: ${requestId}`);
          }

          // Return initialization response in SSE format (Messages API expects this)
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'mcp-session-id': sessionId
          });

          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'mcp-gateway-adapter',
                version: '1.0.0'
              }
            }
          };

          res.write('event: message\n');
          res.write(`data: ${JSON.stringify(response)}\n\n`);
          res.end();
          return;
        }

        // Handle other methods through gateway
        const sessionId = this.sessions.get(requestId);
        if (!sessionId) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'Session not found. Initialize first.'
            },
            id
          });
        }

        // Forward to gateway
        const gatewayResponse = await axios.post(
          `${this.gatewayUrl}/execute`,
          { method, params },
          {
            headers: {
              'X-Session-ID': sessionId
            }
          }
        );

        // Return response in SSE format
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'mcp-session-id': sessionId
        });

        const response = {
          jsonrpc: '2.0',
          id,
          result: gatewayResponse.data.data?.result || gatewayResponse.data.data
        };

        res.write('event: message\n');
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();

      } catch (error) {
        console.error('Adapter error:', error);

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache'
        });

        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Internal error'
          },
          id: req.body.id
        };

        res.write('event: message\n');
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
      }
    });

    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const gatewayHealth = await axios.get(`${this.gatewayUrl}/health`);
        res.json({
          adapter: 'healthy',
          gateway: gatewayHealth.data,
          sessions: this.sessions.size
        });
      } catch (error) {
        res.status(503).json({
          adapter: 'healthy',
          gateway: 'unreachable',
          sessions: this.sessions.size
        });
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║       Messages API → Gateway Adapter         ║
╠══════════════════════════════════════════════╣
║  Adapter:  http://localhost:${this.port}/mcp        ║
║  Gateway:  ${this.gatewayUrl}        ║
║                                              ║
║  How to use:                                 ║
║  1. Start the MCP Gateway                    ║
║  2. Start this adapter                       ║
║  3. Point Messages API to:                   ║
║     http://localhost:${this.port}/mcp              ║
║                                              ║
║  The adapter will:                           ║
║  • Create gateway sessions automatically     ║
║  • Maintain session mapping                  ║
║  • Handle SSE formatting                     ║
║  • Forward all requests through gateway      ║
╚══════════════════════════════════════════════╝
      `);
    });
  }
}

// Start the adapter
const adapter = new MessagesAPIAdapter(
  process.env.GATEWAY_URL || 'http://localhost:3333',
  parseInt(process.env.ADAPTER_PORT || '3334')
);
adapter.start();