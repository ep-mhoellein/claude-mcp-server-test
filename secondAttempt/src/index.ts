#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'http';
import * as crypto from 'crypto';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { EpagesClient } from './epages-client.js';
import { AnthropicClient } from './anthropic-client.js';
import { EpagesConfig, AnthropicConfig, MCPToolResult } from './types.js';

class EpagesMCPServer {
  private server: Server;
  private epagesClient: EpagesClient | null = null;
  private anthropicClient: AnthropicClient | null = null;

  constructor() {
    this.server = new Server(
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

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'configure_epages',
          description: 'Configure ePages API connection',
          inputSchema: {
            type: 'object',
            properties: {
              baseUrl: {
                type: 'string',
                description: 'ePages API base URL',
              },
              accessToken: {
                type: 'string',
                description: 'ePages API access token',
              },
              shopId: {
                type: 'string',
                description: 'ePages shop ID',
              },
            },
            required: ['baseUrl', 'accessToken', 'shopId'],
          },
        },
        {
          name: 'configure_anthropic',
          description: 'Configure Anthropic API connection',
          inputSchema: {
            type: 'object',
            properties: {
              apiKey: {
                type: 'string',
                description: 'Anthropic API key',
              },
            },
            required: ['apiKey'],
          },
        },
        {
          name: 'get_products',
          description: 'Get all products from ePages shop',
          inputSchema: {
            type: 'object',
            properties: {
              page: {
                type: 'number',
                description: 'Page number (default: 1)',
              },
              resultsPerPage: {
                type: 'number',
                description: 'Results per page (default: 20)',
              },
              sort: {
                type: 'string',
                description: 'Sort field',
              },
              direction: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort direction',
              },
              q: {
                type: 'string',
                description: 'Search query',
              },
            },
          },
        },
        {
          name: 'get_product',
          description: 'Get a specific product by ID',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Product ID',
              },
            },
            required: ['productId'],
          },
        },
        {
          name: 'create_product',
          description: 'Create a new product',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Product name',
              },
              shortDescription: {
                type: 'string',
                description: 'Product short description',
              },
              description: {
                type: 'string',
                description: 'Product description',
              },
              manufacturer: {
                type: 'string',
                description: 'Product manufacturer',
              },
              sku: {
                type: 'string',
                description: 'Product SKU',
              },
              priceAmount: {
                type: 'number',
                description: 'Product price amount',
              },
              priceCurrency: {
                type: 'string',
                description: 'Product price currency (e.g., EUR, USD)',
              },
              visible: {
                type: 'boolean',
                description: 'Product visibility',
              },
              stocklevel: {
                type: 'number',
                description: 'Product stock level',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'update_product',
          description: 'Update an existing product',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Product ID to update',
              },
              name: {
                type: 'string',
                description: 'Product name',
              },
              shortDescription: {
                type: 'string',
                description: 'Product short description',
              },
              description: {
                type: 'string',
                description: 'Product description',
              },
              manufacturer: {
                type: 'string',
                description: 'Product manufacturer',
              },
              sku: {
                type: 'string',
                description: 'Product SKU',
              },
              priceAmount: {
                type: 'number',
                description: 'Product price amount',
              },
              priceCurrency: {
                type: 'string',
                description: 'Product price currency',
              },
              visible: {
                type: 'boolean',
                description: 'Product visibility',
              },
              stocklevel: {
                type: 'number',
                description: 'Product stock level',
              },
            },
            required: ['productId'],
          },
        },
        {
          name: 'delete_product',
          description: 'Delete a product',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Product ID to delete',
              },
            },
            required: ['productId'],
          },
        },
        {
          name: 'search_products',
          description: 'Search products by query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              page: {
                type: 'number',
                description: 'Page number (default: 1)',
              },
              resultsPerPage: {
                type: 'number',
                description: 'Results per page (default: 20)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'generate_product_description',
          description: 'Generate AI-powered product description using Anthropic',
          inputSchema: {
            type: 'object',
            properties: {
              productName: {
                type: 'string',
                description: 'Product name',
              },
              features: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Product features (optional)',
              },
            },
            required: ['productName'],
          },
        },
        {
          name: 'analyze_product',
          description: 'Analyze product using Anthropic AI',
          inputSchema: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'Product ID to analyze',
              },
            },
            required: ['productId'],
          },
        },
        {
          name: 'generate_product_tags',
          description: 'Generate product tags using Anthropic AI',
          inputSchema: {
            type: 'object',
            properties: {
              productName: {
                type: 'string',
                description: 'Product name',
              },
              description: {
                type: 'string',
                description: 'Product description (optional)',
              },
            },
            required: ['productName'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: MCPToolResult;

        switch (name) {
          case 'configure_epages':
            result = await this.configureEpages(args as any);
            break;

          case 'configure_anthropic':
            result = await this.configureAnthropic(args as any);
            break;

          case 'get_products':
            result = await this.getProducts(args as any);
            break;

          case 'get_product':
            result = await this.getProduct(args as any);
            break;

          case 'create_product':
            result = await this.createProduct(args as any);
            break;

          case 'update_product':
            result = await this.updateProduct(args as any);
            break;

          case 'delete_product':
            result = await this.deleteProduct(args as any);
            break;

          case 'search_products':
            result = await this.searchProducts(args as any);
            break;

          case 'generate_product_description':
            result = await this.generateProductDescription(args as any);
            break;

          case 'analyze_product':
            result = await this.analyzeProduct(args as any);
            break;

          case 'generate_product_tags':
            result = await this.generateProductTags(args as any);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async configureEpages(args: EpagesConfig): Promise<MCPToolResult> {
    try {
      this.epagesClient = new EpagesClient(args);
      return {
        success: true,
        data: { message: 'ePages client configured successfully' },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async configureAnthropic(args: AnthropicConfig): Promise<MCPToolResult> {
    try {
      this.anthropicClient = new AnthropicClient(args);
      return {
        success: true,
        data: { message: 'Anthropic client configured successfully' },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getProducts(args: any): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      const products = await this.epagesClient.getProducts(args);
      return { success: true, data: products };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getProduct(args: { productId: string }): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      const product = await this.epagesClient.getProduct(args.productId);
      return { success: true, data: product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async createProduct(args: any): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      const productData: any = {
        name: args.name,
        shortDescription: args.shortDescription,
        description: args.description,
        manufacturer: args.manufacturer,
        sku: args.sku,
        visible: args.visible,
        stocklevel: args.stocklevel,
      };

      if (args.priceAmount && args.priceCurrency) {
        productData.priceInfo = {
          price: {
            amount: args.priceAmount,
            currency: args.priceCurrency,
          },
        };
      }

      const product = await this.epagesClient.createProduct(productData);
      return { success: true, data: product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async updateProduct(args: any): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      const { productId, ...updates } = args;

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.shortDescription) updateData.shortDescription = updates.shortDescription;
      if (updates.description) updateData.description = updates.description;
      if (updates.manufacturer) updateData.manufacturer = updates.manufacturer;
      if (updates.sku) updateData.sku = updates.sku;
      if (updates.visible !== undefined) updateData.visible = updates.visible;
      if (updates.stocklevel !== undefined) updateData.stocklevel = updates.stocklevel;

      if (updates.priceAmount && updates.priceCurrency) {
        updateData.priceInfo = {
          price: {
            amount: updates.priceAmount,
            currency: updates.priceCurrency,
          },
        };
      }

      const product = await this.epagesClient.updateProduct(productId, updateData);
      return { success: true, data: product };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async deleteProduct(args: { productId: string }): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      await this.epagesClient.deleteProduct(args.productId);
      return { success: true, data: { message: 'Product deleted successfully' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async searchProducts(args: any): Promise<MCPToolResult> {
    if (!this.epagesClient) {
      return { success: false, error: 'ePages client not configured' };
    }

    try {
      const products = await this.epagesClient.searchProducts(args.query, {
        page: args.page,
        resultsPerPage: args.resultsPerPage,
      });
      return { success: true, data: products };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async generateProductDescription(args: any): Promise<MCPToolResult> {
    if (!this.anthropicClient) {
      return { success: false, error: 'Anthropic client not configured' };
    }

    try {
      const description = await this.anthropicClient.generateProductDescription(
        args.productName,
        args.features
      );
      return { success: true, data: { description } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async analyzeProduct(args: { productId: string }): Promise<MCPToolResult> {
    if (!this.epagesClient || !this.anthropicClient) {
      return {
        success: false,
        error: 'Both ePages and Anthropic clients must be configured',
      };
    }

    try {
      const product = await this.epagesClient.getProduct(args.productId);
      const analysis = await this.anthropicClient.analyzeProduct(product);
      return { success: true, data: { product, analysis } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async generateProductTags(args: any): Promise<MCPToolResult> {
    if (!this.anthropicClient) {
      return { success: false, error: 'Anthropic client not configured' };
    }

    try {
      const tags = await this.anthropicClient.generateProductTags(
        args.productName,
        args.description
      );
      return { success: true, data: { tags } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async run(): Promise<void> {
    const port = parseInt(process.env.PORT || '3000', 10);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID()
    });

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/mcp' || url.pathname === '/mcp/') {
        await transport.handleRequest(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    await this.server.connect(transport);

    httpServer.listen(port, () => {
      console.log(`ePages MCP server running on http://localhost:${port}`);
      console.log('Server endpoints:');
      console.log(`  - GET ${`http://localhost:${port}/mcp`} for SSE stream`);
      console.log(`  - POST ${`http://localhost:${port}/mcp`} for JSON-RPC messages`);
    });
  }
}

const server = new EpagesMCPServer();
server.run().catch(console.error);