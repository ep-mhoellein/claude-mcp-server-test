import axios, { AxiosInstance } from 'axios';
import { EpagesConfig, Product, ProductList, ProductListSchema, ProductSchema } from './types.js';

export class EpagesClient {
  private client: AxiosInstance;
  private config: EpagesConfig;

  constructor(config: EpagesConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rs/shops/${config.shopId}`,
      headers: {
        // 'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async getProducts(params?: {
    page?: number;
    resultsPerPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
    q?: string;
  }): Promise<ProductList> {
    try {
      const response = await this.client.get('/products', { params });
      console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

      // Handle different response formats
      if (Array.isArray(response.data)) {
        // If response is directly an array
        return {
          results: response.data,
          resultsOnPage: response.data.length,
          page: params?.page || 1,
          resultsPerPage: params?.resultsPerPage || response.data.length
        };
      }

      return ProductListSchema.parse(response.data);
    } catch (error) {
      throw new Error(`Failed to get products: ${error}`);
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await this.client.get(`/products/${productId}`);
      return ProductSchema.parse(response.data);
    } catch (error) {
      throw new Error(`Failed to get product ${productId}: ${error}`);
    }
  }

  async createProduct(product: Omit<Product, 'productId'>): Promise<Product> {
    try {
      const response = await this.client.post('/products', product);
      return ProductSchema.parse(response.data);
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    try {
      const response = await this.client.patch(`/products/${productId}`, updates);
      return ProductSchema.parse(response.data);
    } catch (error) {
      throw new Error(`Failed to update product ${productId}: ${error}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      await this.client.delete(`/products/${productId}`);
    } catch (error) {
      throw new Error(`Failed to delete product ${productId}: ${error}`);
    }
  }

  async searchProducts(query: string, params?: {
    page?: number;
    resultsPerPage?: number;
  }): Promise<ProductList> {
    return this.getProducts({ ...params, q: query });
  }
}