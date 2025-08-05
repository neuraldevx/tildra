#!/bin/bash

# Tildra Development Environment Startup Script

echo "🚀 Starting Tildra Development Environment..."
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run: python -m venv .venv"
    exit 1
fi

# Check if node_modules exists in web directory
if [ ! -d "web/node_modules" ]; then
    echo "❌ Node modules not found. Please run: cd web && npm install"
    exit 1
fi

echo "✅ Environment checks passed"
echo ""

# Function to run backend
start_backend() {
    echo "📡 Starting Backend API Server..."
    cd api
    ../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file ../.env.development --reload
}

# Function to run frontend
start_frontend() {
    echo "🌐 Starting Frontend Development Server..."
    cd web
    echo "🔍 Environment check:"
    echo "  - Using development Clerk keys (pk_test_...)"
    echo "  - API endpoint: http://127.0.0.1:8000"
    echo ""
    NODE_ENV=development npm run dev
}

# Ask user what to start
echo "What would you like to start?"
echo "1) Backend only"
echo "2) Frontend only" 
echo "3) Both (recommended)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        start_backend
        ;;
    2)
        start_frontend
        ;;
    3)
        echo "🎯 Starting both servers..."
        echo ""
        echo "💡 Backend will run on: http://127.0.0.1:8000"
        echo "💡 Frontend will run on: http://localhost:3000"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        echo ""
        
        # Start backend in background
        start_backend &
        BACKEND_PID=$!
        
        # Wait a moment for backend to start
        sleep 3
        
        # Start frontend in foreground
        start_frontend
        
        # Clean up background process when script exits
        kill $BACKEND_PID 2>/dev/null
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac