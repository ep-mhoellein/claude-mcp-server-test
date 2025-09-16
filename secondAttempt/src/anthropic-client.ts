import Anthropic from '@anthropic-ai/sdk';
import { AnthropicConfig } from './types.js';

export class AnthropicClient {
  private client: Anthropic;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateProductDescription(productName: string, features?: string[]): Promise<string> {
    try {
      const prompt = `Generate a compelling product description for: ${productName}
${features ? `Features: ${features.join(', ')}` : ''}

Please create a professional, engaging description that would work well for an e-commerce product listing.`;

      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      throw new Error(`Failed to generate product description: ${error}`);
    }
  }

  async analyzeProduct(product: any): Promise<string> {
    try {
      const prompt = `Analyze this product data and provide insights:
${JSON.stringify(product, null, 2)}

Please provide insights about the product, pricing strategy, potential improvements, and market positioning.`;

      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      throw new Error(`Failed to analyze product: ${error}`);
    }
  }

  async generateProductTags(productName: string, description?: string): Promise<string[]> {
    try {
      const prompt = `Generate relevant tags for this product:
Name: ${productName}
${description ? `Description: ${description}` : ''}

Please provide 5-10 relevant tags that would help with product categorization and search.
Return only the tags separated by commas.`;

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const tags = response.content[0].type === 'text'
        ? response.content[0].text.split(',').map(tag => tag.trim())
        : [];

      return tags;
    } catch (error) {
      throw new Error(`Failed to generate product tags: ${error}`);
    }
  }
}