# ePages MCP Server (HTTP Transport)

Ein Model Context Protocol (MCP) Server für die Integration mit der ePages API und Anthropic AI, der über HTTP mit StreamableHTTPServerTransport läuft.

## Features

- **HTTP Transport**: Server läuft über HTTP mit StreamableHTTPServerTransport
- **SSE Support**: Server-Sent Events für Streaming-Antworten
- **Session Management**: Automatische Session-ID Verwaltung für stateful Operations
- **ePages API Integration**: Vollständige CRUD-Operationen für Produkte
- **Anthropic AI Integration**: KI-gestützte Produktbeschreibungen, Analysen und Tag-Generierung
- **MCP Kompatibilität**: Nahtlose Integration mit MCP-kompatiblen Clients

## Verfügbare Tools

### ePages API Tools
- `configure_epages` - Konfiguration der ePages API-Verbindung
- `get_products` - Abrufen aller Produkte
- `get_product` - Abrufen eines spezifischen Produkts
- `create_product` - Erstellen eines neuen Produkts
- `update_product` - Aktualisieren eines bestehenden Produkts
- `delete_product` - Löschen eines Produkts
- `search_products` - Produkte durchsuchen

### Anthropic AI Tools
- `configure_anthropic` - Konfiguration der Anthropic API-Verbindung
- `generate_product_description` - KI-generierte Produktbeschreibungen
- `analyze_product` - KI-Produktanalyse
- `generate_product_tags` - KI-generierte Produkt-Tags

## Installation

1. Dependencies installieren:
```bash
npm install
```

2. Projekt kompilieren:
```bash
npm run build
```

3. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
# Bearbeite .env mit deinen API-Credentials
```

## Verwendung

### Server starten

#### Entwicklung
```bash
npm run dev
```

#### Produktion
```bash
# Standard Port 3000
npm start

# Custom Port
PORT=8080 npm start
```

Der Server läuft dann auf:
- **Endpoint**: `http://localhost:3000/mcp`
- **GET-Requests**: SSE-Stream für Streaming-Antworten
- **POST-Requests**: JSON-RPC Messages

## HTTP API Dokumentation

### Wichtige Hinweise

1. **Accept Header erforderlich**: Der Client MUSS beide Content-Types akzeptieren:
   ```
   Accept: application/json, text/event-stream
   ```

2. **Session Management**:
   - Der Server generiert automatisch Session-IDs
   - Die Session-ID wird im Response-Header `mcp-session-id` zurückgegeben
   - Nachfolgende Requests müssen diese Session-ID im Request-Header senden

3. **Initialisierung erforderlich**:
   - Der Server muss zuerst mit einer `initialize` Nachricht initialisiert werden
   - Erst danach können andere Methoden aufgerufen werden

### Schritt-für-Schritt Anleitung

#### 1. Server initialisieren
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

**Wichtig**: Speichere die Session-ID aus dem Response-Header `mcp-session-id`!

#### 2. Session-ID aus Response extrahieren
```bash
# Mit grep
curl -siX POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}, "id": 1}' \
  | grep -i "mcp-session-id"
```

#### 3. Tools auflisten
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

#### 4. Tool aufrufen (Beispiel: ePages konfigurieren)
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "configure_epages",
      "arguments": {
        "baseUrl": "https://your-shop.epages.com",
        "accessToken": "your-token",
        "shopId": "your-shop-id"
      }
    },
    "id": 3
  }'
```

### Response Format

Die Antworten kommen als Server-Sent Events (SSE):
```
event: message
data: {"result": {...}, "jsonrpc": "2.0", "id": 1}
```

### Fehlerbehandlung

#### Fehlende Accept Header
```json
{
  "error": {
    "code": -32000,
    "message": "Not Acceptable: Client must accept both application/json and text/event-stream"
  }
}
```

#### Server nicht initialisiert
```json
{
  "error": {
    "code": -32000,
    "message": "Bad Request: Server not initialized"
  }
}
```

#### Session nicht gefunden
```json
{
  "error": {
    "code": -32001,
    "message": "Session not found"
  }
}
```

### Vollständiges Beispiel-Skript
```bash
#!/bin/bash

# 1. Server starten
PORT=3000 npm start &
SERVER_PID=$!
sleep 2

# 2. Initialisieren und Session-ID speichern
RESPONSE=$(curl -siX POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}, "id": 1}')

SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')

# 3. Tools auflisten
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 2}'

# Server beenden
kill $SERVER_PID
```

## API-Konfiguration

### ePages API
Du benötigst:
- `baseUrl`: Die Basis-URL deiner ePages API
- `accessToken`: Dein ePages API Access Token
- `shopId`: Deine Shop-ID

### Anthropic API
Du benötigst:
- `apiKey`: Dein Anthropic API Key

## Beispiele

### 1. Konfiguration
```javascript
// ePages konfigurieren
await callTool('configure_epages', {
  baseUrl: 'https://your-shop.epages.com',
  accessToken: 'your-token',
  shopId: 'your-shop-id'
});

// Anthropic konfigurieren
await callTool('configure_anthropic', {
  apiKey: 'your-anthropic-key'
});
```

### 2. Produkt erstellen
```javascript
await callTool('create_product', {
  name: 'Beispiel Produkt',
  description: 'Eine Beispielbeschreibung',
  priceAmount: 29.99,
  priceCurrency: 'EUR',
  stocklevel: 100,
  visible: true
});
```

### 3. KI-Produktbeschreibung generieren
```javascript
await callTool('generate_product_description', {
  productName: 'Gaming Maus',
  features: ['RGB-Beleuchtung', 'Ergonomisch', '12000 DPI']
});
```

### 4. Vollständiges Test-Beispiel mit Produkt-Operationen

```bash
# Session initialisieren
SESSION_ID=$(curl -siX POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}, "id": 1}' \
  | grep -i "mcp-session-id" | cut -d' ' -f2 | tr -d '\r')

# ePages konfigurieren
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "configure_epages",
      "arguments": {
        "baseUrl": "https://ep6unity.epages.systems",
        "accessToken": "your-token",
        "shopId": "DemoShop"
      }
    },
    "id": 2
  }'

# Produkte abrufen
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_products",
      "arguments": {}
    },
    "id": 3
  }'
```

## Technische Details

### Transport-Mechanismus
Der Server verwendet `StreamableHTTPServerTransport` aus dem MCP SDK, der folgende Features bietet:
- **Stateful Sessions**: Automatische Session-Verwaltung mit UUID-basierten Session-IDs
- **SSE Streaming**: GET-Requests für Server-Sent Events
- **JSON-RPC over HTTP**: POST-Requests für synchrone Operationen
- **DNS Rebinding Protection**: Validierung von Host-Headers

### Architektur-Änderungen gegenüber StdioServerTransport
- **Von STDIO zu HTTP**: Der Server läuft nicht mehr über Standard Input/Output, sondern als HTTP-Server
- **Session Management**: Jeder Client erhält eine eigene Session-ID für state management
- **Multiplexing**: Mehrere Clients können gleichzeitig verbunden sein
- **Port-Konfiguration**: Flexibler Port über Umgebungsvariable `PORT`
## Lizenz

MIT