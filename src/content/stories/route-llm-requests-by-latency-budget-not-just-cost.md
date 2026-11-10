---
title: "Route LLM Requests by Latency Budget, Not Just Cost"
description: "Route LLM requests by latency budget: choose the cheapest model whose recent p95 time to first token fits the deadline. Cost-only routing ignores the clock."
pubDate: 2026-11-10
category: "building"
author: "Orvi"
readingTime: 9
tags: ["LLM routing", "latency budget", "time to first token", "p95 latency", "LLM cost optimization", "agent engineering", "model router"]
featured: false
---

To route LLM requests by latency budget, filter models by recent p95 time to first token against the request's deadline, then take the cheapest one that clears your quality bar. A cost-only router never reads the clock, and benchmarks can't tell you how slow a provider is on the day you call it.

Your cost dashboard is green. The per-token bill dropped after you added a router, the average response time looks flat, and nobody has a chart for the slow end of the distribution. That's the gap this post is about, and it's where the two best-known cost-routing papers stop.

## Is latency routing worth adding if cost routing already works?

Yes, once the slow tail can break a promise you've made to a user. Cost routing has no input for time, so it can't protect that promise.

Start with what the routing research measured. The RouteLLM team (2024) trained routers on human preference data and reported that routing between a stronger and a weaker model could cut costs by more than 2x in certain cases on public benchmarks without hurting response quality ([arXiv](https://arxiv.org/abs/2406.18665); accepted at [ICLR 2025](https://iclr.cc/virtual/2025/poster/30737)). FrugalGPT (2023) pushed the cost figure further. Chen, Zaharia and Zou reported that an LLM cascade could match the best individual API's performance at up to 98% lower cost. That's a best-case number, not an average ([arXiv](https://arxiv.org/abs/2305.05176)).

Both results are honest about what they optimize. Each one is a quality-versus-cost curve. Neither has a clock in it.

## What do production latency numbers look like?

On one route on one day, the tail ran far longer than the median. In a July 28, 2026 post, OpenRouter compared two providers serving Claude Sonnet 4.5 over a single day (June 24, 2026, UTC). Its chart shows different latency curves for the two providers, and the body text says both had a much wider p99 tail than their p50 values suggest. The post defines latency as time to first token ([OpenRouter](https://openrouter.ai/blog/insights/evaluate-llm-provider-performance/)).

The same shape shows up in distributed systems generally. Dean and Barroso (2013) described hedged requests in "The Tail at Scale," published in Communications of the ACM. They reported that, in a Google benchmark reading 1,000 keys from a BigTable table spread across 100 servers, sending a hedged request after a 10 ms delay cut 99.9th-percentile latency from 1,800 ms to 74 ms while sending only 2% more requests ([Google Research](https://research.google/pubs/pub40801/)).

## What can't benchmarks see?

Benchmarks measure quality and throughput on fixed prompts, under conditions the benchmark chose. They can't see the wait your users actually get. That blind spot changes the conclusion: a model that wins the leaderboard can still miss your deadline.

Four things sit outside the data:

1. **Queueing under your load.** A single-request test measures one call at one moment. Your router sends concurrent traffic, and how a provider queues that load doesn't show up in a one-off measurement.
2. **Time of day.** One measurement can't show when a route degrades. Even the OpenRouter figures above cover a single day, so they can't show hour-by-hour degradation either.
3. **Your prompt length.** Time to first token rises with input size. Leaderboard workloads are standardized.
4. **Whether the user stayed.** No speed benchmark records abandonment. A 2026 controlled study tested TTFT delays of 2, 9 and 20 seconds on knowledge-work tasks. Its main finding on user behavior was that interaction patterns held steady across the three latencies and varied by task type instead. Its authors note that the impact of latency on user behavior and perception of output quality has not been systematically explored ([arXiv](https://arxiv.org/html/2604.06183)). That study measured how people interacted, not whether they left, so abandonment under slow first tokens is still unmeasured.

The last point is the one I've been burned by in a different form: a metric that counts completions can't see work that completes and is useless. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of my growth bot's daily comment attempts. Every run logged success, and nothing raised an error. A dashboard built from successful calls would have looked healthy the whole time.

## Does routing for speed just pick weaker models?

Not if the speed check runs as a filter after the quality check. The objection is fair, though. The fastest model is often the smallest, so sorting by speed alone pushes traffic down a tier.

The fix is to change the order of operations. LiteLLM's latency-based strategy picks the deployment with the lowest recent latency, measured as time to first token for streams, within a configurable buffer ([LiteLLM docs](https://docs.litellm.ai/docs/router/learn/strategies)). That strategy optimizes speed and nothing else. It has no quality threshold and no cost term, so it's the wrong tool if it's the only rule.

In the design below, quality decides which models are candidates. Latency removes the candidates that miss the deadline. Cost chooses among the survivors. The latency check never adds a weaker model. It only shrinks the set the quality rule already approved. The router keeps defending quality, and the budget rule decides how much of that set is still usable.

Baar-Core, a pre-flight budget library I built, makes the opposite choice on cost. Its [README](https://github.com/orvi2014/Baar-Core) describes a pre-flight cost check, a cheap model that scores task complexity, and a budget-aware downgrade: when the remaining budget gets too close, hard tasks fall back to the cheaper model so the turn still completes. Its README labels the cheap model fast, but nothing in the routing rule it describes measures latency. A downgrade is an acceptable answer to a spend cap, because the cap is about money and the turn still completes. In this design it is the wrong answer to a latency deadline, because the downgrade is triggered by the remaining budget, not by a measured response time, so it doesn't guarantee the deadline is met. A latency budget would be a new rule added to that design, not a setting you flip. For the cost side of the same problem, see [Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed). For the quality side, see [Route LLM Requests by Model Capability: Tools, Vision](https://www.robatdasorvi.com/chapters/building/route-llm-requests-by-model-capability-tools-vision).

## How do you pick a model under a latency budget?

Keep a rolling p95 time to first token for each route. Drop the routes that fail quality, drop the routes that miss the budget, and take the cheapest survivor. The sketch below shows the rule. The field names and the logging hook are placeholders for your own stack, not a product API. To get those quality scores from real traffic, see [Replay Production Prompts to Test an LLM Model Router](https://www.robatdasorvi.com/chapters/building/replay-production-prompts-to-test-an-llm-model-router).

```python
from dataclasses import dataclass

@dataclass
class Route:
    model: str
    cost_per_1k: float   # USD per 1k input tokens
    quality: float       # 0-1, from your offline eval for this task type
    p95_ttft_ms: float   # rolling window, per provider + model

def pick_route(routes, quality_floor, budget_ms, log_breach):
    eligible = [r for r in routes if r.quality >= quality_floor]
    if not eligible:
        raise RuntimeError("no route meets the quality floor")

    fits = [r for r in eligible if r.p95_ttft_ms <= budget_ms]
    if fits:
        return min(fits, key=lambda r: r.cost_per_1k)

    # Policy choice: serve the fastest quality-passing route and record the miss.
    fastest = min(eligible, key=lambda r: r.p95_ttft_ms)
    log_breach(fastest.model, budget_ms, fastest.p95_ttft_ms)
    return fastest
```

The decision table is the part to argue about with your team before you write any code:

| Situation | Route chosen | Why |
|---|---|---|
| A cheap route fits the budget and passes quality | Cheapest fitting route | Cost wins when time isn't at risk |
| Only expensive routes fit | Cheapest fitting route | The budget is a hard constraint |
| Nothing fits the budget | Fastest quality-passing route, breach logged | Quality holds, and the miss is visible |
| Nothing passes quality | Refuse, or send to human review | No speed setting fixes a quality failure |

The third row is a choice I'd make. It isn't a rule from the research. The alternative is to fail the request, which protects the deadline and hurts the user. Downgrading to a weaker model to hide a missed deadline is the option to avoid.

## What this rule doesn't solve yet

Reading the design above, five gaps stay open. A new or rarely used route has no p95 yet, so it needs a minimum sample count or a default before the rule can trust it. TTFT only protects streaming responses, and agent tool-call steps that wait for the full completion need total-latency budgets that include output length. The `cost_per_1k` field in the sketch counts only input tokens, so output-heavy tasks need an estimated output cost term. Hedged requests from "The Tail at Scale" are an alternative to filtering, but they cost duplicated tokens. A local model is one possible fallback route, and it needs its own measured p95 before this rule can choose it ([fall back to a local LLM when the API budget runs out](https://www.robatdasorvi.com/chapters/building/fall-back-to-a-local-llm-when-the-api-budget-runs-out)).

## What should you check before changing the router?

Measure p95 time to first token per route over the last week, broken out by hour, before you touch the routing rules. The router you have now is deciding based on whatever signal it was given, and the expensive mistakes come from routes that look fine on average.

If you have one minute, do this. Open your routing logs, group by route and hour, and compare each route's p95 against the slowest latency you actually promise users. If any route's p95 exceeds that promise in any hour, the cost-only router is breaking the promise, and no benchmark you read will show it.