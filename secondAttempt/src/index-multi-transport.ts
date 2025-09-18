#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import * as crypto from 'crypto';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { EpagesClient } from './epages-client.js';
import { AnthropicClient } from './anthropic-client.js';
import { EpagesConfig, AnthropicConfig, MCPToolResult } from './types.js';

interface SessionData {
  epagesClient: EpagesClient | null;
  anthropicClient: AnthropicClient | null;
  server?: Server;
  transport?: StreamableHTTPServerTransport;
}

class EpagesMCPServer {
  private sessions: Map<string, SessionData> = new Map();
  private serverPool: Server[] = [];
  private currentServerIndex: number = 0;
  private maxServers: number = 10;

  constructor() {
    // Pre-create a pool of servers
    for (let i = 0; i < this.maxServers; i++) {
      this.createNewServer();
    }
  }

  private createNewServer(): Server {
    const server = new Server(
      {
        name: 'epages-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers(server);
    this.serverPool.push(server);
    return server;
  }

  private getNextServer(): Server {
    // Round-robin through server pool
    const server = this.serverPool[this.currentServerIndex];
    this.currentServerIndex = (this.currentServerIndex + 1) % this.maxServers;
    return server;
  }

  private getSession(sessionId?: string, server?: Server): SessionData {
    if (!sessionId) {
      sessionId = 'default';
    }

    if (!this.sessions.has(sessionId)) {
      console.log(`Creating new session: ${sessionId}`);
      this.sessions.set(sessionId, {
        epagesClient: null,
        anthropicClient: null,
        server: server,
      });
    }

    return this.sessions.get(sessionId)!;
  }

  private setupToolHandlers(server: Server): void {
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_epages',
          description: 'Configure ePages API connection',
          inputSchema: {
            type: 'object',
            properties: {
              baseUrl: { type: 'string', description: 'ePages API base URL' },
              accessToken: { type: 'string', description: 'ePages API access token' },
              shopId: { type: 'string', description: 'ePages shop ID' },
            },
            required: ['baseUrl', 'accessToken', 'shopId'],
          },
        },
        {
          name: 'get_products',
          description: 'Get products from ePages shop',
          inputSchema: {
            type: 'object',
            properties: {
              page: { type: 'number', description: 'Page number' },
              resultsPerPage: { type: 'number', description: 'Results per page' },
            },
          },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request, meta) => {
      const { name, arguments: args } = request.params;
      const sessionId = meta?.sessionId;
      const session = this.getSession(sessionId, server);

      try {
        let result: MCPToolResult;

        switch (name) {
          case 'configure_epages':
            session.epagesClient = new EpagesClient(args as unknown as EpagesConfig);
            result = { success: true, data: { message: 'ePages configured' } };
            break;

          case 'get_products':
            if (!session.epagesClient) {
              result = { success: false, error: 'ePages not configured' };
            } else {
              const products = await session.epagesClient.getProducts(args as any);
              result = { success: true, data: products };
            }
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2)
          }],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${host}:${port}`);

      if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
        const sessionId = req.headers['mcp-session-id'] as string || crypto.randomUUID();

        // Get or create session-specific transport
        let session = this.sessions.get(sessionId);

        if (!session || !session.transport) {
          // Create new transport for this session
          const server = this.getNextServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId,
          });

          await server.connect(transport);

          session = this.getSession(sessionId, server);
          session.transport = transport;

          console.log(`Created new transport for session: ${sessionId}`);
        }

        // Use session-specific transport
        await session.transport.handleRequest(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    httpServer.listen(port, host, () => {
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      console.log(`Multi-Transport ePages MCP server running on http://${displayHost}:${port}`);
      console.log(`Server pool size: ${this.maxServers}`);
      console.log('Each session gets its own transport - no restart needed!');
    });
  }
}

const server = new EpagesMCPServer();
server.run().catch(console.error);