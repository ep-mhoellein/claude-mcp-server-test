import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as crypto from 'crypto';

export interface ManagedSession {
  id: string;
  server: Server;
  transport: StreamableHTTPServerTransport;
  initialized: boolean;
  lastAccess: number;
}

export class SessionManager {
  private sessions: Map<string, ManagedSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor(private setupHandlers: (server: Server) => void) {}

  async getOrCreateSession(sessionId?: string): Promise<ManagedSession> {
    const id = sessionId || crypto.randomUUID();

    // Clean up old sessions
    this.cleanupOldSessions();

    if (this.sessions.has(id)) {
      const session = this.sessions.get(id)!;
      session.lastAccess = Date.now();
      return session;
    }

    // Create new session with its own server and transport
    console.log(`Creating new managed session: ${id}`);

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

    // Setup handlers for this server instance
    this.setupHandlers(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => id,
    });

    await server.connect(transport);

    const session: ManagedSession = {
      id,
      server,
      transport,
      initialized: false,
      lastAccess: Date.now(),
    };

    this.sessions.set(id, session);
    return session;
  }

  private cleanupOldSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccess > this.sessionTimeout) {
        console.log(`Cleaning up session: ${id}`);
        session.server.close().catch(console.error);
        this.sessions.delete(id);
      }
    }
  }

  async handleRequest(req: any, res: any, sessionId?: string): Promise<void> {
    const session = await this.getOrCreateSession(sessionId);
    await session.transport.handleRequest(req, res);
  }
}