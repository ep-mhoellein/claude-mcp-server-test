import axios, { AxiosInstance, AxiosError } from 'axios';
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
        Accept: 'application/json',
      },
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

      console.log('Raw API Response Type:', typeof response.data);
      console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

      // ePages API returns data in this format:
      // { results: number, page: number, resultsPerPage: number, items: Product[] }
      if (response.data?.items && Array.isArray(response.data.items)) {
        return {
          results: response.data.items,
          resultsOnPage: response.data.items.length,
          page: response.data.page || params?.page || 1,
          resultsPerPage: response.data.resultsPerPage || params?.resultsPerPage || response.data.items.length,
        };
      }

      // Handle if response is directly an array
      if (Array.isArray(response.data)) {
        return {
          results: response.data,
          resultsOnPage: response.data.length,
          page: params?.page || 1,
          resultsPerPage: params?.resultsPerPage || response.data.length,
        };
      }

      // Handle standard results format
      if (response.data?.results && Array.isArray(response.data.results)) {
        return {
          results: response.data.results,
          resultsOnPage: response.data.results.length,
          page: response.data.page || params?.page || 1,
          resultsPerPage: response.data.resultsPerPage || params?.resultsPerPage || response.data.results.length,
        };
      }

      // Fallback: return empty result
      console.warn('Unexpected response format:', response.data);
      return {
        results: [],
        resultsOnPage: 0,
        page: params?.page || 1,
        resultsPerPage: params?.resultsPerPage || 10,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get products: ${error.message}`);
      }
      throw new Error(`Failed to get products: ${error}`);
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await this.client.get(`/products/${productId}`);
      
      console.log(`Raw API Response for product ${productId}:`, JSON.stringify(response.data, null, 2));
      
      // Try to parse with schema
      try {
        return ProductSchema.parse(response.data);
      } catch (schemaError) {
        console.error('Schema validation failed for product:', schemaError);
        console.log('Returning raw data as fallback');
        // Return raw data if it has at least productId
        if (response.data?.productId || response.data?.id) {
          return {
            ...response.data,
            productId: response.data.productId || response.data.id,
          };
        }
        throw schemaError;
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to get product ${productId}:`, error.message);
        throw new Error(`Failed to get product ${productId}: ${error.message}`);
      }
      throw new Error(`Failed to get product ${productId}: ${error}`);
    }
  }

  async createProduct(product: Omit<Product, 'productId'>): Promise<Product> {
    try {
      console.log('Creating product with data:', JSON.stringify(product, null, 2));
      const response = await this.client.post('/products', product);
      
      console.log('Create product response:', JSON.stringify(response.data, null, 2));
      
      // Try to parse with schema
      try {
        return ProductSchema.parse(response.data);
      } catch (schemaError) {
        console.error('Schema validation failed for created product:', schemaError);
        // Return raw data if it has at least productId
        if (response.data?.productId || response.data?.id) {
          return {
            ...response.data,
            productId: response.data.productId || response.data.id,
          };
        }
        throw schemaError;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to create product:', error.message);
        if (error.response?.data) {
          console.error('API error response:', JSON.stringify(error.response.data, null, 2));
          throw new Error(`Failed to create product: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Failed to create product: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to create product: ${error.message}`);
      }
      throw new Error(`Failed to create product: ${error}`);
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    try {
      console.log(`Updating product ${productId} with:`, JSON.stringify(updates, null, 2));
      const response = await this.client.patch(`/products/${productId}`, updates);
      
      console.log('Update product response:', JSON.stringify(response.data, null, 2));
      
      // Try to parse with schema
      try {
        return ProductSchema.parse(response.data);
      } catch (schemaError) {
        console.error('Schema validation failed for updated product:', schemaError);
        // Return raw data if it has at least productId
        if (response.data?.productId || response.data?.id) {
          return {
            ...response.data,
            productId: response.data.productId || response.data.id || productId,
          };
        }
        throw schemaError;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Failed to update product ${productId}:`, error.message);
        if (error.response?.data) {
          console.error('API error response:', JSON.stringify(error.response.data, null, 2));
          throw new Error(`Failed to update product ${productId}: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Failed to update product ${productId}: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to update product ${productId}: ${error.message}`);
      }
      throw new Error(`Failed to update product ${productId}: ${error}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      console.log(`Deleting product ${productId}`);
      const response = await this.client.delete(`/products/${productId}`);
      
      // Log response if there is any (some APIs return data on delete)
      if (response.data) {
        console.log('Delete product response:', JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Failed to delete product ${productId}:`, error.message);
        if (error.response?.status === 404) {
          console.warn(`Product ${productId} not found (404) - might already be deleted`);
          // Optionally, you might want to not throw here if 404 is acceptable
          // return;
        }
        if (error.response?.data) {
          console.error('API error response:', JSON.stringify(error.response.data, null, 2));
          throw new Error(`Failed to delete product ${productId}: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Failed to delete product ${productId}: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to delete product ${productId}: ${error.message}`);
      }
      throw new Error(`Failed to delete product ${productId}: ${error}`);
    }
  }

  async searchProducts(
    query: string,
    params?: {
      page?: number;
      resultsPerPage?: number;
    }
  ): Promise<ProductList> {
    console.log(`Searching products with query: "${query}"`, params);
    try {
      return await this.getProducts({ ...params, q: query });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Search failed for query "${query}":`, error.message);
        throw new Error(`Failed to search products with query "${query}": ${error.message}`);
      }
      throw error;
    }
  }
}
