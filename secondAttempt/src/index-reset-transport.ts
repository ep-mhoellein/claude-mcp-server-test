#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import * as crypto from 'crypto';

// Extend StreamableHTTPServerTransport to add reset capability
class ResettableHTTPServerTransport extends StreamableHTTPServerTransport {
  private resettableInitialized: boolean = false;

  constructor(options: any) {
    super(options);
  }

  // Override the initialization check
  async handleRequest(req: any, res: any): Promise<void> {
    // Check if this is an initialize request
    if (req.method === 'POST') {
      let body = '';

      // Collect the body first
      await new Promise<void>((resolve) => {
        req.on('data', (chunk: any) => body += chunk.toString());
        req.on('end', () => resolve());
      });

      // Check if it's an initialize request
      try {
        const request = JSON.parse(body);
        if (request.method === 'initialize' && this.resettableInitialized) {
          console.log('Resetting transport for new initialization');

          // Reset the internal state by manipulating the parent class
          (this as any)._initialized = false;
          (this as any)._sessionId = null;

          // Reset our tracking state
          this.resettableInitialized = false;
        } else if (request.method === 'initialize') {
          // Track that we're initialized
          this.resettableInitialized = true;
        }
      } catch (e) {
        // Not JSON, continue normally
      }

      // Recreate the request with the body
      const newReq = Object.assign(Object.create(Object.getPrototypeOf(req)), req);
      newReq.body = body;

      // Set up a new readable stream with the body
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(body);
      stream.push(null);

      // Replace the request with our stream
      Object.assign(newReq, stream);

      return super.handleRequest(newReq, res);
    }

    return super.handleRequest(req, res);
  }
}

// Use the resettable transport in your server
export { ResettableHTTPServerTransport };