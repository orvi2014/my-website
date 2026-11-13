---
title: "Email Security Scanner Clicks AI Agent Approval Links"
description: "An email security scanner clicks AI agent approval links when it fetches them, so approval must be a POST from a confirmation page, never a GET."
pubDate: 2026-11-12
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai-agents", "human-in-the-loop", "approval-workflows", "email-security", "link-scanners", "magic-links", "agent-safety", "idempotency"]
featured: false
---

Your email security scanner may be approving things for your AI agent. It fetches each link in a message to check for malware, and that GET request looks exactly like a person clicking. If approval happens on that GET, a machine has said yes. The fix is to make approval a POST, sent from a confirmation page that a scanner has no reason to submit.

Picture the approval log for an agent that asks permission by email. Every row is a link. Every row says approved. Most timestamps sit a few seconds after delivery. The log is accurate, as far as it goes. It records that a URL was requested. It has no column for who requested it, and nothing in it says whether a human ever read the message.

## Why does an email scanner click an approval link?

Email gateways fetch URLs in messages to judge whether they're safe, whether or not anyone opens the message. The scanner doesn't care about your agent. It just wants to be thorough about the link.

Microsoft documents this in Defender for Office 365: Safe Links can scan URLs in a message before delivery and again at click time ([Microsoft Learn](https://learn.microsoft.com/defender-office-365/safe-links-about)). Its reporting cmdlet `Get-SafeLinksDetailReport` even records an action called `ClickedDuringScan`, for a user who clicked while a scan was still running ([Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/Get-SafeLinksDetailReport)).

The primary-source precedent for this fix is RFC 8058. It specifies one-click unsubscribe as an HTTPS POST, because anti-spam software often fetches URLs in mail header fields automatically, and a sender cannot tell an automated request from a person's ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)). Approval by POST uses the same move.

Identity vendors document the same failure. Stytch's consumer docs say each magic link is one-time use, and a real login consumes the embedded token ([Stytch](https://stytch.com/docs/consumer-auth/authentication/magic-links/overview)). Its B2B guide describes the failure directly: a scanner can consume the token before the email reaches the inbox ([Stytch B2B guide](https://stytch.com/docs/b2b/guides/magic-links/overview)). Supabase users have reported the same thing. In a user report posted on December 27, 2025, magic links and password reset links were described as "frequently consumed by automated email scanners in enterprise, university, and hospital environments", so the token was already invalid when the user clicked ([Supabase discussion #41618](https://github.com/orgs/supabase/discussions/41618)). The discussion is a user report, not a vendor postmortem.

This isn't only an auth-vendor problem. An approval link is a token that means "yes, do the thing," and a scanner that consumes it has said yes on your behalf.

## Does a scanner click count as the human's approval?

If the approval is a GET, yes. The server can't tell the difference, so the scanner's click gets recorded as consent.

It's tempting to treat this as a bot-detection problem and ask how to recognize scanner traffic. That question has answers, but it's the wrong one. Approval shouldn't depend on identifying the requester at all.

Stytch's consumer overview says that when a Magic Link has been clicked by an email security scanner, "we do not treat the click as an authentication attempt - meaning the token is not consumed, and a session is not granted" ([Stytch](https://stytch.com/docs/consumer-auth/authentication/magic-links/overview)). It says this "comes out of the box for all Stytch customers", and the B2B guide describes the same device-intelligence approach ([Stytch B2B guide](https://stytch.com/docs/b2b/guides/magic-links/overview)). That works because Stytch owns the login flow. An agent platform that writes its own approval endpoint doesn't get that behavior for free.

## Can you just filter out scanner clicks?

No. Filtering is a moving target, and the share of non-human clicks is going up.

Omnivery, which sells bot detection, reports that bots rose from 33.8% of the clicks its Bot Detection API screened in 2025 to about 48% in the first half of 2026 ([Omnivery, The State of Email Bots 2026](https://omnivery.com/blog/the-state-of-email-bots-2026)). The same report's chart "Gmail bot-click share" shows the share of consumer Gmail clicks that were bots jumping to about 22% in late February 2026, after holding around 6% through 2025 and early 2026. These are one vendor's samples, not a census. The direction is what matters. A user-agent blocklist written in 2025 is already stale.

Timing filters fail in both directions. Microsoft's `ClickedDuringScan` action shows that humans sometimes click while a scan is still running, so a rule like "a click within two seconds is a scanner" will likely reject some real people. That is an inference, not something Microsoft measures.

Expiry doesn't save you. A five-minute TTL does nothing when the scanner arrives in the first five seconds, and the token is spent before the human opens the inbox.

So the approval has to be a different kind of request. The GET handler only renders a confirmation page and changes no state; the POST handler performs the action, and only with a valid, unspent nonce.

```python
@app.get("/approve/<action_id>")
def show_confirm(action_id):
    nonce = issue_nonce(action_id, ttl_seconds=300, single_use=True)
    return render_confirm(action_id, nonce)

@app.post("/approve/<action_id>")
def approve(action_id):
    if not consume_nonce(action_id, request.form["nonce"]):
        abort(409)
    record_decision(action_id, actor=current_user(), via="confirm-post")
    return execute(action_id)
```

The confirm page and the POST must belong to an authenticated approver. Either require a login session before the page renders, or bind the nonce to the intended recipient and check that binding in `consume_nonce`. Add CSRF protection to the form as well. Without these, anyone the email is forwarded to, and any scanner that does submit forms, can approve. That makes `actor=current_user()` meaningless, because the log would name whoever the request came from, not the approver.

A scanner that fetches the GET page gets a nonce it never uses. It would have to parse the form and submit it, and none of the sources I found document scanners doing that. That's an inference from the design, not a measured property.

| Approval mechanism | Who can trigger it | Safe for approval? |
|---|---|---|
| GET link in email | Scanner, mail preview, or human | No |
| POST from confirm page, single-use nonce | Human who loaded the page | Yes, with the caveat above |
| Chat-platform button callback, authenticated | Human who pressed it | Yes, if the callback is authenticated and the presser is checked (Slack signs requests; Telegram webhooks carry a secret_token header, and the handler must check that callback_query.from.id is the approver). |

## What does the approval log actually record?

It records that a request reached the server. It can't record that a person decided anything, because intent isn't a property of an HTTP request.

This is the part the data is structurally unable to see. Any approval rate computed from link hits is really a measurement of the mail gateway. Adding more rows doesn't fix it. The missing column is the human.

In my own approval-gated X bot, which used Telegram rather than email, I've seen what a consistent log looks like when it measures the wrong thing. The Telegram Skip button silently did nothing for months, so every skipped item got counted as a timeout, and the approval statistics were wrong the whole time. Separately, four hardcoded target accounts that no longer existed absorbed 88% of comment attempts for about six weeks, and every run logged success. Nothing threw an error. The logs recorded that an attempt ran, not whether it landed.

So the question changes. You stop asking "how many approvals did we get?" and start asking "how many decisions carried a verifiable human action?" Those are different numbers, and only one of them can be computed from a web log.

## Where should the approval check live?

In the tool layer, not in the message. The confirmation-page fix covers one channel, and agents don't have only one.

The stakes aren't theoretical. In April 2026, Euronews reported that a Cursor agent deleted the entire database of PocketOS. The article says the agent ran on Anthropic's Claude Opus 4.6 model. Founder Jer Crane wrote that it "took nine seconds", and, as the article relays his account, there was no confirmation request before the action ([Euronews, 2026-04-28](https://www.euronews.com/2026/04/28/an-ai-agent-deleted-a-companys-entire-database-in-9-seconds-then-wrote-an-apology)). Those details come from the founder; I haven't seen an independent postmortem. In July 2025, SaaStr founder Jason Lemkin reported that a Replit agent deleted his production database during a code freeze, after he had told it not to make changes without explicit approval; Replit CEO Amjad Masad publicly apologized ([Fortune](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)).

The common failure is that approval lived in a prompt or a convention, not at the point where the destructive call executes. A scanner-proof confirmation page is wasted if the agent can call the delete endpoint with a token it found in an unrelated file. Enforce the check in the tool layer, where the call actually happens.

The related essays on [break-glass access with human approval and automatic expiry](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry) and [blocking rogue OAuth app grants](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-oauth-consent-phishing-blocking-rogue-app-grants) cover adjacent ground: who may grant access, and how the grant expires.

## What's still unresolved?

My own bot never had this exposure: every approval was a Telegram button I pressed by hand, which a mail scanner can't reach. What I can't answer is how common scanner-consumed approvals are in email-based agent workflows, because no source I found measures it.

The POST design has open edges too. I haven't tested whether a mail client that prerenders the confirmation page's assets, or a scanner that executes JavaScript, can submit the form. The nonce scheme assumes it can't, and I only have the design argument for that. And a single-use nonce moves the problem rather than dissolving it. A human who clicks "approve" twice, or forwards the link to a colleague, now produces a different failure, and the log will record that as a success too. A forwarded link is only safe if the nonce is bound to the intended approver, as above, so a colleague who opens it is refused.