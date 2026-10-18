#!/bin/sh
# Start the oche dev server on port 8000, detached from the calling shell.
# Survives closing the terminal or the Claude Code session.
# Log: .next/dev-8000.log   PID: .next/dev-8000.pid
# Stop: kill "$(cat .next/dev-8000.pid)"
cd "$(dirname "$0")/.." || exit 1
mkdir -p .next
if [ -f .next/dev-8000.pid ] && kill -0 "$(cat .next/dev-8000.pid)" 2>/dev/null; then
  echo "already running on http://127.0.0.1:8000 (pid $(cat .next/dev-8000.pid))"
  exit 0
fi
nohup node_modules/.bin/next dev --hostname 127.0.0.1 --port 8000 >.next/dev-8000.log 2>&1 </dev/null &
echo $! >.next/dev-8000.pid
echo "started on http://127.0.0.1:8000 (pid $(cat .next/dev-8000.pid))"
