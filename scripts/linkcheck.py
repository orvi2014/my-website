#!/usr/bin/env python3
"""Crawl built dist/ HTML and report broken internal links + dead external links.

Run after `npm run build`:
  python3 scripts/linkcheck.py                 # internal + external
  python3 scripts/linkcheck.py --internal-only # fast, no network

False positives to expect: hrefs inside <script> blocks are included, so
client-side template literals appear as broken internal links. Hosts that
block automated requests (UEFA, McKinsey, BBC, Cloudflare-fronted sites)
report 403/406/429/timeout and are usually fine in a browser. 404 and 410
are the real signal.
"""
import os, re, sys, json, ssl, urllib.request, urllib.error, urllib.parse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

# The Vercel adapter emits static pages to dist/client instead of dist, so
# detect which layout this build produced rather than assuming.
DIST = "dist/client" if os.path.isdir("dist/client") else "dist"
SITE = "https://www.robatdasorvi.com"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HREF = re.compile(r'href="([^"]+)"')


def built_paths():
    """Every path dist/ can actually serve."""
    paths = set()
    for root, _, files in os.walk(DIST):
        for f in files:
            full = os.path.join(root, f)
            rel = "/" + os.path.relpath(full, DIST).replace(os.sep, "/")
            paths.add(rel)
            if rel.endswith("/index.html"):
                clean = rel[: -len("index.html")]
                paths.add(clean)             # /foo/
                paths.add(clean.rstrip("/") or "/")  # /foo
    return paths


def collect():
    internal = defaultdict(set)   # path -> set(source files)
    external = defaultdict(set)
    for root, _, files in os.walk(DIST):
        for f in files:
            if not f.endswith(".html"):
                continue
            src = os.path.join(root, f)
            html = open(src, encoding="utf-8", errors="ignore").read()
            for href in HREF.findall(html):
                href = href.strip()
                if href.startswith(("mailto:", "tel:", "javascript:", "#", "data:")):
                    continue
                if href.startswith(SITE):
                    href = href[len(SITE):] or "/"
                if href.startswith("http"):
                    external[href.split("#")[0]].add(src)
                elif href.startswith("/"):
                    internal[href.split("#")[0].split("?")[0]].add(src)
    return internal, external


def check_external(url):
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                "Accept": "*/*",
            })
            opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
            resp = opener.open(req, timeout=20)
            return url, resp.status
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (403, 405, 501):
                continue          # some hosts refuse HEAD; retry with GET
            return url, e.code
        except Exception as e:
            if method == "GET":
                return url, f"ERR {type(e).__name__}"
    return url, "ERR"


if __name__ == "__main__":
    paths = built_paths()
    internal, external = collect()

    print(f"Scanned dist/: {len(internal)} distinct internal targets, "
          f"{len(external)} distinct external targets\n")

    print("=== BROKEN INTERNAL LINKS ===")
    broken_int = {p: srcs for p, srcs in internal.items() if p not in paths}
    if not broken_int:
        print("  none")
    for p, srcs in sorted(broken_int.items(), key=lambda kv: -len(kv[1])):
        print(f"  {p}   ({len(srcs)} pages link here)")
        for s in sorted(srcs)[:3]:
            print(f"      from {s}")
    print()

    if "--internal-only" in sys.argv:
        sys.exit(0)

    print("=== EXTERNAL LINK STATUS ===")
    with ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(check_external, external.keys()))
    bad = [(u, s) for u, s in results if not (isinstance(s, int) and s < 400)]
    ok = len(results) - len(bad)
    print(f"  {ok} OK, {len(bad)} problem\n")
    for u, s in sorted(bad, key=lambda x: str(x[1])):
        print(f"  [{s}] {u}")
        for src in sorted(external[u])[:2]:
            print(f"      from {src}")
