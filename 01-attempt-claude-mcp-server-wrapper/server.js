// enhanced-mcp-server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'anthropic-version', 'anthropic-beta']
}));
app.use(express.json());
app.use(morgan('combined'));

const baseUrl = process.env.EPAGES_BASE_URL || 'https://playground.quaese.uber.space';
const PORT = process.env.PORT || 3000;

// Tool-Definitionen laden
async function loadEpagesTools() {
  try {
    const response = await fetch(`${baseUrl}/api/tools`);
    const data = await response.json();
    return data.tools;
  } catch (error) {
    console.error('Fehler beim Laden der Tools:', error);
    return [];
  }
}

// MCP Server-Sent Events Endpoint
app.get('/sse', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Heartbeat senden
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Verbindung beenden handhaben
  req.on('close', () => {
    clearInterval(heartbeat);
    res.end();
  });

  // Initial connection message
  res.write('event: connected\n');
  res.write('data: MCP Server connected\n\n');
});

// MCP Initialize
app.post('/initialize', async (req, res) => {
  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'epages-mcp-shop',
        version: '1.0.0'
      }
    }
  });
});

// Liste aller verfügbaren Tools
app.post('/tools/list', async (req, res) => {
  try {
    const tools = await loadEpagesTools();

    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(tool.parameters || {}).map(([key, desc]) => [
                key,
                { 
                  type: 'string', 
                  description: typeof desc === 'string' ? desc : JSON.stringify(desc)
                }
              ])
            ),
            required: [] // Alle Parameter optional machen
          }
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: { 
        code: -32603, 
        message: `Fehler beim Laden der Tools: ${error.message}` 
      }
    });
  }
});

// Tool ausführen
app.post('/tools/call', async (req, res) => {
  try {
    const { name: toolName, arguments: args = {} } = req.body.params;
    
    console.log(`Tool-Aufruf: ${toolName}`, args);
    
    // Tool-Definition finden
    const tools = await loadEpagesTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' nicht gefunden. Verfügbare Tools: ${tools.map(t => t.name).join(', ')}`);
    }
    
    // URL und HTTP-Methode aus endpoint extrahieren
    const [method, path] = tool.endpoint.split(' ');
    let url = `${baseUrl}${path}`;
    
    // URL-Parameter ersetzen (z.B. :productId)
    if (args.productId && path.includes(':productId')) {
      url = url.replace(':productId', args.productId);
    }
    
    // Query-Parameter hinzufügen
    const queryParams = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      if (key !== 'productId' && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    if (queryParams.toString()) {
      url += '?' + queryParams.toString();
    }
    
    console.log(`Aufruf: ${method} ${url}`);
    
    // API-Aufruf ausführen
    const fetchOptions = {
      method: method,
      headers: {}
    };
    
    if (method === 'POST' && Object.keys(args).length > 0) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(args);
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('Tool-Fehler:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: { 
        code: -32603, 
        message: error.message 
      }
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(PORT, () => {
  console.log(`Enhanced MCP Server läuft auf Port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
});