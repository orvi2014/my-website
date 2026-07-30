#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily SEO monitor for robatdasorvi.com
#
# Setup (one-time):
#   1. Install jq: brew install jq
#   2. Get GSC API credentials:
#      a) Go to console.cloud.google.com → Create project
#      b) Enable "Google Search Console API"
#      c) Create a Service Account → download JSON key
#      d) Add the service account email as a GSC user (Read permission)
#   3. Set env vars (add to ~/.zshrc or .env):
#      export GSC_SERVICE_KEY="path/to/service-account.json"
#      export GSC_SITE="https://robatdasorvi.com"
#
# Run manually:  ./scripts/seo-monitor.sh
# Run daily:     Add to crontab: 0 8 * * * /path/to/scripts/seo-monitor.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GSC_SITE_ID="${GSC_SITE:-sc-domain:robatdasorvi.com}"
SITE="https://www.robatdasorvi.com"
GSC_SERVICE_KEY="${GSC_SERVICE_KEY:-$(dirname "$0")/gsc-key.json}"
REPORT_DIR="$(dirname "$0")/../.seo-reports"
TODAY="$(date +%Y-%m-%d)"
REPORT_FILE="$REPORT_DIR/$TODAY.json"
SUMMARY_FILE="$REPORT_DIR/latest-summary.txt"
GOAL_FILE="$(dirname "$0")/../.seo-goal.json"
ENV_FILE="$(dirname "$0")/content-bot/.env"
GOAL_STATUS=""   # filled in by the goal check; drives the Telegram alert
DATE_28D_AGO="$(date -v-28d +%Y-%m-%d 2>/dev/null || date -d '28 days ago' +%Y-%m-%d)"
DATE_7D_AGO="$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)"
DATE_YESTERDAY="$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d 'yesterday' +%Y-%m-%d)"

mkdir -p "$REPORT_DIR"

# Capture the whole report to the summary file, then print it at the end.
# Deterministic (no tee race), and gives the Telegram alert something to quote.
exec 3>&1
exec 1>"$SUMMARY_FILE"

# ── Check dependencies ────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo "❌  jq not found. Install with: brew install jq"; exit 1
fi
if ! command -v curl &>/dev/null; then
  echo "❌  curl not found."; exit 1
fi

# ── Without GSC credentials: run quick public checks ─────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SEO DAILY REPORT — $(date '+%A, %d %B %Y')"
echo "  Site: $SITE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Check sitemap is accessible
echo ""
echo "► Sitemap"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/sitemap-index.xml")
if [ "$HTTP_STATUS" = "200" ]; then
  URL_COUNT=$(curl -s "$SITE/sitemap-index.xml" | grep -c "<loc>" || echo "?")
  echo "  ✓ Accessible ($URL_COUNT URLs indexed)"
else
  echo "  ✗ HTTP $HTTP_STATUS — sitemap unreachable!"
fi

# 2. Check robots.txt
echo ""
echo "► Robots.txt"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/robots.txt")
[ "$HTTP_STATUS" = "200" ] && echo "  ✓ OK" || echo "  ✗ HTTP $HTTP_STATUS"

# 3. Check llms.txt (AEO)
echo ""
echo "► llms.txt (AEO)"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/llms.txt")
[ "$HTTP_STATUS" = "200" ] && echo "  ✓ OK" || echo "  ✗ HTTP $HTTP_STATUS"

# 4. Page speed for home page
echo ""
echo "► Page load (home)"
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$SITE/" | awk '{printf "%.2fs", $1}')
echo "  $LOAD_TIME total (target: <1.5s)"

# 5. Key pages status
echo ""
echo "► Key pages"
PAGES=("/" "/chapters" "/about" "/glossary" "/store")
for PAGE in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE$PAGE")
  [ "$STATUS" = "200" ] && echo "  ✓ $PAGE" || echo "  ✗ $PAGE → HTTP $STATUS"
done

# ── GSC API (requires credentials) ───────────────────────────────────────────
GSC_ADC="${HOME}/.config/gcloud/application_default_credentials.json"
if [ -f "$GSC_ADC" ]; then
  echo ""
  echo "► Google Search Console (last 7 days vs prior 7 days)"

  # Get access token via user OAuth refresh token (gcloud ADC)
  TOKEN=$(python3 -c "
import json, urllib.request, urllib.parse, ssl
try:
  import certifi; ctx = ssl.create_default_context(cafile=certifi.where())
except ImportError:
  ctx = ssl.create_default_context()
creds = json.load(open('$GSC_ADC'))
data = urllib.parse.urlencode({
  'client_id': creds['client_id'],
  'client_secret': creds['client_secret'],
  'refresh_token': creds['refresh_token'],
  'grant_type': 'refresh_token',
}).encode()
req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
print(json.loads(urllib.request.urlopen(req, context=ctx).read())['access_token'])
" 2>/dev/null || echo "")

  if [ -n "$TOKEN" ]; then
    # Fetch 7-day performance
    PAYLOAD='{"startDate":"'"$DATE_7D_AGO"'","endDate":"'"$DATE_YESTERDAY"'","dimensions":[]}'
    RESPONSE=$(curl -s -X POST \
      "https://searchconsole.googleapis.com/webmasters/v3/sites/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$GSC_SITE_ID', safe=''))")/searchAnalytics/query" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-goog-user-project: seo-monitor-496506" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD")

    CLICKS=$(echo "$RESPONSE" | jq -r '.rows[0].clicks // 0')
    IMPRESSIONS=$(echo "$RESPONSE" | jq -r '.rows[0].impressions // 0')
    CTR=$(echo "$RESPONSE" | jq -r '.rows[0].ctr // 0 | . * 100 | floor | tostring + "%"')
    POSITION=$(echo "$RESPONSE" | jq -r '.rows[0].position // 0 | . * 10 | round / 10')

    echo "  Clicks:      $CLICKS"
    echo "  Impressions: $IMPRESSIONS"
    echo "  CTR:         $CTR"
    echo "  Avg pos:     $POSITION"

    # Save to JSON report
    echo "$RESPONSE" > "$REPORT_FILE"

    # Top 5 queries
    PAYLOAD_Q='{"startDate":"'"$DATE_7D_AGO"'","endDate":"'"$DATE_YESTERDAY"'","dimensions":["query"],"rowLimit":5}'
    QUERIES=$(curl -s -X POST \
      "https://searchconsole.googleapis.com/webmasters/v3/sites/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$GSC_SITE_ID', safe=''))")/searchAnalytics/query" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-goog-user-project: seo-monitor-496506" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD_Q")

    echo ""
    echo "► Top 5 search queries (last 7 days)"
    echo "$QUERIES" | jq -r '.rows[]? | "  \(.clicks) clicks — \(.keys[0])"'

    # ── Goal check ──────────────────────────────────────────────────────────
    if [ -f "$GOAL_FILE" ]; then
      GOAL_EVAL=$(CLICKS="$CLICKS" IMPRESSIONS="$IMPRESSIONS" POSITION="$POSITION" \
                  GOAL_FILE="$GOAL_FILE" TODAY="$TODAY" python3 - <<'PY'
import json, os
from datetime import date

def d(s): return date(*map(int, s.split("-")))

goal        = json.load(open(os.environ["GOAL_FILE"]))
today       = d(os.environ["TODAY"])
clicks      = float(os.environ["CLICKS"])
impressions = float(os.environ["IMPRESSIONS"])
position    = float(os.environ["POSITION"])

start  = d(goal["baseline"]["date"])
points = [(start, float(goal["baseline"]["clicks"]))] + \
         [(d(m["date"]), float(m["clicks"])) for m in goal["milestones"]]
final_date, final_clicks = points[-1]

# Expected clicks today: linear interpolation between the surrounding milestones
if today <= start:
    expected = points[0][1]
elif today >= final_date:
    expected = final_clicks
else:
    for (d0, c0), (d1, c1) in zip(points, points[1:]):
        if d0 <= today <= d1:
            span = (d1 - d0).days or 1
            expected = c0 + (c1 - c0) * ((today - d0).days / span)
            break

status = "ON TRACK" if clicks >= expected else "BEHIND"
print(f"STATUS={status}")
print(f"  Target:   {final_clicks:.0f} clicks/week by {final_date} ({(final_date - today).days} days left)")
print(f"  Expected: {expected:.1f} by now   Actual: {clicks:.0f}   → {status}")

sup = goal.get("supporting", {})
if position > sup.get("position_max", 1e9):
    print(f"  ! Avg position {position} worse than {sup['position_max']} — ranking too low to earn clicks")
if impressions < sup.get("impressions_min", 0):
    print(f"  ! Impressions {impressions:.0f} below {sup['impressions_min']} — not enough visibility to convert")
PY
) || GOAL_EVAL="STATUS=ERROR"

      GOAL_STATUS=$(echo "$GOAL_EVAL" | sed -n 's/^STATUS=//p')
      echo ""
      echo "► Goal"
      echo "$GOAL_EVAL" | grep -v '^STATUS=' || true
    fi
  else
    echo "  ⚠ Could not obtain token — run: gcloud auth application-default login"
  fi
else
  echo ""
  echo "  ℹ  GSC API not configured."
  echo "     Run: bash /tmp/gsc-login.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Restore stdout and print the report ──────────────────────────────────────
exec 1>&3
cat "$SUMMARY_FILE"

# ── Telegram alert ───────────────────────────────────────────────────────────
# Reuses the content-bot credentials rather than duplicating the token elsewhere.
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  TELEGRAM_BOT_TOKEN=$(sed -n 's/^TELEGRAM_BOT_TOKEN=//p' "$ENV_FILE" | tr -d '"' | tr -d "\r")
  TELEGRAM_CHAT_ID=$(sed -n 's/^TELEGRAM_CHAT_ID=//p' "$ENV_FILE" | tr -d '"' | tr -d "\r")
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  case "$GOAL_STATUS" in
    "ON TRACK") ICON="✅" ;;
    "BEHIND")   ICON="🔴" ;;
    *)          ICON="⚠️" ;;
  esac
  ALERT="$ICON SEO weekly — ${GOAL_STATUS:-no goal data}

$(sed -n '/► Google Search Console/,$p' "$SUMMARY_FILE")"

  curl -s -o /dev/null -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${ALERT}" || echo "  ⚠ Telegram alert failed"
fi
