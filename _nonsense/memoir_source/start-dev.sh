#!/bin/bash
# Start Memoir.ai in development mode
# This script starts both the frontend dev server and Electron

echo "🚀 Starting Memoir.ai Desktop App (Development Mode)"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10+ first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Start frontend dev server in background
echo "🎨 Starting frontend dev server..."
cd frontend
npm run dev > ../frontend-dev.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "⏳ Waiting for frontend to be ready..."
sleep 3

# Start Electron
echo "⚡ Launching Electron..."
npm run electron:dev

# Cleanup on exit
cleanup() {
    echo ""
    echo "🔄 Shutting down..."
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Stopped frontend dev server"
}

trap cleanup EXIT
