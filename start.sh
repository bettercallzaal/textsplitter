#!/bin/bash
# Start both the local YouTube transcript server and Vite dev server
cd "$(dirname "$0")"

# Install youtube-transcript-api if needed
pip3 install -q youtube-transcript-api 2>/dev/null

# Start Python server in background
python3 server.py &
PY_PID=$!

# Start Vite dev server
npm run dev &
VITE_PID=$!

echo ""
echo "  Text Splitter running at http://localhost:5173"
echo "  YouTube API server on http://localhost:8001"
echo "  Press Ctrl+C to stop both"
echo ""

# Cleanup on exit
trap "kill $PY_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
