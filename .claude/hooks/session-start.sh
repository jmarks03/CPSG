#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR/strange-metal-app"

echo "Installing strange-metal-app dependencies..."
npm install

echo "Session start hook complete."
