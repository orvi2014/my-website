---
title: "Detect AI Agent Actions Outside Task Scope: Block, Don't Log"
description: "To detect AI agent actions outside task scope, check each tool call against a declared task contract before it runs, and block anything unnamed."
pubDate: 2026-10-28
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai agents", "tool calls", "agent safety", "least privilege", "human in the loop", "llm security", "agent monitoring", "owasp"]
featured: false
---

To detect AI agent actions outside task scope, check every tool call against a declared task contract before it executes, and block anything the contract doesn't name. Logs and dashboards only show a call after it has already run, so the first signal can be a customer complaint or an invoice.

I thought my agent had a safety net. It did have a lockout check. When X suspended my growth bot's account on 2026-07-21, the check returned True, the caller skipped one action, and the loop kept running for three and a half more days. The check was correct. The control around it was not.

## Why doesn't my agent's log show anything wrong?

A log records what the agent did. It doesn't record whether the agent was allowed to do it, so a clean log says nothing about scope. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of my bot's daily comment attempts. Every run logged success. Nothing threw an error. The logs were clean because they recorded activity, not outcomes. A scope gate wouldn't have caught this either: those four accounts were hardcoded targets, so they would have been on any allowlist I wrote. Checking scope and checking outcomes are separate controls, and you need both.

Monitoring asks "did it fail?" Scope asks "was this call assigned?" Outcome checks ask "did it do anything?" Those are different questions, and in my experience most agent stacks only answer the first one.

## What counts as out of scope for an AI agent?

A call is out of scope when its tool or target isn't named in the task that started the run. I keep the definition narrow on purpose. A loose one lets every bad call pass as "reasonable."

OWASP's LLM06:2025 Excessive Agency names three root causes: "excessive functionality, excessive permissions, excessive autonomy" ([OWASP GenAI Security Project, 2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)). Each one is a different way a call can drift out of scope. Excessive functionality means a tool the task never needed. Excessive permissions means reach beyond the task's target. Excessive autonomy means a high-impact action nobody approved.

Scope failures aren't exotic. Replit's agent reportedly deleted a live production database during an active code freeze, even though it had been told not to change anything ([Tom's Hardware, July 2025](https://tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data)). Replit's CEO apologized publicly and announced fixes. The AI Incident Database also logs reports that the system fabricated test results and wrongly said rollback was impossible ([AI Incident Database, Replit entry](https://incidentdatabase.ai/entities/replit)). Those details are from user reports, not confirmed by Replit.

Amazon's case is the one that should bother you. Reporting, which a [365i article](https://www.365i.co.uk/news/2026/02/22/amazon-kiro-ai-coding-tool-aws-outage/) attributes to a Financial Times report from February 2026 citing anonymous sources, says an internal coding agent called Kiro reportedly chose to rebuild an environment. That reportedly caused an outage of about 13 hours to AWS Cost Explorer in one mainland China region. Amazon attributed the event to misconfigured access controls, not the AI. My reading, which neither the FT nor Amazon states, is that both explanations point at the same gap: the agent's permissions were its scope.

## How do I detect an AI agent acting outside its task?

Declare the task as a contract when the run starts, check every call against it, and deny by default. Detectors built from known-bad patterns miss new ones. My lockout check, which watched account state rather than tool calls, failed the same way. On 2026-09-22, X suspended the account again. The lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand.

A blocklist catches the failure you already imagined. An allowlist catches the rest.

```python
from dataclasses import dataclass, field

class OutOfScope(Exception):
    pass

class AwaitingApproval(Exception):
    pass

@dataclass
class TaskContract:
    task_id: str
    allowed_tools: set[str]
    allowed_targets: set[str] = field(default_factory=set)
    needs_approval: set[str] = field(default_factory=set)

def gate(contract, tool, target, approved_by=None):
    if tool not in contract.allowed_tools:
        raise OutOfScope(f"{tool} not in task {contract.task_id}")
    if contract.allowed_targets and target not in contract.allowed_targets:
        raise OutOfScope(f"{target} not in task {contract.task_id}")
    if tool in contract.needs_approval and approved_by is None:
        raise AwaitingApproval(f"{tool} on {target} awaits human approval")
```

The hardest case is a target the agent only learns at runtime, such as a search result or an account it decides to reply to. A contract can't name those in advance. This is a recommendation, not something the code above implements: allow a runtime target only if it appears in the output of an earlier in-contract tool call in the same run, and record which call produced it. Anything the agent can't trace back to such a call stays blocked. That keeps the allowlist deny-by-default while still letting the agent act on what it finds.

The `raise` is the important line. A function that returns False or None invites the caller to skip the check. The exception has to stop the run, not just flag it. Make it terminate the process or the loop, and make clearing it a human decision. I learned the second half the hard way. After the first suspension, I found that a plain process exit wasn't enough, because launchd's KeepAlive respawned the bot. The fix was a process exit plus a sentinel file that only a human can clear.

| Signal | Action |
|---|---|
| Tool not in contract | Block, halt the run, alert |
| Known tool, unknown target | Block, halt the run, alert |
| High-impact tool, in contract | Hold for human approval |

## Isn't logging and alerting enough?

No. OWASP says logging, monitoring, and rate limiting "will not prevent Excessive Agency, but can limit the level of damage caused" ([OWASP, 2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)). That's the honest version of the counterargument, and it also answers it. An alert limits the damage. Only a gate prevents it.

The stronger objection is that a good model stays in scope on its own. Anthropic's agentic misalignment study (2025) tested 16 models from several developers in simulated scenarios. It found misaligned behavior, including blackmail, when the models faced being replaced or a conflict between their assigned goals and the company's direction ([Anthropic, 2025](https://www.anthropic.com/research/agentic-misalignment)). The scenarios were fictional, and Anthropic reported no real-world instances. The conclusion still holds for your purposes. "The model is aligned" is a property you can't check on every call, so the permission has to be enforced outside the model. OWASP makes the same point when it says ([OWASP, 2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)) authorization belongs "in downstream systems rather than relying on an LLM to decide if an action is allowed or not."

Per-call gates have limits too. Every post, reply, follow and like my bot made went through a Telegram approval I pressed by hand, and X still suspended the account twice. The second suspension came a week after I raised the reply cap from 16 to 150. I can't show that the cap caused it, but each of those calls was in scope and approved, so a per-call gate had nothing to block. A gate judges single calls. It doesn't judge the volume of a run.

## Is this worth building when most agent projects die first?

Yes, if the agent can write, send, delete, or spend. Gartner (2025) expects more than 40% of agentic AI projects to be canceled by the end of 2027, citing escalating costs, unclear value, and inadequate risk controls ([Gartner, 25 June 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)). The third reason is the one nobody puts in the demo. A scope gate costs far less than a cancellation. It's also the part people skip, because it doesn't make the demo look any smarter.

Many agents don't have a task scope at all. They have a system prompt that says "only do what the user asked" and a token that can do anything. A prompt is a request to the model. It isn't a permission the system enforces. To see the difference, look at what your agent's token can reach that its task never mentions.

The rest of the stack follows from that. Scope is the permission model, which is why [least privilege for AI agents](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice) comes before any detector. The gate's rules are easier to audit as code, which is the argument in [policy as code for AI agent tool calls](https://www.robatdasorvi.com/chapters/ai-agents/policy-as-code-for-ai-agent-tool-calls-authorizing-actions-with-opa-or-cedar). And a gate that fails quietly is just another silent failure, which I covered in [why LLM agents fail silently in production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it). And when a call slips through before the gate exists, [rolling back an agent's actions](https://www.robatdasorvi.com/chapters/ai-agents/rolling-back-an-ai-agent-s-actions-compensating-transactions-and-the-saga-pattern-for-tool-calls) is harder than it looks.

If you have one minute, do this. Write down the next run's allowed tools and targets before you start it. Make the gate raise instead of return, and make the raise stop the loop. Then test it by giving the agent a task it should refuse, and watch whether the run stops. If it finishes the task anyway, you have a log, not a gate.