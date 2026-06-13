#!/usr/bin/env python3
"""
One-time script to grant the SEO monitor service account access to Search Console.
Run: python3 scripts/grant-gsc-access.py
"""
import json, webbrowser, urllib.parse, urllib.request, http.server, threading, ssl, os

SERVICE_ACCOUNT_EMAIL = "seo-monitor@seo-monitor-496506.iam.gserviceaccount.com"
SITE = "sc-domain:robatdasorvi.com"
REDIRECT_URI = "http://localhost:8089/"
SCOPE = "https://www.googleapis.com/auth/webmasters"

# gcloud's public OAuth client (installed app type)
CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com"
CLIENT_SECRET = "d-FL95Q19q7MQmFpd7hHD0Ty"

auth_code = None

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        auth_code = params.get("code", [None])[0]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"<h2>Authenticated! You can close this tab.</h2>")
    def log_message(self, *args): pass

server = http.server.HTTPServer(("localhost", 8089), Handler)
thread = threading.Thread(target=server.serve_forever)
thread.daemon = True
thread.start()

auth_url = (
    "https://accounts.google.com/o/oauth2/auth"
    f"?client_id={CLIENT_ID}"
    f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    f"&response_type=code"
    f"&scope={urllib.parse.quote(SCOPE)}"
    f"&access_type=offline"
)

print(f"\nOpening browser for Google login...")
print(f"If it doesn't open, visit:\n{auth_url}\n")
webbrowser.open(auth_url)

print("Waiting for authentication...")
import time
for _ in range(120):
    if auth_code:
        break
    time.sleep(1)
server.shutdown()

if not auth_code:
    print("Timed out waiting for auth.")
    exit(1)

# Exchange code for token
data = urllib.parse.urlencode({
    "code": auth_code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code",
}).encode()

req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
token_resp = json.loads(urllib.request.urlopen(req).read())
access_token = token_resp.get("access_token")

if not access_token:
    print(f"Failed to get token: {token_resp}")
    exit(1)

print(f"Got access token. Adding {SERVICE_ACCOUNT_EMAIL} to {SITE}...")

# Add service account as Full user to Search Console
encoded_site = urllib.parse.quote(SITE, safe="")
url = f"https://www.googleapis.com/webmasters/v3/sites/{encoded_site}/users/{urllib.parse.quote(SERVICE_ACCOUNT_EMAIL, safe='')}"

req = urllib.request.Request(
    url,
    data=json.dumps({"permissionLevel": "siteFullUser"}).encode(),
    headers={
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    },
    method="PUT",
)

try:
    resp = urllib.request.urlopen(req)
    print(f"\nSuccess! Service account added to Search Console.")
    print(f"Now run: bash scripts/seo-monitor.sh")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"\nFailed: HTTP {e.code}")
    print(body)
