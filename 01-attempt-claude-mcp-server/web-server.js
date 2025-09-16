import express from 'express';
import cors from 'cors';
import axios from 'axios';3
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'anthropic-version', 'anthropic-beta']
}));
app.use(express.json());

const EPAGES_BASE_URL = process.env.EPAGES_BASE_URL || 'https://api.epages.com';
const DEFAULT_SHOP_ID = process.env.EPAGES_SHOP_ID || '';

async function makeEpagesRequest(endpoint, params) {
  try {
    const response = await axios.get(`${EPAGES_BASE_URL}${endpoint}`, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        status: error.response?.status || 500,
        message: error.response?.statusText || 'API Error',
        data: error.response?.data
      };
    }
    throw error;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'epages-mcp-server' });
});

app.get('/api/products', async (req, res) => {
  try {
    const shopId = req.query.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    console.log(`Fetching products for shopId: ${shopId}, page: ${req.query.page}, resultsPerPage: ${req.query.resultsPerPage}, q: ${req.query.q}`);
    
    const data = await makeEpagesRequest(`/${shopId}/products`, {
      page: req.query.page || 1,
      resultsPerPage: req.query.resultsPerPage || 10,
      q: req.query.q
    });
    
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.get('/api/products/:productId', async (req, res) => {
  try {
    const shopId = req.query.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    const data = await makeEpagesRequest(`/${shopId}/products/${req.params.productId}`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.get('/api/products/:productId/variations', async (req, res) => {
  try {
    const shopId = req.query.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    const data = await makeEpagesRequest(`/${shopId}/products/${req.params.productId}/variations`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.get('/api/products/:productId/categories', async (req, res) => {
  try {
    const shopId = req.query.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    const data = await makeEpagesRequest(`/${shopId}/products/${req.params.productId}/categories`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.get('/api/products/export', async (req, res) => {
  try {
    const shopId = req.query.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    const response = await axios.get(`${EPAGES_BASE_URL}/${shopId}/products/export`, {
      params: { format: req.query.format || 'csv' },
      responseType: 'text'
    });
    
    res.type('text/csv').send(response.data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.post('/api/products/search', async (req, res) => {
  try {
    const shopId = req.body.shopId || DEFAULT_SHOP_ID;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    const data = await makeEpagesRequest(`/${shopId}/products`, {
      q: req.body.query,
      page: req.body.page || 1,
      resultsPerPage: req.body.resultsPerPage || 10
    });
    
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, details: error.data });
  }
});

app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'list_products',
        description: 'List all products in the shop',
        endpoint: 'GET /api/products',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          page: 'Page number for pagination',
          resultsPerPage: 'Number of results per page',
          q: 'Search query'
        }
      },
      {
        name: 'get_product',
        description: 'Get details of a specific product',
        endpoint: 'GET /api/products/:productId',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          productId: 'Product ID (in URL path)'
        }
      },
      {
        name: 'search_products',
        description: 'Search for products',
        endpoint: 'POST /api/products/search',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          query: 'Search query',
          page: 'Page number',
          resultsPerPage: 'Number of results per page'
        }
      },
      {
        name: 'get_product_variations',
        description: 'Get variations of a product',
        endpoint: 'GET /api/products/:productId/variations',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          productId: 'Product ID (in URL path)'
        }
      },
      {
        name: 'get_product_categories',
        description: 'Get categories assigned to a product',
        endpoint: 'GET /api/products/:productId/categories',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          productId: 'Product ID (in URL path)'
        }
      },
      {
        name: 'export_products',
        description: 'Export products in CSV format',
        endpoint: 'GET /api/products/export',
        parameters: {
          shopId: 'Shop ID (optional if EPAGES_SHOP_ID is set)',
          format: 'Export format (default: csv)'
        }
      }
    ]
  });
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`ePages MCP Server running on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`API documentation: http://${HOST}:${PORT}/api/tools`);
});