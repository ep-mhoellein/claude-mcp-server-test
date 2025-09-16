# ePages MCP Server für Uberspace

REST API Server für die ePages Product API, optimiert für Uberspace Hosting.

## 🚀 Installation auf Uberspace

### Option A: Einfache Installation (ohne Supervisord)

```bash
# 1. Repository klonen
cd ~/
git clone <your-repo-url> epages-mcp-server
cd epages-mcp-server

# 2. Dependencies installieren
npm install

# 3. .env Datei erstellen
cp .env.example .env
nano .env  # Shop-ID eintragen

# 4. Server starten
chmod +x start-simple.sh
./start-simple.sh

# Oder direkt:
node web-server.js
```

**Tipp:** Nutze `screen` für dauerhafte Ausführung:
```bash
screen -S epages
./start-simple.sh
# Ctrl+A, dann D zum Verlassen
# screen -r epages zum Zurückkehren
```

### Option B: Production Setup (mit Supervisord)

```bash
# Setup-Script ausführen (macht alles automatisch)
chmod +x setup-uberspace.sh
./setup-uberspace.sh
```

Das Script erledigt:
- Installation der Dependencies
- Port-Zuweisung von Uberspace
- Supervisord Service-Konfiguration (Auto-Restart)
- Web-Backend Einrichtung

Danach:
```bash
# Shop-ID konfigurieren
nano .env

# Service neustarten
supervisorctl restart epages-mcp-server
```

## 📡 API Endpoints

Deine API ist erreichbar unter: `https://[dein-username].uber.space`

### Health Check
```
GET /health
```

### API Dokumentation
```
GET /api/tools
```

### Product Endpoints

#### Produkte auflisten
```
GET /api/products?shopId=YOUR_SHOP_ID&page=1&resultsPerPage=10
```

#### Produkt-Details abrufen
```
GET /api/products/{productId}?shopId=YOUR_SHOP_ID
```

#### Produkte suchen
```
POST /api/products/search
Body: {
  "shopId": "YOUR_SHOP_ID",
  "query": "suchbegriff",
  "page": 1,
  "resultsPerPage": 10
}
```

#### Produktvarianten abrufen
```
GET /api/products/{productId}/variations?shopId=YOUR_SHOP_ID
```

#### Produktkategorien abrufen
```
GET /api/products/{productId}/categories?shopId=YOUR_SHOP_ID
```

#### Produkte exportieren
```
GET /api/products/export?shopId=YOUR_SHOP_ID&format=csv
```

## 🔧 Service-Verwaltung

### Status prüfen
```bash
supervisorctl status epages-mcp-server
```

### Service stoppen
```bash
supervisorctl stop epages-mcp-server
```

### Service starten
```bash
supervisorctl start epages-mcp-server
```

### Service neustarten
```bash
supervisorctl restart epages-mcp-server
```

### Logs anzeigen
```bash
supervisorctl tail -f epages-mcp-server
```

## 🔑 Umgebungsvariablen

Die `.env` Datei enthält:

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `EPAGES_BASE_URL` | ePages API Base URL | https://api.epages.com |
| `EPAGES_SHOP_ID` | Deine Shop-ID | (muss gesetzt werden) |
| `PORT` | Server Port | (automatisch von Uberspace) |

## 📝 Verwendung in Claude Web-App

Nach der Installation kannst du die API-Endpoints direkt in Claude verwenden:

```javascript
// Beispiel: Produkte abrufen
const response = await fetch('https://[dein-username].uber.space/api/products?shopId=YOUR_SHOP_ID');
const products = await response.json();
```

## 🛠️ Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Server starten
npm start
```

## 📄 Lizenz

MIT