#!/usr/bin/env python3
"""
One-off CTR check for the 2026-10-14 title/description rewrite (commit d6828e8).

Compares Search Console clicks, impressions, CTR and position for the seven
rewritten pages over 2026-10-15..21 against the 7 days before the change
(2026-10-06..12), writes a report to .seo-reports/, and sends it to Telegram.
Runs once from the com.robatdasorvi.ctrcheck LaunchAgent, then unloads it.
"""
import json, os, ssl, subprocess, sys, urllib.parse, urllib.request

from google.oauth2 import service_account
import google.auth.transport.requests

HERE = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(HERE, "gsc-key.json")
REPORT = os.path.join(HERE, "..", ".seo-reports", "ctr-check-2026-10-23.txt")
LABEL = "com.robatdasorvi.ctrcheck"
PLIST = os.path.expanduser(f"~/Library/LaunchAgents/{LABEL}.plist")
GSC_SITE = "sc-domain:robatdasorvi.com"

BEFORE = ("2026-10-06", "2026-10-12")
AFTER = ("2026-10-15", "2026-10-21")
PAGES = {
    "Hungary 1954": "/chapters/football/the-hungary-side-of-the-1950s-the-greatest-team-to-never-win-a-world-cup",
    "Brazil 1970": "/chapters/football/was-the-1970-brazil-side-actually-the-greatest-team-ever-assembled-the-data-says-yes-but",
    "Galatasaray": "/chapters/football/how-galatasaray-turned-stadium-noise-into-a-tactical-weapon-and-the-science-behind-it",
    "Ajax 1970-74": "/chapters/football/ajax-1970-1974-how-eleven-dutch-players-permanently-changed-how-football-is-played",
    "Context window": "/chapters/ai-automation/why-context-window-size-is-the-thing-every-developer-should-care-about",
    "Vibe coding": "/chapters/ai-automation/ai-assisted-coding-vs-vibe-coding",
    "AC Milan": "/chapters/football/ac-milan-1988-1994-the-last-true-footballing-dynasty-and-why-none-have-come-close-since",
}


def query(token, start, end, dimensions):
    site = urllib.parse.quote(GSC_SITE, safe="")
    body = json.dumps({"startDate": start, "endDate": end, "dimensions": dimensions, "rowLimit": 1000}).encode()
    req = urllib.request.Request(
        f"https://searchconsole.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
        data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, context=ssl.create_default_context())).get("rows", [])


def by_page(rows):
    out = {}
    for r in rows:
        path = urllib.parse.urlparse(r["keys"][0]).path.rstrip("/")
        out[path] = r
    return out


def fmt(r):
    if not r:
        return "0 clk / 0 impr"
    return f"{r['clicks']:.0f} clk / {r['impressions']:.0f} impr / {r['ctr'] * 100:.1f}% / pos {r['position']:.1f}"


def totals(rows):
    return sum(r["clicks"] for r in rows), sum(r["impressions"] for r in rows)


def send_telegram(text):
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        print("Telegram not configured; report only written to disk")
        return
    data = urllib.parse.urlencode({"chat_id": chat, "text": text}).encode()
    urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=data,
                           context=ssl.create_default_context())


def unload_self():
    try:
        os.remove(PLIST)
    except FileNotFoundError:
        pass
    subprocess.run(["launchctl", "bootout", f"gui/{os.getuid()}/{LABEL}"], check=False)


def main():
    creds = service_account.Credentials.from_service_account_file(
        KEY_FILE, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    creds.refresh(google.auth.transport.requests.Request())

    before_rows = query(creds.token, *BEFORE, ["page"])
    after_rows = query(creds.token, *AFTER, ["page"])
    before, after = by_page(before_rows), by_page(after_rows)

    lines = [f"CTR check — title rewrite of 2026-10-14 (d6828e8)",
             f"Before {BEFORE[0]}..{BEFORE[1]}  vs  after {AFTER[0]}..{AFTER[1]}", ""]
    pc_b = pc_a = 0
    for name, path in PAGES.items():
        b, a = before.get(path), after.get(path)
        pc_b += b["clicks"] if b else 0
        pc_a += a["clicks"] if a else 0
        lines.append(f"{name}\n  before: {fmt(b)}\n  after:  {fmt(a)}")
    site_b, site_a = totals(before_rows), totals(after_rows)
    lines += ["",
              f"Rewritten pages: {pc_b:.0f} -> {pc_a:.0f} clicks",
              f"Whole site:      {site_b[0]:.0f} -> {site_a[0]:.0f} clicks ({site_b[1]:.0f} -> {site_a[1]:.0f} impressions)",
              f"Target (>= 10 clicks/week): {'MET' if site_a[0] >= 10 else 'MISSED'}"]
    report = "\n".join(lines)

    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w") as f:
        f.write(report + "\n")
    print(report)
    send_telegram(report)


if __name__ == "__main__":
    try:
        main()
    finally:
        if "--keep" not in sys.argv:
            unload_self()
