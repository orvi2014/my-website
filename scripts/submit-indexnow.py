#!/usr/bin/env python3
"""
Submit all site URLs to IndexNow (Bing, Yandex) for instant crawling.

Run after publishing new content:
  python3 scripts/submit-indexnow.py

For Google: manually request indexing in GSC URL Inspection tool:
  https://search.google.com/search-console/inspect
"""
import json, os, glob, re, ssl, urllib.request, urllib.error

# macOS Python 3.14 ships without root certs; create an unverified context for
# this local utility script only — we're not sending credentials, just URLs.
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

SITE = "https://www.robatdasorvi.com"
KEY  = "f344b0119d8ce5bc6fb725bdd18bae3a"
KEY_LOCATION = f"{SITE}/{KEY}.txt"

STATIC_URLS = [
    "/",
    "/chapters",
    "/about",
]

def slug_from_path(path):
    return os.path.splitext(os.path.basename(path))[0]

def parse_frontmatter(path):
    with open(path, encoding="utf-8") as f:
        content = f.read()
    m = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm

def collect_urls():
    urls = [f"{SITE}{p}" for p in STATIC_URLS]
    stories_dir = os.path.join(os.path.dirname(__file__), "..", "src", "content", "stories")
    for path in sorted(glob.glob(os.path.join(stories_dir, "*.md"))):
        fm = parse_frontmatter(path)
        category = fm.get("category", "")
        slug = slug_from_path(path)
        if category:
            urls.append(f"{SITE}/chapters/{category}/{slug}")
    return urls

def submit(urls):
    payload = json.dumps({
        "host": "www.robatdasorvi.com",
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode()

    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl_ctx))
    try:
        resp = opener.open(req, timeout=30)
        print(f"IndexNow: {resp.status} — submitted {len(urls)} URLs to Bing/Yandex")
    except urllib.error.HTTPError as e:
        print(f"IndexNow error: HTTP {e.code} — {e.read().decode()}")

if __name__ == "__main__":
    urls = collect_urls()
    print(f"Submitting {len(urls)} URLs:")
    for u in urls:
        print(f"  {u}")
    print()
    submit(urls)
    print()
    print("Google does not support IndexNow. Request indexing manually:")
    print("  https://search.google.com/search-console/inspect")
    print("Paste each article URL and click 'Request Indexing'.")
