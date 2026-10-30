---
title: "Cap LLM Spend per End User in a Multi-Tenant SaaS App"
description: "To cap LLM spend per end user in SaaS, reserve each call's worst-case cost in your own database before sending it. Provider limits can't do this."
pubDate: 2026-10-29
category: "building"
author: "Orvi"
readingTime: 8
tags: ["LLM cost control", "multi-tenant SaaS", "per-user quotas", "AI budgets", "denial of wallet", "rate limiting", "SaaS architecture", "OpenAI API"]
featured: false
---

To cap LLM spend per end user in a SaaS app, reserve each request's worst-case cost against that user's budget in your own database before the provider call. If the reservation doesn't fit, refuse the call. Provider spend limits are scoped to organizations, projects and workspaces, not to the end users inside them, so they can't stop one customer's spend from reaching another's.

A per-user rate limit doesn't cap what a user spends on your LLM bill. The usual advice goes like this: meter tokens after each call, roll them up by tenant, add a provider budget as a backstop, and bill or throttle from the ledger. Read against the provider and gateway documentation, that advice has a hole, and the hole is exactly where the money leaves.

## Isn't a Per-User Rate Limit Enough?

No. A rate limit bounds requests per minute. Cost is tokens times price, and one request can vary in cost by orders of magnitude.

Take two tenants on a limit of 5 requests per minute. One sends short chat messages. The other pastes a 150,000-token document into every request. The rate limiter treats them the same, and the invoice doesn't. This is an illustrative case, not a measurement, but it's the arithmetic every rate limiter skips.

The security community already has a name for the attack version. OWASP's Unbounded Consumption entry (LLM10 in its 2025 Top 10 for LLM applications) lists "denial of wallet," where attackers exploit pay-per-use pricing with high volumes of operations ([OWASP LLM10:2025](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/)). The shape of the problem is clear: a request-count limit doesn't bound a dollar amount.

## Doesn't My Provider's Spend Limit Already Do This?

No. Provider limits count your whole account or workspace, not the customer who triggered the spend.

OpenAI's spend-limit guide says an organization hard limit covers all projects. Hitting it returns a 429 with the code `organization_spend_limit_exceeded` ([OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits)). Anthropic lets you set a monthly spend limit per workspace. The same documentation says organization-wide limits always apply, even when the workspace limits add up to more ([Anthropic workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces)). You could give each tenant its own OpenAI project, which gets its own hard limit and a `project_spend_limit_exceeded` 429 ([OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits)), or its own Anthropic workspace. That doesn't hold up for end users. Anthropic caps an organization at 100 workspaces by default, workspace limits are monthly, and the organization limit still applies over all of them ([Anthropic workspaces](https://platform.claude.com/docs/en/manage-claude/workspaces)).

So the failure has a specific shape. One tenant exhausts the shared pool, and every tenant gets a 429. A provider cap doesn't isolate customers. It turns one customer's spending into everyone's outage. I cover the alarm side of this in [How to Set a Hard LLM API Spend Limit (Alerts Won't)](https://www.robatdasorvi.com/chapters/building/why-i-built-hard-spending-caps-for-llm-apis). The per-tenant version is a different problem. A hard limit that is correct for the account can be wrong for the customer.

## Is a Gateway the Real Answer?

A gateway can enforce a per-user budget, but only if every call goes through it. That's an architectural commitment, and it brings its own failure modes.

LiteLLM's budget documentation (checked October 2026) makes the constraints concrete. Personal budgets attach to virtual keys that have no team. If a key belongs to a team, only the team and team-member budgets are enforced; the key owner's personal budget doesn't apply. Team-member budgets do give you a per-user limit, as long as each end user maps to a team member. The same page says budgets are enforced against spend read from a database, so a deployment without that database has no recorded spend to enforce against ([LiteLLM budgets](https://docs.litellm.ai/docs/proxy/users)). For the global `max_budget`, the docs say that case fails open rather than erroring.

So you take on three things: a proxy in your request path, a database the proxy depends on, and a key-to-user mapping that has to stay correct. Some teams should accept that trade. [noburn](https://noburn.dev), which I build, takes the other position: no proxy. Its pre-flight check is one call from the customer's own code, made before the provider request exists. The customer keeps the provider SDK and a direct connection to the provider. Its documented caps apply at the project, per end user, and per run. In the SDK, the call is `guard.check({ model, estimatedTokensIn, estimatedTokensOut, endUserId })` before the provider request; if it returns blocked, the call is skipped. After a successful call, `guard.record()` takes the actual token counts so spend is metered. A blocked call does not consume quota. The check decides before the request exists, and that's the only point where a refusal costs nothing.

| Control | Scope | Decides before the call? | Caps per end user in dollars? |
|---|---|---|---|
| Provider spend alert | Organization or project | No | No |
| Provider hard limit | Organization or project | Yes | No |
| Per-user request rate limit | Per user | Yes | No, bounds requests only |
| Gateway virtual-key budget | Per key, if routed through proxy | Yes | Yes |
| Application ledger with reservation | Per end user | Yes, in your code | Yes |

## What Should the Check Actually Do?

It should reserve the worst case before the call, atomically, and then settle the real cost afterward. The worst case is the estimated input cost plus the output cost at the output-token ceiling you set: `max_tokens` on Anthropic, `max_completion_tokens` on OpenAI (on reasoning models that ceiling includes reasoning tokens). The provider can't bill more output tokens than that ceiling, but only if every request sets it. OpenAI doesn't require it, so make it mandatory in your wrapper and refuse requests that omit it. Per-call charges for server-side tools such as web search fall outside this bound, so price them into the reserve separately.

Here's a minimal sketch. It isn't from any product. It assumes a `budget_ledger` row per end user with `cap_usd`, `spent_usd`, and `reserved_usd` columns:

```ts
// Sketch: reserve worst case, call, settle. Assumes a budget_ledger row per end user.
export async function callLLM(endUserId: string, req: LLMRequest) {
  const reserve = worstCaseUsd(req); // input estimate + output-token ceiling at output price

  // One UPDATE is the check and the reservation. Postgres re-evaluates the WHERE
  // on the locked row, so two concurrent calls cannot both fit the last dollar.
  const { rowCount } = await db.query(
    `UPDATE budget_ledger
        SET reserved_usd = reserved_usd + $2
      WHERE end_user_id = $1
        AND spent_usd + reserved_usd + $2 <= cap_usd`,
    [endUserId, reserve],
  );
  if (rowCount === 0) throw new BudgetExceeded(endUserId);

  let res;
  try {
    res = await provider.complete(req);
  } catch (err) {
    // A timeout or dropped stream can still be billed; charging the reserve is the conservative error.
    await db.query(
      `UPDATE budget_ledger
          SET reserved_usd = reserved_usd - $2,
              spent_usd    = spent_usd + $2
        WHERE end_user_id = $1`,
      [endUserId, reserve],
    );
    throw err;
  }

  await db.query(
    `UPDATE budget_ledger
        SET reserved_usd = reserved_usd - $2,
            spent_usd    = spent_usd + $3
      WHERE end_user_id = $1`,
    [endUserId, reserve, actualUsd(res.usage, req.model)],
  );
  return res;
}
```

One leak the sketch doesn't handle: if the process dies between the reservation and the settle, the reserve never clears and that user's headroom shrinks for good. A production version needs a reservation id with an expiry and a sweeper that releases or charges stale reserves.

The obvious objection is that estimates are guesses, so the cap will leak. But if every request sets an output-token ceiling, the reservation is built from an upper bound on output. That leaves only the input estimate as a possible error. Count input with the provider's tokenizer or add a margin, and log the gap between reserved and settled cost. Over-estimating blocks a few calls that would have fit. Under-estimating quietly lets spend through. For a cap, the first error is the one you want.

## What Happens When the Check Itself Breaks?

It must refuse the call. A guard that fails quietly is just a log line.

In July 2026, the lockout check in my X growth agent returned True after the account had been suspended. The caller skipped one action, and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file that only a human can clear. A plain exit wasn't enough, because launchd's KeepAlive respawned it. In September 2026 the account was suspended again. This time the lockout check matched none of its known selectors, so it never fired, and I stopped the bot by hand.

The two failures were different. In July the check answered correctly, and the caller treated that answer as a reason to skip one action instead of stopping. In September the check never answered at all. In both cases the loop kept running because the check's answer never stopped it. A budget ledger has the same exposure. If the database is unreachable, the call has to fail with an error you count. It can't go ahead as if the budget were fine. noburn leaves this choice to the integrator: an `onError` setting decides whether an unreachable noburn fails open or closed, and that decision sits in the customer's own code. Failing closed has a real cost: a ledger outage stops AI features for every tenant. I'd take that visible failure over a loop that keeps running while nothing raises an error. Keep the ledger's tenant isolation correct too, as in [Postgres Row-Level Security for Multi-Tenant SaaS](https://www.robatdasorvi.com/chapters/building/postgres-row-level-security-for-a-multi-tenant-agency-client-portal-design-and-pitfalls), so one tenant's rows can't touch another tenant's budget.

## What noburn Doesn't Do Yet

noburn is hosted-only today. Self-hosting is a gap, not a stance. There isn't enough traffic to quote a production latency figure, so `scripts/bench-check.mjs` measures added latency against your own project instead. It is pre-launch, with no customers yet. By design it records no traces, spans or evaluations; it composes with an existing tracing stack rather than replacing one.

## Is It Worth Building Yourself?

Yes, if your LLM cost grows with the number of end users and you aren't already routing every call through a gateway. The per-call check is small. The pre-flight pattern gets a fuller treatment in [Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed).

The documents above all point the same way. Provider limits are scoped to the account. Gateway budgets need routing and a database. Rate limits count requests, not dollars. What's left is the check in your own call path.

If someone has told you that per-user caps are a rate-limit problem, change the order of work. This week, create a ledger table keyed by tenant, with a cap column and a reserved column. Put the conditional UPDATE in front of the provider call, not behind it. Track refusals as a metric and read it every Monday. Then pick a per-user cap that would embarrass you if it were exceeded, and test it on staging by pushing one test tenant past it. If the call goes through, the cap isn't a cap.