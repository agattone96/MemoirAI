#!/bin/bash
# Kill existing process on port 5001
pid=$(lsof -ti:5001)
if [ -n "$pid" ]; then
  echo "Killing process $pid on port 5001..."
  kill -9 $pid
fi

# Start the server in background
echo "Starting server..."
python3 backend/app.py > /dev/null 2>&1 &

# Wait for server to initialize
sleep 2

# Open in browser
echo "Opening UI..."
open http://127.0.0.1:5001
