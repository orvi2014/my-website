---
title: "Share a Client Portal Link Without Creating an Account"
description: "Share a client portal link without accounts: one scoped, expiring token per client, stored as a hash, served with no-referrer and noindex. Code included."
pubDate: 2026-11-03
category: "building"
author: "Orvi"
readingTime: 8
tags: ["client portal", "magic link", "capability URL", "access control", "multi-tenant SaaS", "referrer policy", "web security", "agency software"]
featured: false
---

To share a client portal link without an account, issue a single-purpose token that expires, scope it to one client's one portal, store only its hash, and serve it with a Referrer-Policy that keeps it from leaking to third parties. The link is a credential, so it needs the same scoping, expiry and revocation you would give a password.

A login-free portal link gives the client's files to anyone who gets hold of the URL. The link feels private because nobody guessed it. But a URL stops being secret the moment it's pasted into an email, a Slack thread, a browser history, a server log or a Referer header. Treat the link as a public document until you've proven otherwise.

Microsoft's Power Apps portals are the clearest documented case. In May 2021, the security firm UpGuard found that portals built on Power Apps were exposing data through anonymous OData feeds. The portal owners hadn't enabled table permissions, and the feeds were reachable without signing in. UpGuard's report, [By Design: How Default Permissions on Microsoft Power Apps Exposed Millions](https://upguard.com/breaches/power-apps), lays out the details. Microsoft later changed the default and added a check to its Portal Checker that flags lists with anonymous access.

## What Happened in the Microsoft Power Apps Portal Exposure?

The portal worked exactly as built. A visitor with no account could open a page, and the page loaded the data behind it. The people who built those portals had designed the sharing model they wanted. The platform had shipped a default that let anonymous readers see whatever the list contained.

UpGuard's research, reported by [SecurityWeek](https://www.securityweek.com/misconfigured-microsoft-power-apps-portals-exposed-millions-records/) and [The Register](https://www.theregister.com/2021/08/23/power_shell_records/) in August 2021, put the exposure at about 38 million records across more than 1,000 web apps. The exposed portals included several US government bodies, some of them running COVID-19 contact-tracing and vaccination portals, and UpGuard reported that some of the exposed records included Social Security numbers. Microsoft said the product was working by design and closed the case with UpGuard on June 29, 2021. According to the disclosure, none of the data is known to have been compromised.

The lesson is narrower than "anonymous links are dangerous." The sharing mechanism wasn't the failure. The failure was that visibility was a default the owner had to remember to switch off, and the owners didn't know it was on.

## Why Is an Open Default the Real Failure?

Default permissions failed because the safe state required a deliberate action that nobody was prompted to take. Portal owners had to enable table permissions to restrict list data. According to UpGuard's account, table permissions for lists were off by default, so OData feeds served list data to anonymous visitors unless the owner turned them on.

The same pattern shows up across broken access control, ranked first in the [OWASP Top 10](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control) since the 2021 edition. The [OWASP Top 10 2021 entry for A01 Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control) reports that 94% of applications were tested for some form of broken access control, with an average incidence rate of 3.81%. It also had more occurrences than any other category in the contributed data. Those figures measure testing coverage and incidence, not how many apps were breached. Still, they show that access control is where web apps most often go wrong.

So the fix for a portal link is to make the safe state the default. No access without a token, one portal per token, and an expiry that applies even if the owner forgets. Visibility should be something the system grants. The owner shouldn't have to remember to take it away.

## Why Not Require an Account for Every Client?

Requiring accounts is a reasonable instinct, but it doesn't solve the problem on its own. The account layer carries the same access-control risk as the link. The friction is worst for agencies: one client might be a marketing director, a founder, an accountant and a contractor, and each would need a login before approving a file.

The other side deserves a fair hearing. An account gives you identity, an audit trail and one place to revoke access. A bearer link gives you none of those. The W3C Technical Architecture Group's [Good Practices for Capability URLs](https://www.w3.org/2001/tag/doc/capability-urls/) puts the risk plainly: a capability URL is sensitive, much like a password, and it can leak into unintended hands in several ways.

I don't think that argument settles it for portals, for two reasons. First, the same document recognizes legitimate uses, including one-shot links and different capability URLs for different people or groups. That's exactly what a client portal needs. Second, accounts didn't prevent the Power Apps exposure. The feeds were anonymous by configuration. An account layer with a sloppy scope leaks the same data as an open link. The defense is scope, expiry and revocation, however you identify the user.

| Option | Who can open it | Main failure mode | Use when |
|---|---|---|---|
| Open portal, no token | Anyone with the URL | Enumeration and forwarding | Never for client files |
| Scoped expiring link | Holder, for one portal | Forwarding and referrer leaks | One-off client review |
| Account with role | Named user | Over-broad roles, onboarding friction | Ongoing team access |

## What Should the Link Actually Carry?

The link should carry an opaque token that maps to a stored, revocable record, and nothing else. The server keeps a hash of the token, so a database leak doesn't hand anyone working links. The record fixes the client, the portal, the permitted actions and the expiry.

```python
import hashlib, secrets, time
import os

PORTAL_BASE_URL = os.environ["PORTAL_BASE_URL"]

def issue_portal_link(client_id: str, portal_id: str, ttl_days: int = 14) -> str:
    token = secrets.token_urlsafe(32)  # 256 bits of entropy
    save_link({
        "token_hash": hashlib.sha256(token.encode()).hexdigest(),
        "client_id": client_id,
        "portal_id": portal_id,
        "scope": ["read:projects", "read:invoices"],
        "expires_at": time.time() + ttl_days * 86400,
        "revoked": False,
    })
    # The raw token appears in exactly one place: this link.
    return f"{PORTAL_BASE_URL}/s/{token}"
```

The scope here is read-only on purpose; an approval action needs its own scope, such as "approve:files", granted per link rather than by default.

```python
def resolve_portal_link(token: str) -> dict:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = load_link_by_hash(token_hash)
    if record is None or record["revoked"] or record["expires_at"] < time.time():
        raise PermissionError("portal link is unknown, revoked or expired")
    return {
        "client_id": record["client_id"],
        "portal_id": record["portal_id"],
        "scope": record["scope"],
    }
```

Every portal request must re-run this check, not just the first page load.

Putting the token in the URL path is only safe if the response headers are right. Three headers do most of the work:

```
Referrer-Policy: no-referrer
Cache-Control: no-store
X-Robots-Tag: noindex, nofollow
```

Every response from a link-gated page should send all three. The first keeps the token from reaching third-party sites through the Referer header. [PortSwigger's cross-domain referer leakage guidance](https://portswigger.net/kb/issues/00500400_cross-domain-referer-leakage) makes the point that when a URL contains a session token, that token can be sent to other domains in the Referer header if the browser sends the full URL. Modern browsers already strip the path from cross-origin referrers by default (strict-origin-when-cross-origin), so the explicit header is defense in depth for older browsers and pages that loosen the policy ([MDN's Referrer-Policy reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)). The second stops intermediaries and browser caches from storing the page. The third keeps the page out of search indexes.

There's an alternative. You can put the token after the hash sign, in the URL fragment. Browsers don't send the fragment to the server or in the Referer header, so a page that reads the token with JavaScript and sends it in a header avoids the leak entirely. The cost is a dependency on client-side script, which breaks for anyone who blocks it.

## Where Does the Link Leak After You Send It?

The link leaks at every hop it passes through, and most of those hops are invisible to the agency that sent it. Email clients prefetch links. Chat apps unfurl them. For one-time links this is worse than a leak. A mail scanner that prefetches the URL can use up the token before the client clicks it, so a one-time link needs a confirm step on the landing page rather than burning on GET. Search engines can index any URL they discover on a crawlable page, including one pasted into a public forum or doc.

The indexing risk isn't hypothetical. In late July 2025, shared ChatGPT conversations turned up in Google search results when users had enabled the "discoverable" option. [Search Engine Journal](https://www.searchenginejournal.com/openai-is-pulling-shared-chatgpt-chats-from-google-search/552671/) reported that OpenAI disabled the feature on July 31, 2025, and that Fast Company had found nearly 4,500 indexed shared links, some containing names, resumes and confidential work content. Those users had ticked an opt-in box, and many still did not expect a stranger's search to surface the chat. A portal link has no such box. Whether it gets indexed depends on whether it ends up on a crawlable page, and noindex, a short expiry and the ability to revoke are the controls you have.

That's why the `X-Robots-Tag` header and the expiry belong in the first version, not the second. A portal link that outlives the engagement and ends up in an indexed page is a public file share.

## What Changes When an Agent Handles the Link?

A login-free link is a bearer credential, and agents make it easier to leak. When an agency hands a portal URL to an AI agent, or pastes it into an LLM prompt so the model can summarize a client's files, that URL lands in transcripts, tool-call logs and context windows the agency doesn't control. Each of those stores can outlive the engagement, and none of them is governed by the portal's own access rules.

OWASP lists this class of problem as [LLM02:2025 Sensitive Information Disclosure](https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/), which covers sensitive data leaking through what an LLM application receives and returns. A token in a prompt is one more place where scope, expiry and revocation have to hold. The practical rule is to treat the token as a secret everywhere it travels, and to keep the check where the request is served rather than leaving it to whatever is holding the link.

A different system, not AgencyHandy, shows the same failure. In my approval-gated X agent, the lockout check returned True and the caller skipped one action while the loop kept running for 3.5 more days. A revocation flag the caller can ignore is the same bug: the check has to stop the request, not just report.

## What Is Still Unsolved?

The first open problem is revocation the client can understand. A token can be revoked with one database write. The hard part is knowing which links exist, who they went to, and whether they were forwarded. Without a per-recipient token, you can't tell a forwarded link from a shared one, so revocation ends up all or nothing.

The second is abuse of the lookup endpoint itself: a 256-bit token can't realistically be guessed, but scanners and misbehaving clients can still hammer the resolve path, which is one reason to rate-limit the link endpoint per tenant ([per-tenant rate limiting](https://www.robatdasorvi.com/chapters/building/per-tenant-rate-limiting-in-a-multi-tenant-client-portal)).

The third is verifying who opened the link. A link-gated portal can't prove the person at the other end is the one you sent it to. I built [AgencyHandy](https://agencyhandy.com), client portal software that holds services, clients, projects, tasks, files, invoices and payments in one place. That's exactly the data a leaked link would expose. I'm not claiming AgencyHandy ships a guest-link mechanism. The design is what this post argues for: scope each token to one portal, hash it at rest, keep it out of referrers and indexes, and let it expire.

For multi-tenant isolation behind that link, the [Postgres row-level security design notes](https://www.robatdasorvi.com/chapters/building/postgres-row-level-security-for-a-multi-tenant-agency-client-portal-design-and-pitfalls) cover the database side. The [white-label custom domain write-up](https://www.robatdasorvi.com/chapters/building/white-label-client-portals-on-custom-domains-automating-tls-for-agency-subdomains-in-agencyhandy) covers serving those links from a client's own hostname.

The link isn't the protection; the scope, the expiry and a revocation check that runs on every request are.