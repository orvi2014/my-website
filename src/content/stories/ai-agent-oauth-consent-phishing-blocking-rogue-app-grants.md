---
title: "AI Agent OAuth Consent Phishing: Blocking Rogue App Grants"
description: "AI agent OAuth consent phishing uses the real consent screen, so MFA never fires. Block rogue grants by gating who consents, which scopes, and grant lifetime."
pubDate: 2026-11-05
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai agent oauth consent phishing", "oauth consent phishing", "rogue app grants", "AI agent security", "illicit consent grant", "OAuth scopes", "Entra admin consent", "agent permissions"]
featured: false
---

AI agent OAuth consent phishing gets a user to approve a malicious app's permissions on the real Google or Microsoft consent screen. No password is stolen and MFA never fires. Blocking rogue grants means controlling who can consent, which scopes an app can request, and how long each grant lives. Teaching people to spot fake login pages doesn't touch any of that.

Every post, reply, follow and like my X growth agent made went through a Telegram approval I pressed by hand. For months, the Skip button did nothing, so every skipped item was counted as a timeout and my approval statistics were wrong. An approval step is only as good as what it records.

## Why Does Consent Phishing Work When MFA Is Enabled?

Because the attacker never asks for your password. The victim goes to the genuine sign-in and permission pages, and the only thing they're asked to do is click Allow. MFA protects a login. Nothing in this flow is a login.

On May 3, 2017, a campaign spread a fake app called "Google Docs" exactly this way. Auth0 documented that victims were sent to Google's real permission pages. Once they allowed the app, it emailed their contacts with the same lure, so the worm moved from account to account ([Auth0, 2017](https://auth0.com/blog/all-you-need-to-know-about-the-google-docs-phishing-attack/)). The app was literally named "Google Docs", so the consent screen looked ordinary.

Agents make this worse. An agent that needs mail, files, and calendar access asks for a broad set of scopes at once, and the consent screen looks routine as a result. Someone who has approved three productivity integrations this month has no reason to read the fourth one's scope list.

## Why Do Experienced People Still Get This Wrong?

They check the wrong thing. They look at the app name, the logo, and whether the page is on the right domain. All three are fine. The phishing lives in the scope list and the grant lifetime, and almost nobody reads either.

Changing the password is the reflex response, and here it fails. Obsidian Security points out that a password change doesn't revoke an existing OAuth grant, because the grant sits outside the credential ([Obsidian Security, 2025](https://www.obsidiansecurity.com/blog/consent-phishing-how-oauth-attacks-bypass-mfa-and-traditional-security-controls)). A runbook that says "reset the user's password" leaves the attacker's token working.

The second mistake is trusting a check that fires but doesn't stop anything. I've seen this in my own tooling. When X suspended my account, the lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The check was correct. The enforcement was missing. A consent control can fail the same way: if nothing downstream enforces the policy's result, the token still gets issued.

## Does Verified Publisher Status Stop a Rogue Agent?

No. Verified publisher status limits which apps a user can consent to. It does nothing for a legitimate app whose tokens get stolen, and the verification itself can be subverted.

Microsoft's guidance is to restrict user consent so people can approve only apps from verified publishers, and only for permissions an admin selects ([Microsoft Learn, Manage consent to applications and evaluate consent requests](https://learn.microsoft.com/entra/identity/enterprise-apps/manage-consent-requests)). That's a sound control. It's also a control on the install, and the 2025 Salesloft Drift incident happened after the install. Attackers used OAuth and refresh tokens tied to Drift's AI chat agent to reach customers' Salesforce environments. Google's Threat Intelligence Group advised treating every token connected to the Drift platform as potentially compromised ([Google Threat Intelligence Group, 2025, "Widespread Data Theft Targets Salesforce Instances via Salesloft Drift"](https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift)). The vendor was legitimate and the integration was approved by each customer, and the tokens were still the attack surface.

Practical365 makes the same point more bluntly. Allowing consent to verified apps looks reasonable until you account for attackers subverting the verification process ([Practical365, Restricting Applications](https://practical365.com/practical-protection-protecting-your-tenant-by-restricting-applications/)). In a campaign Proofpoint found in December 2022, attackers obtained Microsoft verified publisher status by fraudulently enrolling in the Microsoft Cloud Partner Program while impersonating legitimate companies ([Proofpoint, 2023](https://www.proofpoint.com/us/blog/cloud-security/dangerous-consequences-threat-actors-abusing-microsofts-verified-publisher)). Verification is a useful filter, not a boundary.

## What Actually Blocks a Rogue Grant?

Three checkpoints: who can approve, which scopes count as high-impact, and how long a grant lasts. Each one catches cases the other two miss. The table is the decision logic I'd start with.

| Condition | Decision | Why |
|---|---|---|
| Publisher unverified | Deny | Standard filter, weakest alone |
| App first seen under 30 days ago | Queue for admin | New apps have no track record to judge |
| Requests mail, files, directory write, or offline access | Queue for admin | Broad scopes turn one grant into a breach |
| Verified, narrow scopes, known app | Allow with expiry | Lifetime limits the damage from a stolen token |
| Any grant without an expiry | Reject the policy | Permanent grants outlive the decision |

Here's a minimal sketch of that logic. It isn't an API from any product, and the scope names and thresholds are placeholders to replace with your own:

```python
from datetime import timedelta

HIGH_IMPACT = {"Mail.Read", "Files.ReadWrite.All", "Directory.ReadWrite.All", "offline_access"}
MAX_GRANT = timedelta(days=14)

def evaluate_consent(app_age_days: int, publisher_verified: bool,
                     scopes: set[str], admin_approved: bool):
    if not publisher_verified:
        return ("deny", "unverified publisher")
    if app_age_days < 30 and not admin_approved:
        return ("queue", "new app, needs admin review")
    if scopes & HIGH_IMPACT and not admin_approved:
        return ("queue", "high-impact scope")
    return ("allow", {"expires_in": MAX_GRANT})
```

The expiry is the part teams skip most. Entra delegated grants don't expire on their own, and Google refresh tokens for published apps generally last until revoked or left unused for six months. You enforce the lifetime yourself with a scheduled job that lists grants (in Entra, oauth2PermissionGrants via Microsoft Graph) and revokes any older than your limit, or with an app-governance product. A grant that has to be renewed forces a second look, and a stolen refresh token stops working once the scheduled revocation runs. The break-glass pattern I wrote about follows the same principle for elevated access: time-boxed, approved, and expiring by default ([Break-Glass Access for AI Agents](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry)).

## Should You Just Block All User Consent?

For high-impact scopes, yes. For everything else, no. If you block all user consent, the work moves to an admin queue, and that queue gets rubber-stamped. The risk is that an admin facing a steady stream of requests starts approving them in bulk, and a bulk approval is just a slower version of the click that caused the problem.

Proofpoint's 2025 report on Microsoft OAuth app impersonation counted attempted account compromises affecting nearly 3,000 user accounts across more than 900 Microsoft 365 environments ([Proofpoint, 2025](https://www.proofpoint.com/us/blog/threat-insight/microsoft-oauth-app-impersonation-campaign-leads-mfa-phishing)). Those are the vendor's numbers, not a census. In that campaign the fake OAuth app was a lure that redirected users to a credential-phishing kit, which shows how much trust attackers can borrow from a consent prompt.

The better version is narrower. Block user consent to high-impact scopes outright. Route new apps to an admin with a reason field the admin has to fill in. Log every approval with the scope list attached. I've learned to distrust logs that only say "approved." My approval statistics were wrong for months because every Skip was recorded as a timeout. An audit trail that can't tell the two apart isn't much of an audit trail.

## What Should You Do When a Grant Is Already Live?

Revoke the grant, not just the password, and revoke the user's refresh tokens (in Entra, revokeSignInSessions) so tokens issued before the grant was removed stop working. Revoking consent removes the app's access, but tokens already issued can keep working until they expire. That's why the lifetime limit above has to be in place before the incident.

Google's response to the Drift tokens followed this pattern. It revoked the affected tokens and disabled the Workspace integration tied to them ([Google Threat Intelligence Group, 2025](https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift)). Okta said its IP restrictions blocked a stolen Drift token used against its Salesforce instance ([Okta, 2025](https://www.okta.com/newsroom/articles/the-salesloft-incident--a-wake-up-call-for-saas-security-and-ips/)). That's an argument for conditional access on token use, not just on sign-in. Revocation worked here because the vendors had the controls in place. Most organizations don't. The first step is an inventory of which apps hold which scopes.

## Where Will the Next Rogue Grant Come From?

My prediction: the next large AI agent breach will start with a grant requested by a legitimate, verified vendor's integration, not a fake app. The response will be to block all agent consent. Within a few months, every agent install will sit in an admin queue, and that queue will get approved in bulk. And the approved integrations will still hold long-lived tokens, which is exactly where the Drift customers were.

The defense that holds up is the boring one. Narrow scopes, expiring grants, a human who actually reads the scope list, and a log that records what the human really did. Two failures in my own bot had the same shape: a button that did nothing, and a check that fired without stopping. Both looked fine from the outside. The consent screen is built to look fine from the outside too, and that's the part to design against.

For related patterns, see [AI Agent Kill Switch Not Working: Cached Flags and Leases](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-kill-switch-not-working-cached-flags-and-leases), which covers why revocations take time to propagate. Also see [Authenticating Agents You Did Not Build: Agent Cards and Signed Requests in A2A](https://www.robatdasorvi.com/chapters/ai-agents/authenticating-agents-you-did-not-build-agent-cards-signed-requests-and-trust-in-the-a2a-protocol), which covers trust decisions made before any token is issued.