#!/bin/bash

# Einfacher Start ohne Supervisord

echo "==================================="
echo "ePages MCP Server - Simple Start"
echo "==================================="

# Port setzen (falls nicht gesetzt)
if [ -z "$PORT" ]; then
    export PORT=3000
    echo "Using default port: $PORT"
fi

# .env laden falls vorhanden
if [ -f .env ]; then
    export $(cat .env | xargs)
    echo "Environment variables loaded from .env"
fi

# Server starten
echo "Starting server on port $PORT..."
echo "Press Ctrl+C to stop"
echo ""
node web-server.js