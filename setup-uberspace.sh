#!/bin/bash

# ePages MCP Server - Uberspace Setup Script

echo "==================================="
echo "ePages MCP Server - Uberspace Setup"
echo "==================================="

# Prüfe Node.js Version
echo "Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"

# Installiere Dependencies
echo "Installing dependencies..."
npm ci

# Port ermitteln
if [ -z "$PORT" ]; then
    echo "Getting free port from Uberspace..."
    PORT=$(uberspace port add)
    echo "Port assigned: $PORT"
else
    echo "Using existing PORT: $PORT"
fi

# Erstelle .env Datei wenn nicht vorhanden
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
EPAGES_BASE_URL=https://api.epages.com
EPAGES_SHOP_ID=
PORT=$PORT
EOF
    echo ".env file created. Please edit it to add your EPAGES_SHOP_ID"
fi

# Supervisord Service erstellen
echo "Creating supervisord service..."
cat > ~/etc/services.d/epages-mcp-server.ini << EOF
[program:epages-mcp-server]
directory=$(pwd)
command=node web-server.js
autostart=yes
autorestart=yes
environment=NODE_ENV="production",PORT="$PORT"
EOF

# Service neustarten
echo "Restarting supervisord..."
supervisorctl reread
supervisorctl update
supervisorctl restart epages-mcp-server

# Web-Backend konfigurieren
echo "Configuring web backend..."
uberspace web backend set / --http --port $PORT

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "Your ePages MCP Server is now running on:"
echo "https://$USER.uber.space"
echo ""
echo "API Documentation: https://$USER.uber.space/api/tools"
echo "Health Check: https://$USER.uber.space/health"
echo ""
echo "Next steps:"
echo "1. Edit .env file to add your EPAGES_SHOP_ID"
echo "2. Restart the service: supervisorctl restart epages-mcp-server"
echo ""
echo "Service commands:"
echo "  Status:  supervisorctl status epages-mcp-server"
echo "  Stop:    supervisorctl stop epages-mcp-server"
echo "  Start:   supervisorctl start epages-mcp-server"
echo "  Restart: supervisorctl restart epages-mcp-server"
echo "  Logs:    supervisorctl tail -f epages-mcp-server"