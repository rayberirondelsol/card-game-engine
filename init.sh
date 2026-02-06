#!/bin/bash

# Card Game Engine - Development Server Startup Script
echo "=== Card Game Engine - Starting Development Servers ==="

# Kill any existing processes on our ports
echo "[Init] Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

sleep 1

# Ensure data directories exist
mkdir -p server/data server/uploads

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
  echo "[Init] Installing server dependencies..."
  npm install --prefix server
fi

if [ ! -d "client/node_modules" ]; then
  echo "[Init] Installing client dependencies..."
  npm install --prefix client
fi

if [ ! -d "node_modules" ]; then
  echo "[Init] Installing root dependencies..."
  npm install
fi

# Start backend server in background
echo "[Init] Starting backend server on port 3001..."
node server/src/index.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "[Init] Waiting for backend to start..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "[Init] Backend is ready!"
    break
  fi
  sleep 1
done

# Start frontend dev server in background
echo "[Init] Starting frontend dev server on port 5173..."
npx --prefix client vite --port 5173 &
FRONTEND_PID=$!

echo ""
echo "=== Servers Started ==="
echo "  Backend API: http://localhost:3001"
echo "  Frontend:    http://localhost:5173"
echo "  Health:      http://localhost:3001/api/health"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"

# Wait for any background process to finish
wait
