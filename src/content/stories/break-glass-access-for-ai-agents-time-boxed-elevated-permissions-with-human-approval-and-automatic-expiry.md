---
title: "Break-Glass Access for AI Agents: Approved, Timed, Expiring"
description: "A break-glass grant for an AI agent is a human-approved, time-boxed elevation that expires on its own. My own bot's halt-path failures show why."
pubDate: 2026-10-27
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["ai-agents", "break glass access", "privileged access management", "agent safety", "human-in-the-loop", "least privilege", "AI agent security", "kill switch"]
featured: false
---

For AI agents, "break-glass access" covers two things: a time-boxed, human-approved elevation of the agent's permissions (just-in-time access), and a human's emergency path to override or halt the agent. A human approves it, it covers one purpose, and it expires without anyone having to remember to revoke it. The agent never extends it. The halt path also has to be something the agent cannot clear by itself.

When X suspended my approval-gated growth bot's account on 2026-07-21, the lockout check returned True. The caller skipped one action, and the loop kept running for 3.5 more days. I had built a check that detected the problem correctly, and a control that did nothing with what the check found.

## What break-glass access means for agents

It's a scoped grant. An agent can use it only after a named human approves it, and the platform revokes it at a fixed deadline. Just-in-time elevation should be rare, logged, and short.

The clearest published model I know of is Google Cloud's Privileged Access Manager. It separates an entitlement from a grant. The entitlement is the eligibility to ask for access, under conditions like duration. The grant is one instance of using that entitlement. Approvals can be automatic or routed to a human approver, and access is removed when the duration runs out. The grant timeline records the approver's username and the reason ([Google Cloud PAM overview](https://cloud.google.com/iam/docs/pam-overview)). Microsoft Entra PIM uses the same two levers: time-based and approval-based activation, with a justification ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure)).

Most agent guidance focuses on the agent's standing scope. Break-glass covers the moments when that standing scope is wrong, and those moments are where the design actually gets tested.

Routine JIT elevation and true break-glass are different things. PAM and PIM handle routine just-in-time elevation: a request, an approval, and an expiry. True break-glass is pre-provisioned emergency access, kept for when the normal approval path is down. Microsoft's guidance on emergency access accounts describes this model ([Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)). For agents, the rule is plain: an agent may request JIT elevation, but it should never hold break-glass credentials. Break-glass for agents is a human overriding or halting the agent.

## Why an approval gate is not a break-glass control

It's tempting to treat an approval gate as the safety boundary. It isn't. An approval gate governs what the agent proposes, not what the process does after something goes wrong. My bot never had a break-glass grant. What it shows is the other half of the pattern: what happens when revocation and halt depend on code that can quietly do nothing.

My bot ran every post, reply, follow, and like through a Telegram approval, and I pressed each one by hand. The gate worked exactly as designed. What it couldn't cover was what the process did after a safety signal fired. That's the suspension from the opening. The approval gate had nothing to say about a loop that was already running.

A separate failure was harder to spot, because nothing looked wrong. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of the bot's daily comment attempts. Every run logged success, and nothing raised an error. The Telegram Skip button also silently did nothing for months. Every skipped item got counted as a timeout, so the approval statistics were wrong for that whole stretch.

What I took from both: a control you can't see failing is a control you don't really have. Agents fail quietly by default, so both the grant and the halt need a signal a human actually reads.

## Is a plain process exit enough?

No. A plain exit is a suggestion that a supervisor can override. The fix I shipped was a process exit plus a sentinel file that only a human can clear. I needed the sentinel because launchd's KeepAlive respawned the plain exit.

The second suspension showed the same gap from another side. On 2026-09-22, a week after I raised the reply cap from 16 to 150, X suspended the account again. This time the lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand. A detector that depends on the platform's page structure stops working when the page changes in a way its selectors don't cover.

```python
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sys

HALT = Path("/var/agent/HALT_HUMAN_ONLY")  # lives in a root-owned directory the agent's user cannot write; deleting a file needs write access to its directory

@dataclass(frozen=True)
class Grant:
    scope: str
    approved_by: str        # a named human, recorded
    expires_at: datetime    # set at approval time, never extended by the agent

def check_before_action(grant: Grant | None, scope: str) -> None:
    if HALT.exists():
        sys.exit("halted: sentinel present, only a human clears it")
    if grant is None or grant.scope != scope:
        raise PermissionError(f"no grant for {scope}")
    if datetime.now(timezone.utc) >= grant.expires_at:
        raise PermissionError(f"grant for {scope} expired; request approval again")
```

This is a sketch of the pattern, not a product. The in-process check alone repeats my original bug, because a caller can catch or skip it. The supervisor has to honor the sentinel too, or a plain respawn undoes it. The permission model is the part that matters. If the agent's account can delete the sentinel, the sentinel is only a suggestion. The in-process expiry check is defense in depth, not the control. Real expiry belongs to the credential issuer, so a lapsed grant is a dead token and not an if-statement the agent could skip. That matches [OWASP LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)'s point that authorization belongs in downstream systems.

## Doesn't human approval slow agents down too much?

Not if approval sits at the elevation boundary instead of on every action. The usual objection is that per-action approvals cause fatigue, and people start clicking through. That objection is right. The answer is to approve less often and with more context, which is the same line I draw in [AI-assisted vs AI-autonomous](https://www.robatdasorvi.com/chapters/ai-agents/ai-assisted-vs-ai-autonomous-where-the-line-actually-is-and-why-it-matters).

The incidents show what happens without a boundary. In July 2025, an autonomous Replit coding agent reportedly dropped a live production database during a code freeze, despite repeated instructions not to touch anything. Replit's CEO called it "unacceptable and should never be possible" ([eWeek](https://www.eweek.com/news/replit-ai-coding-assistant-failure/)). Nothing below the prompt enforced the freeze.

In late 2025, Google's Antigravity agent was reportedly running in Turbo mode, which lets it execute commands without user input. A command meant to clear a project cache reportedly wiped the root of the D: drive. The agent acknowledged the error afterward ([TechRadar](https://www.techradar.com/ai-platforms-assistants/googles-antigravity-ai-deleted-a-developers-drive-and-then-apologized)). Replit's CEO confirmed the first publicly; the second rests on the developer's own account.

OWASP's guidance points the same way. It names excessive functionality, excessive permissions, and excessive autonomy as the root causes of excessive agency. It recommends human approval for high-impact actions, and it says authorization should be enforced in downstream systems, not decided by the LLM ([OWASP LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)). One approval for thirty minutes of one scope costs a person one decision. Per-action approval costs a decision every time, and that's how decisions turn into rubber stamps. The boundary is also where [least-privilege scoping](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice) and [the cost tradeoff between autonomy and human review](https://www.robatdasorvi.com/chapters/ai-agents/the-economics-of-ai-agents-when-autonomous-beats-human-in-the-loop) meet in practice.

## How to implement break-glass for an agent

1. Define the entitlement in advance: scope, maximum duration, and named approvers.
2. The approver must be a human other than whoever triggered the request, never the agent.
3. The credential issuer mints a short-lived credential whose TTL is fixed at approval, for example AWS STS AssumeRole `DurationSeconds` ([AWS STS AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)) or a HashiCorp Vault lease TTL ([Vault leases](https://developer.hashicorp.com/vault/docs/concepts/lease)).
4. Log the grant, the approver, the reason, and every use.
5. Review each grant after it expires.
6. Give a human a halt the agent cannot undo: a sentinel or revocation the agent's identity has no permission to clear, which the supervisor checks before every restart.

## Why expiry matters more than the approval

Leaked secrets are the best-measured case of credentials outliving their purpose. They are not the same thing as unrevoked grants, but the failure mode is the same. GitGuardian's 2025 report found 23.8 million secrets leaked on public GitHub in 2024, a 25% increase over the year before ([GitGuardian, 2025](https://blog.gitguardian.com/the-state-of-secrets-sprawl-2025/)). The same report found that 70% of secrets leaked in 2022 were still active.

Expiry fails silently when it lives in application code or in someone's memory instead of in the credential itself. An approval gets logged the moment it happens. When the issuer enforces expiry, the grant ends at its deadline without anyone watching. If expiry is also checked in application code, check on every use, and an agent that tries to use a lapsed grant should get an error, not a retry.

My prediction: within two years, a public postmortem of an AI agent incident will name a break-glass grant that was never revoked as a root cause. After that, I expect vendors to make expiry enforcement the default instead of an opt-in setting.