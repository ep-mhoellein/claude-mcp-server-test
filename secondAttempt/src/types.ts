import { z } from 'zod';

// ePages API Configuration
export interface EpagesConfig {
  baseUrl: string;
  accessToken: string;
  shopId: string;
}

// Anthropic API Configuration
export interface AnthropicConfig {
  apiKey: string;
}

// Product schemas based on ePages API
export const ProductSchema = z.object({
  productId: z.string().optional(),
  name: z.string(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  upc: z.string().optional(),
  sku: z.string().optional(),
  priceInfo: z.object({
    price: z.object({
      amount: z.number(),
      currency: z.string()
    }),
    depositPrice: z.object({
      amount: z.number(),
      currency: z.string()
    }).optional(),
    ecoParticipationPrice: z.object({
      amount: z.number(),
      currency: z.string()
    }).optional()
  }).optional(),
  visible: z.boolean().optional(),
  taxClassId: z.string().optional(),
  stocklevel: z.number().optional(),
  minStocklevel: z.number().optional(),
  availabilityText: z.string().optional()
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductListSchema = z.object({
  results: z.array(ProductSchema),
  resultsOnPage: z.number(),
  page: z.number(),
  resultsPerPage: z.number()
});

export type ProductList = z.infer<typeof ProductListSchema>;

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}