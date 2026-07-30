#!/usr/bin/env python3
"""
Submit sitemap and check indexing status via Google Search Console API.

Run:
  python3 scripts/gsc-submit.py            # submit sitemap + show status
  python3 scripts/gsc-submit.py --inspect  # also check each article URL
"""
import json, os, sys, ssl, urllib.request, urllib.parse, urllib.error

# macOS Python 3.14 ships without root certs — unverified context for local utility only
_ssl = ssl.create_default_context()
_ssl.check_hostname = False
_ssl.verify_mode = ssl.CERT_NONE

try:
    from google.oauth2 import service_account
    import google.auth.transport.requests
except ImportError:
    print("Missing google-auth. Run: pip install google-auth")
    sys.exit(1)

SITE            = "https://www.robatdasorvi.com"
SITEMAP_URL     = f"{SITE}/sitemap-index.xml"
KEY_FILE        = os.path.join(os.path.dirname(__file__), "gsc-key.json")
SCOPES          = ["https://www.googleapis.com/auth/webmasters"]

GSC_SITE        = "sc-domain:robatdasorvi.com"  # Domain property (not URL prefix)
SITE_ENCODED    = urllib.parse.quote(GSC_SITE, safe="")
SITEMAP_ENCODED = urllib.parse.quote(SITEMAP_URL, safe="")
GSC_BASE        = "https://www.googleapis.com/webmasters/v3"
SC_BASE         = "https://searchconsole.googleapis.com/v1"


def get_token():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def api(method, url, token, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl))
    try:
        resp = opener.open(req, timeout=30)
        raw = resp.read()
        return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return e.code, json.loads(raw) if raw else {}


def submit_sitemap(token):
    url = f"{GSC_BASE}/sites/{SITE_ENCODED}/sitemaps/{SITEMAP_ENCODED}"
    status, body = api("PUT", url, token)
    if status in (200, 204):
        print(f"  Sitemap submitted: {SITEMAP_URL}")
    else:
        print(f"  Sitemap error {status}: {body}")


def list_sitemaps(token):
    url = f"{GSC_BASE}/sites/{SITE_ENCODED}/sitemaps"
    status, body = api("GET", url, token)
    if status != 200:
        print(f"  List error {status}: {body}")
        return
    sitemaps = body.get("sitemap", [])
    print(f"\n  Sitemaps on file ({len(sitemaps)}):")
    for s in sitemaps:
        warnings = s.get("warnings", 0)
        errors   = s.get("errors", 0)
        indexed  = sum(c.get("count", 0) for c in s.get("contents", []) if c.get("type") == "web")
        status_icon = "ok" if errors == 0 else f"{errors} errors"
        print(f"    {s['path']}  |  indexed: {indexed}  |  {status_icon}")


def inspect_url(token, page_url):
    url = f"{SC_BASE}/urlInspection/index:inspect"
    body = {"inspectionUrl": page_url, "siteUrl": GSC_SITE}
    status, resp = api("POST", url, token, body)
    if status != 200:
        return f"error {status}"
    result = resp.get("inspectionResult", {})
    index  = result.get("indexStatusResult", {})
    verdict = index.get("verdict", "UNKNOWN")
    coverage = index.get("coverageState", "")
    return f"{verdict}  {coverage}"


def main():
    inspect = "--inspect" in sys.argv

    print("Authenticating with GSC service account...")
    token = get_token()
    print("  OK\n")

    print("Submitting sitemap...")
    submit_sitemap(token)
    list_sitemaps(token)

    if inspect:
        stories_dir = os.path.join(os.path.dirname(__file__), "..", "src", "content", "stories")
        import glob, re

        def parse_frontmatter(path):
            with open(path) as f:
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

        import time
        paths = sorted(glob.glob(os.path.join(stories_dir, "*.md")))
        print(f"\n  Inspecting {len(paths)} article URLs...")
        not_indexed = []
        for i, path in enumerate(paths):
            fm      = parse_frontmatter(path)
            slug    = os.path.splitext(os.path.basename(path))[0]
            category = fm.get("category", "")
            page_url = f"{SITE}/chapters/{category}/{slug}"
            try:
                verdict = inspect_url(token, page_url)
            except Exception as e:
                verdict = f"timeout/error"
            icon = "ok" if "PASS" in verdict else "  "
            print(f"    [{icon}] {slug[:55]:<55}  {verdict}")
            if "PASS" not in verdict:
                not_indexed.append(page_url)
            if i < len(paths) - 1:
                time.sleep(0.5)

        if not_indexed:
            print(f"\n  {len(not_indexed)} URLs not yet indexed:")
            for u in not_indexed:
                print(f"    {u}")
            print(f"\n  Request indexing for each at:")
            print(f"    https://search.google.com/search-console/inspect")
    else:
        print("\n  Run with --inspect to check indexing status of each article.")


if __name__ == "__main__":
    main()
