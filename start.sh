#!/bin/bash
echo "=== ATS Resume Checker ==="
echo ""

# Backend
echo "Setting up backend..."
cd "$(dirname "$0")/backend"
python3 -m venv .venv 2>/dev/null
source .venv/bin/activate
pip install -q -r requirements.txt
echo "Starting backend on http://localhost:8000..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo "Setting up frontend..."
cd "$(dirname "$0")/frontend"
npm install --silent
echo "Starting frontend on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
