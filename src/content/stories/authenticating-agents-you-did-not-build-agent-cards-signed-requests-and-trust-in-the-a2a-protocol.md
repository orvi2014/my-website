---
title: "A2A Protocol Authentication Security: Agent Cards and Signed Requests"
description: "A2A protocol authentication security goes past signed Agent Cards. A valid signature proves who signed the card, not whether you should trust it."
pubDate: 2026-10-21
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["A2A protocol", "agent authentication", "Agent Card", "agent-to-agent security", "OAuth", "multi-agent systems", "AI agent security", "non-human identity"]
featured: false
---

The lockout check fired and returned True. The caller skipped one action, and the loop kept running. For three and a half days after X suspended my account, the bot carried on as if nothing had happened. The check was right; the caller treated a suspension like one failed action. I keep thinking about that gap, because A2A protocol authentication security runs into the same problem: a component returns a verdict, and whatever calls it decides whether anyone listens. A2A (Agent2Agent) is the open protocol for agents built by different teams to discover and call each other. In it, that gap sits between verifying who a remote agent is and deciding whether to act on what it sends.

## Is an A2A Agent Card something I can trust?

Not by default. An Agent Card is a JSON document a remote agent publishes to describe itself and its endpoints. Reading one tells you what the agent claims. It doesn't tell you who stands behind the claim.

The card is served at the well-known path `/.well-known/agent-card.json` on the agent's own domain. Signed cards arrived in v0.3.0, whose [release notes](https://github.com/a2aproject/A2A/releases/tag/v0.3.0) list "Add `signatures` to the `AgentCard`." Per the [A2A specification](https://a2a-protocol.org/latest/specification/), signatures are JWS over the card after it is canonicalized with the JSON Canonicalization Scheme (RFC 8785), with the `signatures` field itself excluded. Signing is optional for the publisher, and a client SHOULD verify at least one signature before trusting a card.

## Why not sign the card and move on?

Because a valid signature answers one narrow question: did the holder of this key sign these exact bytes? It doesn't tell you whether that key belongs to an organization you chose to deal with, whether the key is still trusted, or whether the agent behind it does what the card says.

The weak point is rarely the cryptography. A signed document is only as trustworthy as the list of keys you decided to accept, and that list rarely gets a security review. A signature tells you the card wasn't altered after signing. It says nothing about whether the signer should have been allowed to publish it in the first place.

The field isn't ready for this. A 2026 study by Tam Nguyen, Moses Ndebugre and Dheeraj Arremsetty scored 16 AI security frameworks against 193 threat items and found that "No reviewed framework achieves majority coverage of any single category" ([arXiv:2603.09002](https://arxiv.org/abs/2603.09002)). That paper doesn't discuss Agent Cards, so I'm citing it only for the coverage gap. The earlier Habler et al. threat model names Agent Card spoofing directly: a forged card hosted on a malicious domain enables task hijacking and impersonation ([arXiv:2504.16902](https://arxiv.org/abs/2504.16902)).

## How do you verify an A2A Agent Card signature?

Fetch the card over TLS from the domain you expect, canonicalize it with RFC 8785 after removing the `signatures` field, and verify each JWS against a key from a trust store you control. Reject the card if any check fails. A passing check shows the key is trusted, not that the agent behaves.

1. **Fetch the card over TLS from the expected domain.** Use the well-known path `/.well-known/agent-card.json` on that domain, and don't follow redirects to hosts you did not expect.

2. **Remove `signatures` and canonicalize.** Apply RFC 8785 (JSON Canonicalization Scheme) to the remaining content. The spec excludes `signatures` from signed content to avoid circular dependencies, so verify exactly that byte sequence.

3. **Verify each JWS against a key from a trust store you control.** Never take the key only from a URL embedded in the card. The spec requires `alg`, `typ` and `kid` in the protected header, but an attacker can name their own key, so the header proves nothing about who holds it.

4. **Reject an unknown `kid`, an expired key or a missing signature, and fail closed.** A card without a valid signature is unverified. Logging a warning and continuing is not a passing result.

5. **Cache with a TTL, and re-verify when the card changes.** A cached "verified" flag must not outlive the key that produced it.

6. **Record every rejection, and alert when the rejection count stays at zero for a long time.** A verifier that never rejects may not be wired in, or may be checking against rules that no longer match reality. My bot's lockout check failed the second way: during the second suspension it matched none of its known selectors, so it never fired.

## What do static API keys and allowlists cost in A2A?

A hardcoded allowlist of agent URLs plus one long-lived API key per partner fails silently: stale entries keep routing calls, and a leaked key works until someone notices. Its costs never show up on a dashboard, which is why people keep choosing it.

Look at the credential habits. Astrix Security's report, published October 15, 2025, examined about 5,200 open-source MCP server implementations (5,205 GitHub repositories). It found that 53% rely on static secrets, mostly API keys and personal access tokens. Only 8.5% use OAuth, and 79% of API keys are passed through plain environment variables ([Astrix Security, 2025](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/)). Those are MCP servers, not A2A agents, but the habit carries over. A static secret is cheap on day one and expensive on the day it leaks.

The hidden cost I know firsthand is quieter than a leak. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of my bot's daily comment attempts. Every run logged success. Nothing raised an error. A hardcoded list is cheap to write and expensive to be wrong about, because it fails silently. A trusted-agent allowlist fails the same way. The partner moves its domain, the entry stays, and every call to the old address either fails softly or, in the bad version, reaches whoever now controls that address.

The single-integration model has the same problem at a much larger scale. Google Threat Intelligence Group reported that beginning as early as August 8, 2025, through at least August 18, 2025, an actor used OAuth tokens tied to the Salesloft Drift integration to export data from numerous corporate Salesforce instances ([GTIG, August 2025](https://cloud.google.com/blog/topics/threat-intelligence/data-theft-salesforce-instances-via-salesloft-drift)). GTIG described the victims as numerous Salesforce instances. One integration, trusted once, reached numerous tenants. Nothing was forged. The tokens were real, and so was the integration. The convenient trust was the vulnerability.

## Has anyone exploited agent-to-agent trust in production?

I have found no public report of an A2A-protocol trust exploit in the wild. The closest documented case is ServiceNow's Now Assist, which uses ServiceNow's own agent-discovery mechanism, not A2A, and its lessons still carry over. AppOmni found CVE-2025-12420, rated CVSS 9.3, in Now Assist AI Agents and the Virtual Agent API. ServiceNow patched it and said it was unaware of the issue being exploited in the wild against customer instances ([NVD](https://nvd.nist.gov/vuln/detail/CVE-2025-12420)). AppOmni's BodySnatcher write-up says an unauthenticated attacker could impersonate any ServiceNow user with only their email address, because the providers shipped with the same static client secret across all ServiceNow instances and required only the email address to link an external entity to a ServiceNow account. The attacker could then run AI agents as that user ([AppOmni, BodySnatcher](https://appomni.com/ao-labs/bodysnatcher-agentic-ai-security-vulnerability-in-servicenow/)).

AppOmni's second finding is not a CVE but default behavior, and it matters more. In AppOmni's November 19, 2025 write-up, agents deployed to the same virtual agent were "automatically grouped into the same team by default." Published agents were "marked as being discoverable by default." And agents ran with "the privilege of the user who started the interaction," not the user who planted the malicious content ([AppOmni](https://appomni.com/ao-labs/ai-agent-to-agent-discovery-prompt-injection/)). Nobody had to break a signature. The trust came from shipped defaults.

Neither finding proves a wild campaign. But when the dangerous configuration is the default, "rare misconfiguration" stops working as a defense.

## What does a request-time check require?

Every request needs a credential the server can verify, sent over TLS, with a scope tied to that specific call. The A2A security scheme types include API key, HTTP auth, OAuth 2.0, OpenID Connect and mutual TLS, so a card can declare what a caller must present ([A2A specification](https://a2a-protocol.org/latest/specification/)). Declaring a requirement is not the same as enforcing it. The A2A spec signs the Agent Card. Authenticating each request is left to whichever security scheme the card declares, so a signed card does not mean signed requests. If you need integrity on the message body itself, HTTP Message Signatures (RFC 9421, https://www.rfc-editor.org/rfc/rfc9421) is one option, but it sits outside A2A and both sides must agree to use it.

Mutual TLS looks like the grown-up default. For agent calls across organizations, though, it just moves the stale-entry problem into certificate issuance and rotation for every partner. You get the same allowlist rot, with more paperwork and a better audit log. Per-call authorization matters most, where the server checks the caller and the action together. I wrote about that in [Policy as Code for AI Agent Tool Calls: Authorizing Actions with OPA or Cedar](https://www.robatdasorvi.com/chapters/ai-agents/policy-as-code-for-ai-agent-tool-calls-authorizing-actions-with-opa-or-cedar). The ServiceNow defaults are also why the scope of a delegated identity deserves the care described in [Least Privilege for AI Agents: Scoping Tools, Keys and Filesystems](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice).

## What's still unresolved?

I don't know who should own the trust list for a multi-party A2A network. An operator-maintained list can rot the way my bot's hardcoded target list did. A federated model, where you trust an issuer rather than a URL, moves the failure into the issuer's key management, and I have no data on how often issuers rotate keys badly. Feature flags can disable a remote agent without a redeploy, as I described in [Feature Flags for AI Agent Tools: Disabling One Capability in Production Without a Redeploy](https://www.robatdasorvi.com/chapters/ai-agents/feature-flags-for-ai-agent-tools-disabling-one-capability-in-production-without-a-redeploy). But a kill switch only helps if something notices the agent has gone bad.

Nothing here is measured against a live A2A deployment. I haven't verified a signature check against a real remote card. The question I'm left with is the one the lockout check taught me: when the next quiet failure happens, will the code around it be listening?

---

Note: I could not finish verifying change 15. The A2A spec page was truncated before the signing and authentication sections, so the sentence "Authenticating each request is left to whichever security scheme the card declares" is not confirmed against the spec text. The BodySnatcher wording in change 9 is confirmed against the AppOmni post, which uses "exact same secret across all ServiceNow instances" rather than "hardcoded platform-wide secret," so I used the post's own phrasing. Change 8 used option (b), so no 700 figure is cited.