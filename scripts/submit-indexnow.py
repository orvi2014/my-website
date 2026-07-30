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

# Each participating engine runs its own endpoint. api.indexnow.org is meant to
# fan out to all of them, but it inherits Bing's authorisation check, so a Bing
# rejection there would otherwise hide a successful Yandex submission.
ENDPOINTS = [
    ("IndexNow (shared)", "https://api.indexnow.org/indexnow"),
    ("Bing",              "https://www.bing.com/indexnow"),
    ("Yandex",            "https://yandex.com/indexnow"),
]

FORBIDDEN_HINT = """
    Bing rejects IndexNow for hosts it has no record of. Fix, once:
      1. https://www.bing.com/webmasters  ->  Import from Google Search Console
         (fastest: the domain is already verified there, so no site change)
      2. Submit https://www.robatdasorvi.com/sitemap-index.xml in Bing
      3. Re-run this script
    Verifying by meta tag instead: set PUBLIC_BING_VERIFICATION in .env and redeploy."""


def check_key_file():
    """A bad key file causes the same 403 as an unverified host. Rule it out first."""
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl_ctx))
    try:
        resp = opener.open(KEY_LOCATION, timeout=15)
        body = resp.read().decode().strip()
    except Exception as e:
        print(f"  key file UNREACHABLE at {KEY_LOCATION}: {e}")
        return False
    if body != KEY:
        print(f"  key file at {KEY_LOCATION} contains {body!r}, expected {KEY!r}")
        return False
    print(f"  key file OK ({KEY_LOCATION})")
    return True


def submit(urls):
    payload = json.dumps({
        "host": "www.robatdasorvi.com",
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode()

    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl_ctx))
    accepted, forbidden = [], []

    for name, endpoint in ENDPOINTS:
        req = urllib.request.Request(
            endpoint, data=payload,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            resp = opener.open(req, timeout=30)
            print(f"  {name}: HTTP {resp.status} — accepted {len(urls)} URLs")
            accepted.append(name)
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:200]
            print(f"  {name}: HTTP {e.code} — {body}")
            if e.code == 403:
                forbidden.append(name)
        except Exception as e:
            print(f"  {name}: failed — {e}")

    print()
    if accepted:
        print(f"Accepted by: {', '.join(accepted)}")
    else:
        print("No endpoint accepted the submission.")
    if forbidden:
        print(f"Rejected as unauthorised by: {', '.join(forbidden)}")
        print(FORBIDDEN_HINT)
    # Partial success is still a failure to report: a silent 403 is how this
    # went unnoticed in the first place.
    return bool(accepted) and not forbidden

if __name__ == "__main__":
    import sys

    urls = collect_urls()
    print(f"Collected {len(urls)} URLs")
    if "-v" in sys.argv or "--verbose" in sys.argv:
        for u in urls:
            print(f"  {u}")

    print("\nPreflight:")
    key_ok = check_key_file()

    print("\nSubmitting:")
    ok = submit(urls)

    print()
    print("Google does not support IndexNow. Request indexing manually:")
    print("  https://search.google.com/search-console/inspect")

    sys.exit(0 if (ok and key_ok) else 1)
