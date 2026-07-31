#!/usr/bin/env bash
# Re-authorise Application Default Credentials with every scope this repo needs.
#
#   bash scripts/gcloud-reauth.sh
#
# Exists because pasting the long --scopes flag into a terminal wraps, and zsh
# then reads the wrapped remainder as a separate command. gcloud logs in with
# its DEFAULT scopes instead, silently dropping webmasters and breaking
# seo-monitor.sh, which is easy to miss because the monitor reports zeros
# rather than failing.
set -euo pipefail

G="https://www.googleapis.com/auth"

# analytics.readonly is deliberately absent. Google blocks it for gcloud's
# shared client ID ("This app is blocked"), and because consent is all or
# nothing, including it fails the whole request and takes webmasters down
# with it. GA4 automation needs its own service account instead, granted
# Viewer on the property, the way gsc-key.json works for Search Console.
SCOPES="openid,${G}/cloud-platform,${G}/webmasters.readonly"

echo "Requesting scopes:"
echo "$SCOPES" | tr ',' '\n' | sed 's/^/  /'
echo

gcloud auth application-default login --scopes="$SCOPES"

echo
echo "Verifying what was actually granted..."
python3 - <<'PY'
import json, os, ssl, urllib.parse, urllib.request
ctx = ssl.create_default_context()
creds = json.load(open(os.path.expanduser("~/.config/gcloud/application_default_credentials.json")))
data = urllib.parse.urlencode({
    "client_id": creds["client_id"], "client_secret": creds["client_secret"],
    "refresh_token": creds["refresh_token"], "grant_type": "refresh_token",
}).encode()
tok = json.loads(urllib.request.urlopen(
    urllib.request.Request("https://oauth2.googleapis.com/token", data=data), context=ctx).read())["access_token"]
scopes = json.loads(urllib.request.urlopen(
    f"https://oauth2.googleapis.com/tokeninfo?access_token={tok}", context=ctx).read()).get("scope", "").split()

need = {"webmasters": "Search Console (seo-monitor.sh)"}
ok = True
for frag, what in need.items():
    got = any(frag in s for s in scopes)
    print(f"  {'OK  ' if got else 'MISS'} {frag:12} {what}")
    ok = ok and got
print()
print("Search Console access restored." if ok
      else "webmasters scope missing. Approve every scope on the consent screen.")
PY
