#!/usr/bin/env python3
"""
Submit URLs to Bing via the Webmaster API (SubmitUrlBatch).

More reliable than IndexNow for this site: it reports the remaining daily
quota and per-call errors instead of a bare 403.

Setup:
  bing.com/webmasters -> Settings -> API Access -> API Key
  Put it in scripts/content-bot/.env as BING_API_KEY=... (or export it)

Run:
  python3 scripts/bing-submit.py            # submit priority URLs within quota
  python3 scripts/bing-submit.py --quota    # just show the quota
  python3 scripts/bing-submit.py --all      # submit everything quota allows
"""
import json, os, glob, re, ssl, sys, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

# macOS Python 3.14 ships without root certs; local utility script only.
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

SITE = "https://www.robatdasorvi.com"
API = "https://ssl.bing.com/webmaster/api.svc/json"
ENV_FILE = os.path.join(os.path.dirname(__file__), "content-bot", ".env")
STATE_FILE = os.path.join(os.path.dirname(__file__), "..", ".seo-reports", "bing-submitted.json")

# Daily quota is small and resubmitting an unchanged URL buys nothing, so skip
# anything sent recently unless --force is passed.
RESUBMIT_AFTER_DAYS = 14

# Submitted first when quota is tight. The cluster hub and the two pages
# already drawing impressions are worth more than a 60th essay.
PRIORITY = [
    "/",
    "/chapters/football/greatest-football-teams-of-all-time",
    "/chapters/football/was-the-1970-brazil-side-actually-the-greatest-team-ever-assembled-the-data-says-yes-but",
    "/chapters/football/the-hungary-side-of-the-1950s-the-greatest-team-to-never-win-a-world-cup",
    "/chapters/football",
    "/chapters",
]


def api_key():
    key = os.environ.get("BING_API_KEY", "").strip()
    if key:
        return key
    if os.path.exists(ENV_FILE):
        for line in open(ENV_FILE):
            if line.startswith("BING_API_KEY="):
                return line.partition("=")[2].strip().strip('"')
    return ""


def call(method, path, key, body=None):
    url = f"{API}/{path}{'&' if '?' in path else '?'}apikey={key}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl_ctx))
    try:
        resp = opener.open(req, timeout=30)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:300]}


def collect_urls():
    urls = list(PRIORITY)
    stories = os.path.join(os.path.dirname(__file__), "..", "src", "content", "stories")
    for path in sorted(glob.glob(os.path.join(stories, "*.md"))):
        text = open(path, encoding="utf-8").read()
        m = re.search(r'^category:\s*"?([\w-]+)"?', text, re.M)
        if not m:
            continue
        slug = os.path.splitext(os.path.basename(path))[0]
        p = f"/chapters/{m.group(1)}/{slug}"
        if p not in urls:
            urls.append(p)
    return [SITE + p if p != "/" else SITE + "/" for p in urls]


def load_state():
    try:
        return json.load(open(STATE_FILE))
    except Exception:
        return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    json.dump(state, open(STATE_FILE, "w"), indent=2, sort_keys=True)


def filter_recent(urls, state, force):
    if force:
        return urls, 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=RESUBMIT_AFTER_DAYS)
    fresh, skipped = [], 0
    for u in urls:
        seen = state.get(u)
        if seen:
            try:
                if datetime.fromisoformat(seen) > cutoff:
                    skipped += 1
                    continue
            except ValueError:
                pass
        fresh.append(u)
    return fresh, skipped


def main():
    key = api_key()
    if not key:
        print("BING_API_KEY not set.")
        print("  bing.com/webmasters -> Settings -> API Access -> API Key")
        print(f"  then add BING_API_KEY=<key> to {ENV_FILE}")
        return 1

    status, quota = call("GET", f"GetUrlSubmissionQuota?siteUrl={SITE}", key)
    if status != 200:
        print(f"Quota check failed: HTTP {status} — {json.dumps(quota)[:300]}")
        if status in (401, 403):
            print("  The API key is rejected. Confirm it was copied in full and that")
            print(f"  {SITE} is the verified property in Bing Webmaster Tools.")
        return 1

    d = quota.get("d", quota)
    daily = d.get("DailyQuota", 0)
    monthly = d.get("MonthlyQuota", 0)
    print(f"Quota: {daily} URLs today, {monthly} this month")
    if "--quota" in sys.argv:
        return 0

    state = load_state()
    urls, skipped = filter_recent(collect_urls(), state, "--force" in sys.argv)
    if skipped:
        print(f"Skipping {skipped} URLs submitted in the last {RESUBMIT_AFTER_DAYS} days (--force to override)")
    if not urls:
        print("Nothing new to submit.")
        return 0

    if daily <= 0:
        print(f"{len(urls)} URLs waiting but no daily quota left. Try again tomorrow.")
        return 1

    if len(urls) > daily:
        print(f"Quota allows {daily} of {len(urls)} URLs; sending the highest priority first")
        urls = urls[:daily]

    print(f"\nSubmitting {len(urls)} URLs:")
    for u in urls:
        print(f"  {u}")

    status, res = call("POST", "SubmitUrlBatch", key,
                       {"siteUrl": SITE, "urlList": urls})
    print()
    if status == 200:
        now = datetime.now(timezone.utc).isoformat()
        for u in urls:
            state[u] = now
        save_state(state)
        print(f"Bing accepted {len(urls)} URLs (HTTP 200)")
        return 0
    print(f"Bing rejected the batch: HTTP {status} — {json.dumps(res)[:400]}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
