---
title: "How to Set a Hard LLM API Spend Limit (Alerts Won't)"
description: "To set a hard LLM API spend limit, block calls in your own code once a budget is hit; provider alerts only notify. Here is the gap and how to close it."
pubDate: 2026-10-13
category: "building"
author: "Orvi"
readingTime: 8
tags: ["llm api spending limit", "llm cost control", "ai agents", "api budgets", "openai", "anthropic", "finops", "agent safety"]
featured: false
---

An LLM API spending limit is the control most teams think they already have, and the common version doesn't stop spending. In a February 2026 survey of 500 finance leaders at large US and UK enterprises, Sapio Research and DoiT found that 89% of organizations rating themselves "very mature or leading edge" on FinOps had AI cost overruns in the past 12 months. Within that group, the mean overspend reaches 30.9%, the highest of any segment in the study. The teams that rate their cost practice highest report overruns more often than the 79% average, which should bother anyone who thinks measuring spend is the same as controlling it.

## Why do the most mature teams overspend the most?

The survey doesn't say why; my reading is that mature teams detect overruns better, and detection arrives after the money is gone. The overall survey figure is 79%, so overruns are the norm, not the exception. The sample is large enterprises, not solo builders, so it measures how mature budgeting fails at scale, not how an indie project fares. Still, the controls big companies use are the same ones a solo developer reaches for first.

Source: [DoiT, "AI spending survey"](https://www.doit.com/blog/ai-spending-survey), which reports the Sapio Research survey conducted in February 2026.

## What does a budget alert actually do?

It sends a message and leaves the spend running. Google's documentation is blunt about this: "Setting an alerts-only budget doesn't automatically cap Google Cloud or Google Maps Platform usage or spending." Its budget alert emails "don't automatically prevent the use or billing of your services" once a threshold is crossed. Google's page describes spend cap budgets, which are configured per project and are available only for services that support them. It says that when a cap is enforced, the specified services are "paused until you manually lift the cap." The page links to a list of eligible services rather than naming them.

OpenAI's spend-limit guide draws the same line. "Spend alerts do not enforce a cap." They "remain active when you add a hard spend limit," so the alert and the cap are two different controls.

The problem with the conventional choice is that it looks like control. A team with a $500 alert and a runaway loop gets notified at $500 and keeps getting billed until someone reads the message. The alert measured the overrun. It did not prevent it.

Sources: [Google Cloud, "Set budgets and budget alerts"](https://docs.cloud.google.com/billing/docs/how-to/budgets) and [OpenAI, "Spend limits"](https://developers.openai.com/api/docs/guides/spend-limits).

## Aren't provider spend limits already enough?

Provider limits are real caps, but they work at the account and workspace level, and they enforce with lag. This is the strongest counterargument, and the provider documentation supports it in part.

OpenAI's hard limit makes affected requests fail once reached. The error code names the level that tripped: `organization_spend_limit_exceeded` or `project_spend_limit_exceeded`. The same page warns: "Enforcement is not instantaneous, so recorded spend can slightly exceed the configured amount." Anthropic's help center, dated June 30, 2026, says "You can only set a spend limit that is lower than your organization's limit," and that "If unset, your spend limit defaults to the organization's limit."

Those are good controls, and they answer a real question: how much can this account or workspace spend in a month? They don't answer the questions an agent builder asks. The pages I read describe limits at the organization, project and workspace level. Neither describes a cap on one end user or one agent run. A single runaway run inside a project with a large monthly cap can eat most of that cap before the project-level limit trips, because the limit covers the whole project's traffic, not the one run that is looping.

So the provider cap is a backstop for the account. It isn't a budget for the unit that is actually looping.

## What my own agent taught me about checks that don't stop anything

In my approval-gated X agent, the failures that lasted longest were the ones where the loop kept running: a lockout check whose result didn't halt the process, dead target accounts logging success, and a parse error that silently burned a 48-hour slot. A spending alert fails the same way.

Several incidents in my own project show the same shape. None of them is a billing incident. They are here because in each one the system kept running while something was wrong, and nothing in the loop was built to stop it.

- Four hardcoded target accounts that no longer existed absorbed 88% of the bot's daily comment attempts for about six weeks. Every run logged success. Nothing raised an error.
- The Telegram Skip button did nothing for months. Every skipped item was counted as a timeout, so the approval statistics for that period are wrong.
- The long-form article lane lost 8 of 20 generations to JSON parse errors. Each failure burned a 48-hour slot, which comes to 384 hours of blocked slot time across the eight failures. Nothing alerted on it.
- X suspended the account on 2026-07-21. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit.
- X suspended it again on 2026-09-22, a week after the reply cap was raised from 16 to 150. This time the lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand.

None of these is a spend incident. A budget alert has the same weakness: it can report, but it cannot stop.

## Why does the check have to run before the request?

Because a call that is never sent is never billed, and that is the only point at which a cap is certain. I built noburn around that one decision. It runs a pre-flight check in the customer's own code, immediately before the provider call. The check returns allow or block. A blocked call isn't sent, so it isn't billed, and according to the product's own stated behaviour, a blocked call doesn't consume quota. Caps resolve at three levels in one call: project, per end user, and per run.

The design has costs, and I'd rather name them than hide them.

There is no proxy. The check is a call from the customer's code, not a gateway their traffic routes through. Gateways such as LiteLLM and Portkey can refuse a call too (per their documentation), but only once all traffic runs through their proxy. noburn trades that completeness for keeping the direct connection to the provider.

Fail-open or fail-closed is the customer's call. If noburn is unreachable, the `onError` setting decides whether the call proceeds or stops. Fail-open means a noburn outage lets spend through. That's the right default for some products and the wrong one for others.

Latency isn't measured yet. There's no production latency figure, because there isn't enough traffic to quote a p50 honestly, and the project doesn't publish one. `scripts/bench-check.mjs` measures the added latency against the reader's own project instead.

There are no customers, logos or case studies. The product is pre-launch, and I'm not presenting it as proven.

noburn is at [noburn.dev](https://noburn.dev), and the SDKs are published as `@noburn/sdk` on npm and `noburn` on PyPI, both at version 0.1.0 under MIT. The broader problem of shipping AI-built code without losing track of what it actually does is in [how to build with AI without losing track of what you are actually building](https://www.robatdasorvi.com/chapters/building/how-to-build-with-ai-without-losing-track-of-what-you-are-actually-building). The operational side of running several products at once is in [the systems I use to run three products as one person](https://www.robatdasorvi.com/chapters/building/the-systems-i-use-to-run-three-products-as-one-person).

## What does a per-run spending cap look like in code?

The integration is two calls around the provider request. Before the call, run the pre-flight check with estimates for that request. If the result is `blocked`, skip the call. After a successful call, record the actual token counts. Caps resolve at three levels in one call: project, per end user, and per run.

```js
// 1. Before the call: check against estimated tokens
guard.check({ model, estimatedTokensIn, estimatedTokensOut, endUserId }) // if blocked, skip the call
// onError decides whether an unreachable noburn fails open or closed

// 2. The provider call runs only if the check was not blocked

// 3. After a successful call: meter the actual spend
guard.record({ /* actual token counts from the response */ })
```

The README's minimal example shows the end-user field; it does not show how a run is identified, so check the docs at noburn.dev/docs for the per-run parameter before relying on it.

The two calls do different jobs. `check` works from estimated tokens, because the request has not been sent yet, so it can only predict what the call will cost. `record` meters actual spend, from the token counts of the completed call. The per-run cap is therefore only as accurate as its estimates, and the check can allow a call that the recorded spend later shows would have crossed the limit.

That gap is an open problem. An estimate can be lower than what the call really uses. Reconciling the predicted figure with the metered one inside a single run is the part of the design I consider unsolved, and it is the first thing to test against your own workload.

## What will the next survey show?

If the Sapio-DoiT survey runs again in February 2027 with the same method, I expect its AI overrun rate to stay at or above 70%. The prediction rests on one claim: budgets and alerts measure overruns after they occur, and visibility alone doesn't stop them. If the February 2027 figure comes in below 70%, that claim is wrong. The improvement would then have to come from enforcement being adopted at scale, and I'd treat that as the first evidence that hard caps work where alerts didn't. The survey samples enterprise finance leaders, so a result in that range wouldn't settle the question for solo builders, and it would be one data point on the mechanism, not proof of it.

Sources:
- [DoiT, "AI spending survey" (Sapio Research, February 2026, n=500)](https://www.doit.com/blog/ai-spending-survey)
- [Google Cloud, "Set budgets and budget alerts"](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [OpenAI, "Spend limits"](https://developers.openai.com/api/docs/guides/spend-limits)
- [Anthropic Help Center, "Creating and managing Workspaces in the Claude Console" (dated June 30, 2026)](https://support.claude.com/en/articles/9796807)