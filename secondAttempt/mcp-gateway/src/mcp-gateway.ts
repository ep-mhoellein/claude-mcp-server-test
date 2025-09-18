#!/usr/bin/env node
/**
 * MCP Gateway Client
 *
 * This gateway maintains persistent connections to MCP servers
 * and handles requests from multiple external clients.
 *
 * Architecture:
 * External Clients → HTTP/REST → Gateway → MCP Protocol → MCP Server
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

interface MCPSession {
  id: string;
  serverUrl: string;
  sessionId: string;
  initialized: boolean;
  lastAccess: Date;
  metadata: Record<string, any>;
}

interface GatewayRequest {
  method: string;
  params?: any;
  sessionId?: string;
}

interface GatewayResponse {
  success: boolean;
  sessionId?: string;
  data?: any;
  error?: string;
}

class MCPGateway {
  private sessions: Map<string, MCPSession> = new Map();
  private app: express.Application;
  private port: number;

  constructor(port: number = 3333) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.startCleanupTimer();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        sessions: this.sessions.size,
        uptime: process.uptime()
      });
    });

    // Create or get session
    this.app.post('/session', async (req, res) => {
      const { serverUrl, metadata } = req.body;

      if (!serverUrl) {
        return res.status(400).json({ error: 'serverUrl is required' });
      }

      try {
        const session = await this.createSession(serverUrl, metadata);
        res.json({
          success: true,
          sessionId: session.id,
          message: 'Session created and initialized'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create session'
        });
      }
    });

    // Execute MCP method
    this.app.post('/execute', async (req, res) => {
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
      const { method, params } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      if (!method) {
        return res.status(400).json({ error: 'method is required' });
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const result = await this.executeMethod(session, method, params);
        res.json({
          success: true,
          sessionId: session.id,
          data: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Execution failed'
        });
      }
    });

    // Call MCP tool
    this.app.post('/tool', async (req, res) => {
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
      const { toolName, arguments: args } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      if (!toolName) {
        return res.status(400).json({ error: 'toolName is required' });
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const result = await this.callTool(session, toolName, args);
        res.json({
          success: true,
          sessionId: session.id,
          data: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Tool call failed'
        });
      }
    });

    // List available tools
    this.app.get('/tools/:sessionId', async (req, res) => {
      const { sessionId } = req.params;

      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const tools = await this.listTools(session);
        res.json({
          success: true,
          sessionId: session.id,
          tools
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list tools'
        });
      }
    });

    // Get session info
    this.app.get('/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;

      const session = this.sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        id: session.id,
        serverUrl: session.serverUrl,
        initialized: session.initialized,
        lastAccess: session.lastAccess,
        metadata: session.metadata
      });
    });

    // List all sessions
    this.app.get('/sessions', (req, res) => {
      const sessions = Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        serverUrl: s.serverUrl,
        initialized: s.initialized,
        lastAccess: s.lastAccess
      }));

      res.json({ sessions });
    });

    // Close session
    this.app.delete('/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;

      if (this.sessions.delete(sessionId)) {
        res.json({ success: true, message: 'Session closed' });
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    });
  }

  private async createSession(serverUrl: string, metadata?: any): Promise<MCPSession> {
    const id = uuidv4();

    // Initialize MCP connection
    const initResponse = await axios.post(
      serverUrl,
      {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-gateway',
            version: '1.0.0'
          }
        },
        id: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': id
        }
      }
    );

    // Extract server session ID if provided
    const serverSessionId = initResponse.headers['mcp-session-id'] || id;

    const session: MCPSession = {
      id,
      serverUrl,
      sessionId: serverSessionId,
      initialized: true,
      lastAccess: new Date(),
      metadata: metadata || {}
    };

    this.sessions.set(id, session);
    console.log(`Session created: ${id} → ${serverUrl}`);

    return session;
  }

  private async executeMethod(session: MCPSession, method: string, params?: any): Promise<any> {
    session.lastAccess = new Date();

    const response = await axios.post(
      session.serverUrl,
      {
        jsonrpc: '2.0',
        method,
        params: params || {},
        id: Date.now()
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': session.sessionId
        }
      }
    );

    // Handle SSE response
    if (typeof response.data === 'string' && response.data.includes('event:')) {
      // Extract JSON from SSE
      const jsonMatch = response.data.match(/data: (.+)/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    }

    return response.data;
  }

  private async callTool(session: MCPSession, toolName: string, args?: any): Promise<any> {
    return this.executeMethod(session, 'tools/call', {
      name: toolName,
      arguments: args || {}
    });
  }

  private async listTools(session: MCPSession): Promise<any> {
    const response = await this.executeMethod(session, 'tools/list');
    return response.result?.tools || [];
  }

  private startCleanupTimer(): void {
    // Clean up idle sessions every 5 minutes
    setInterval(() => {
      const now = new Date();
      const timeout = 30 * 60 * 1000; // 30 minutes

      for (const [id, session] of this.sessions) {
        if (now.getTime() - session.lastAccess.getTime() > timeout) {
          console.log(`Cleaning up idle session: ${id}`);
          this.sessions.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║           MCP Gateway Server                  ║
╠══════════════════════════════════════════════╣
║  Listening on: http://localhost:${this.port}         ║
║                                              ║
║  Endpoints:                                  ║
║  POST   /session      - Create session       ║
║  POST   /execute      - Execute method       ║
║  POST   /tool         - Call tool            ║
║  GET    /tools/:id    - List tools           ║
║  GET    /session/:id  - Get session info     ║
║  GET    /sessions     - List all sessions    ║
║  DELETE /session/:id  - Close session        ║
║  GET    /health       - Health check         ║
╚══════════════════════════════════════════════╝
      `);
    });
  }
}

// Start the gateway
const gateway = new MCPGateway(parseInt(process.env.GATEWAY_PORT || '3333'));
gateway.start();