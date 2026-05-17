#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Content Bot Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ "${NODE_VER:-0}" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found: $(node -v 2>/dev/null || echo none))"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# Check claude CLI
if ! command -v claude &>/dev/null; then
  echo "❌ Claude Code CLI not found"
  exit 1
fi
echo "✓ Claude CLI: $(which claude)"

# Create dirs
mkdir -p drafts
echo "✓ drafts/ directory ready"

echo ""
echo "Next steps:"
echo ""
echo "  1. Create a Telegram bot:"
echo "     → Open Telegram, message @BotFather"
echo "     → Send: /newbot"
echo "     → Copy the token it gives you"
echo ""
echo "  2. Get your Telegram chat ID:"
echo "     → Message @userinfobot"
echo "     → Copy the 'Id' number"
echo ""
echo "  3. Create .env:"
echo "     cp .env.example .env"
echo "     # Edit .env and paste your token + chat ID"
echo ""
echo "  4. Test run (Ctrl+C to stop):"
echo "     source .env && node index.js"
echo ""
echo "  5. Install as background service (auto-starts on reboot):"
echo "     source .env && bash install-service.sh"
echo ""
