---
title: "Per-Request vs Per-Session LLM Budgets in an Agent Loop"
description: "A per-request budget only caps one LLM call; a per-session budget caps the whole agent loop and must be checked before every call, not reported after."
pubDate: 2026-11-23
category: "building"
author: "Orvi"
readingTime: 8
tags: ["per-session budget", "agent loop", "LLM cost control", "runaway AI agents", "per-request budget", "LLM budget enforcement", "Python", "rate limits"]
featured: false
---

A per-request budget caps what one LLM call can cost. On its own, it can't bound an agent loop that makes hundreds of calls, each one perfectly affordable. A per-session budget caps the summed cost of a single agent run, and it has to be checked before every call, inside the code that makes the call.

Baar-Core started after an agent loop I left running overnight produced a $47 bill answering "what time is it?" queries. A loop repeating a trivial query all night is the failure a per-request cap isn't built to see. I've seen the same shape outside LLM spend. On 2026-07-21, X suspended the account of my approval-gated growth bot. The lockout check fired and returned True, but the caller skipped one action and the loop ran for 3.5 more days. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit. A check that detects the problem is not a brake unless the caller stops. A per-session budget has the same requirement: the check has to raise, and the loop has to let it end the run.

## What Does a Per-Request Budget Actually Limit?

One call, and nothing else. It can't see the other calls in the run, and every call carries the growing context of the calls before it. So a per-request number tells you almost nothing about what the run costs in total.

Anthropic reported in its engineering write-up on its multi-agent research system that agents typically use about 4x more tokens than chat interactions, and multi-agent systems about 15x more than chats ([Anthropic Engineering, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Those multipliers come from the architecture, not from one expensive prompt. A per-request cap set from a chat-sized estimate is sized for the wrong unit of work.

Cost tracks how many times the loop turns, and a per-request number never sees that. Here's what each budget scope can and can't do:

| Budget scope | What it caps | Sees the loop? | Stops a runaway run? |
|---|---|---|---|
| Per request | One call's cost | No | No |
| Per session | Sum of one run's calls | Yes | Yes, if checked before each call |
| Per day or per month | All spend in the window | Only in aggregate | Only after the run has used up the shared window |
| Per minute (rate limit) | Calls per window | No | Caps speed, not total |

A per-request limit still has a job. It bounds the unit it can see: a max_tokens or per-call ceiling caps a single runaway generation or one oversized context. A session ledger needs that bound, because its pre-call estimate is only trustworthy if no single call can blow past what the estimate assumed. Use both layers: per-request limits bound each call, and the per-session budget bounds the run.

## Doesn't My Provider's Spend Limit Already Do This?

No. Provider limits are scoped to months and minutes. A run lives in neither.

The best counterargument is that a provider cap already protects you. Anthropic's workspace limits can be set below the organization's, but they apply to monthly spend or to requests and tokens per minute ([Anthropic docs, Workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces.md)). A monthly cap doesn't know that one run has eaten its share of the day. A per-minute cap doesn't know the run is on call 300 of a loop that started an hour ago. A patient loop that stays under the per-minute ceiling never trips it, and a monthly cap only triggers once the damage is billed.

Set the provider limits anyway. They're the outer wall. They aren't the brake on one run.

## What Spend Dashboards Can't Show You

Spend dashboards are a record of completed calls. They show what each call cost after it happened. They can't show the calls a loop would have made if nothing stopped it, or the run that got cut off before it ever became a line item.

Averages are the trap. A dashboard that reports the mean cost of a run looks healthy as long as most runs are short. The bill is set by the tail, the few runs that loop for hours, and averages hide the tail by construction. The tail is exactly what a budget exists to catch. If the average is $0.02 a session, "our budget works" is true for most sessions and says nothing about the one that cost forty times that.

That's also why an alert-only budget isn't really a budget. An alert records that the tail happened. Enforcement is a decision made before the next call, and no completed-spend dataset contains that decision. "Our spend looks fine" really means "our spend is fine so far, because nothing has run long enough to matter yet."

## How Do You Enforce a Per-Session Budget Before Each Call?

Keep a ledger keyed to the run. Check the estimated cost before each network call, and record the actual cost after it. The check raises before any request leaves the process.

```python
class BudgetExhausted(Exception):
    pass

class SessionBudget:
    def __init__(self, max_usd: float):
        self.max_usd = max_usd
        self.spent = 0.0

    def check(self, estimated_usd: float | None) -> None:
        if estimated_usd is None:
            raise BudgetExhausted("no cost estimate; failing closed")
        # Runs before the network call. Raising here means no request is sent.
        if self.spent + estimated_usd > self.max_usd:
            raise BudgetExhausted(
                f"session at ${self.spent:.4f}, next call ~${estimated_usd:.4f}, cap ${self.max_usd:.2f}"
            )

    def record(self, actual_usd: float) -> None:
        self.spent += actual_usd


def run_agent(task, llm, budget: SessionBudget, estimate_cost):
    context = [task]
    while True:
        est = estimate_cost(llm.model, context)
        budget.check(est)               # brake before the call
        resp = llm.call(context)
        budget.record(resp.cost_usd)    # ledger after the call
        if resp.done:
            return resp.text
        context.append(resp.text)
```

This is a sketch, not Baar-Core's implementation. It skips the parts that take real work: a pricing table that matches your models, a retry policy that doesn't double-charge you, and concurrency control if several calls can be in flight. Three design choices carry most of the weight.

The check has to run before the call. LiteLLM's agent iteration budgets work this way: the accumulated session cost is checked before each new call, and an exceeded budget returns a 429 with type `budget_exceeded` ([LiteLLM docs, 2026](https://docs.litellm.ai/docs/a2a_iteration_budgets)). Its session spend counters expire after a configurable TTL, so a long run needs that TTL set on purpose, not inherited.

The enforcement has to sit outside the loop the model controls. AWS's Well-Architected guidance for agentic systems recommends layering per-cycle, per-task, and per-day limits, implemented outside the agent's control loop ([AWS Well-Architected, Agentic AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentcost07-bp01.md)). A prompt telling the model to watch its spending is a request, not a control.

The brake has to fail closed. If the estimate is missing, treat it as expensive. Silent defaults to zero are how a budget becomes decorative.

Related reading: [Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed) goes further on estimation. For limits that protect a shared product instead of one run, [Cap LLM Spend per End User in a Multi-Tenant SaaS App](https://www.robatdasorvi.com/chapters/building/cap-llm-spend-per-end-user-in-a-multi-tenant-saas-app) covers the other axis. Whether a hard cap rather than an alert is the right tool at the provider layer is covered in [How to Set a Hard LLM API Spend Limit (Alerts Won't)](https://www.robatdasorvi.com/chapters/building/why-i-built-hard-spending-caps-for-llm-apis).

## How I Scoped the Budget in Baar-Core

[Baar-Core](https://github.com/orvi2014/Baar-Core) applies the same ledger idea, with the budget set on the router itself:

```python
router = BAARRouter(budget=0.10)  # hard cap: $0.10 total
```

The budget is a hard cap on total spend across every call that router makes. That makes it a session-scoped budget, not a per-request one: one number covers the whole run, so a loop with hundreds of calls is bounded by the same $0.10 as a single call.

Before each call, the router estimates the cost locally. If the remaining budget is too low, it raises `BudgetExhausted`, and no network request is made.

The trade-off is the budget-aware downgrade: when the budget is running low, hard tasks fall back to the cheaper model so the turn still completes. A hard task may get the cheaper model instead of the capable one, in exchange for the turn finishing.

In the LangGraph pattern, every tool-call iteration is budget-checked before the LLM is invoked, so the loop stops locally instead of leaving a dangling API call.

What's still open is the part a per-session ledger can't settle on its own. Pre-call estimates can be wrong, especially for images, where the cost depends on more than the text of the request ([Estimate Image Tokens Before an LLM Call to Enforce a Budget](https://www.robatdasorvi.com/chapters/building/estimate-image-tokens-before-an-llm-call-to-enforce-a-budget) works through that case). Retries are open too: a retried call may be billed again, so the ledger has to decide whether it counts as a new charge. Concurrent in-flight calls are open as well, because several calls can be underway before any of them records its actual cost. Those are open problems for any per-session ledger.

## What Should You Do This Week?

Find the loop that makes the most calls. Put a per-session ledger around it, and make the check raise before the network call. Then run the loop once on purpose with a cap of a few cents and confirm it stops. You can run that test without spending anything; see [Test an LLM Router Without Paying for API Calls](https://www.robatdasorvi.com/chapters/building/test-an-llm-router-without-paying-for-api-calls). A budget you've never seen trip is a budget you don't know works.

If you only have a minute, stop asking what a call costs and start asking how much a run is allowed to spend. Then write that number into the loop itself. The dashboard can tell you what happened last night. Only code in the loop can stop tonight's run.