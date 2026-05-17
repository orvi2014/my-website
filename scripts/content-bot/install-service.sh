#!/usr/bin/env bash
set -euo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "❌ Run: source .env && bash install-service.sh"
  exit 1
fi

PLIST_SRC="$(dirname "$0")/com.robatdasorvi.contentbot.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.robatdasorvi.contentbot.plist"
LABEL="com.robatdasorvi.contentbot"

# Stop if already running
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true

# Write plist with real values
sed \
  "s|REPLACE_TOKEN|$TELEGRAM_BOT_TOKEN|g; s|REPLACE_CHAT_ID|$TELEGRAM_CHAT_ID|g" \
  "$PLIST_SRC" > "$PLIST_DEST"

launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"

echo ""
echo "✅ Content bot installed as a background service"
echo ""
echo "  Generates a story every 4 hours → Telegram for approval → auto-pushes to Vercel"
echo ""
echo "  Logs:   tail -f $(dirname "$0")/bot.log"
echo "  Errors: tail -f $(dirname "$0")/bot.error.log"
echo "  Stop:   launchctl bootout gui/$(id -u)/$LABEL"
echo "  Start:  launchctl bootstrap gui/$(id -u) $PLIST_DEST"
echo ""
