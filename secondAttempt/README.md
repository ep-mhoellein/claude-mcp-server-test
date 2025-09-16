# ePages MCP Server

Ein Model Context Protocol (MCP) Server für die Integration mit der ePages API und Anthropic AI.

## Features

- **ePages API Integration**: Vollständige CRUD-Operationen für Produkte
- **Anthropic AI Integration**: KI-gestützte Produktbeschreibungen, Analysen und Tag-Generierung
- **MCP Kompatibilität**: Nahtlose Integration mit Claude und anderen MCP-kompatiblen Clients

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

### Entwicklung
```bash
npm run dev
```

### Produktion
```bash
npm start
```

### Mit MCP Client
Der Server kann mit jedem MCP-kompatiblen Client verwendet werden. Beispiel-Konfiguration für Claude Desktop:

```json
{
  "mcpServers": {
    "epages": {
      "command": "node",
      "args": ["/pfad/zu/diesem/projekt/dist/index.js"]
    }
  }
}
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

### 4. DEV Test
```
  node dist/index.js

  # Dann nacheinander eingeben:
  {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "configure_epages", "arguments": {"baseUrl": "https://ep6unity.epages.systems", "shopId": "DemoShop"}}}

  {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_products", "arguments": {}}}
```
## Lizenz

MIT