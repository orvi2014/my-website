---
title: "How Semantic Routing Cut My LLM Costs by 70% Without Touching Model Quality"
description: "Semantic routing cut my LLM cost by 70% with no quality drop. The data on why 86% of your frontier-model calls are wasted."
pubDate: 2026-06-18
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["semantic routing", "LLM cost", "ai-agents", "RouteLLM", "model routing", "inference cost", "FrugalGPT", "llmflation"]
featured: false
---

For nearly two years I sent every single request my product made to the most expensive frontier model available, and I told myself this was discipline. "Don't prematurely optimize." "Quality first." "Compute is cheap relative to engineering time." I believed all of it. I was wrong, and the bill was the proof: I was paying GPT-4-class prices to answer questions a model one-tenth the cost could have answered correctly.

The fix was semantic routing, and it cut my LLM cost by roughly 70% with no measurable drop in output quality. That sentence sounds like a vendor pitch, so let me lead with the number that broke my assumptions instead: in the RouteLLM study from UC Berkeley, Anyscale, and Canva, a router kept **95% of GPT-4's performance while sending only 14% of queries to GPT-4 at all** ([LMSYS, 2024](https://www.lmsys.org/blog/2024-07-01-routellm/)). Eighty-six percent of the traffic never touched the expensive model — and the quality barely moved.

Sit with that. The conventional story is that you pay frontier prices because frontier capability is what keeps your output good. The data says the opposite: for the overwhelming majority of real queries, frontier capability is something you buy and then throw away.

## Does routing LLM queries to cheaper models actually hurt quality?

No — and that is the uncomfortable part. In controlled benchmarks, well-trained routers preserve almost all of the strong model's quality while cutting the bill dramatically. RouteLLM reported **cost reductions of over 85% on MT Bench** while retaining 95% of GPT-4's performance ([LMSYS, 2024](https://www.lmsys.org/blog/2024-07-01-routellm/)). The 2023 FrugalGPT paper from Stanford went further, showing a cascade that **matched GPT-4's accuracy with up to 98% lower cost** ([Chen, Zaharia & Zou, 2023](https://arxiv.org/abs/2305.05176)).

The mechanism is unglamorous. A small classifier — sometimes a fine-tuned embedding model, sometimes matrix factorization trained on human preference data — looks at the incoming query and predicts whether the cheap model will get it right. Easy queries go to the cheap model. Hard ones escalate. That is the whole idea. It is not a new model, not a smarter prompt, not a fine-tune of your frontier model. It is a triage nurse standing at the door.

And here is the quotable truth I wish someone had said to me in 2024: **the reason routing works so well is that most of your traffic was never hard enough to justify a frontier model in the first place.** The savings aren't a clever trick. They're a refund on capability you were never using.

## Why do teams keep paying frontier prices for trivial queries?

Because downgrading a model is a career risk, and nobody wants to own it. This is the thing everyone in the space is privately thinking and almost nobody writes down.

If you route 80% of traffic to a cheaper model and one customer gets a bad answer, that failure has your name on it. You made the call to "cheap out." But if you send everything to the most expensive model and the output is mediocre, that's just the model's fault — you bought the best, what more could you do? The incentives are completely lopsided. Defaulting to the frontier model is, organizationally, the safe choice, even when it is the expensive and unnecessary one. So teams pay a tax measured in real dollars to avoid a risk measured in blame.

I'll say the rest of it plainly, since most write-ups won't: a large fraction of "we use GPT-4 for everything" architectures are not engineering decisions. They are status decisions and fear decisions wearing an engineering costume. Using the best model feels like rigor. Measuring whether you need it feels like cutting corners. The framing is exactly backwards, and the people defending it usually have not run the per-query cost breakdown — because once you run it, the position becomes indefensible.

## How much can semantic routing actually save in production?

In my case, around 70% of monthly inference spend, holding quality flat on my eval set. That sits comfortably inside the published range — RouteLLM's 85% on MT Bench at the high end, FrugalGPT's up-to-98% in cascade setups, and lower figures on harder benchmarks like GSM8K math, where more queries genuinely need the strong model ([LMSYS, 2024](https://www.lmsys.org/blog/2024-07-01-routellm/)).

That spread matters and the honest version of this article has to name it: routing savings are **not** uniform. On reasoning-heavy or math-heavy workloads, a far larger share of queries legitimately need the frontier model, and your savings shrink toward 35–45%. On the broad mush of real product traffic — classification, extraction, summarization, "rewrite this politely," "is this query about billing or shipping" — the cheap model is right almost every time, and savings climb past 70%. The lesson is not "route everything." It is "find out what your traffic actually is," which most teams have never measured.

When I finally instrumented mine, the distribution was embarrassing. The median request was a formatting or classification task. I had been renting a supercomputer to alphabetize a list.

## Isn't semantic routing just premature optimization you'll regret?

This is the strongest counterargument, and it fails on its own terms. The "premature optimization" objection assumes routing is a fragile micro-optimization you'll have to rip out when models change. The data points the other way.

LLM inference prices are collapsing — Andreessen Horowitz documented what they call "LLMflation," a **roughly 10x drop per year in the cost of a given quality level over three years, with a GPT-3-class model now about 1,000x cheaper than in 2021** ([a16z, 2024](https://a16z.com/llmflation-llm-inference-cost/)). At first glance that looks like an argument *against* routing: if everything gets cheap, why bother triaging?

But Epoch AI's analysis shows the decline is **fast and deeply unequal across tasks** ([Epoch AI, 2025](https://epoch.ai/data-insights/llm-inference-price-trends)). Prices for commodity capability crater while frontier reasoning stays expensive, because the frontier keeps moving and you keep wanting the new top model. The gap between "cheapest model that can do this task" and "best model available" doesn't close — it persists, and often widens, because both ends move at once. Routing is the machine that captures that gap automatically, every single day, no matter where the two ends sit. That is the opposite of a brittle optimization. It is infrastructure that compounds in value precisely because prices keep moving.

The other half of the objection — "routers add latency and a new point of failure" — is real but small. A routing classifier is typically a sub-100-millisecond embedding lookup or a tiny model, dwarfed by the generation time of the LLM it's protecting you from. And the failure mode is benign: misroute a hard query to the cheap model and your worst case is escalation, not catastrophe. FrugalGPT's cascade design handles exactly this by passing low-confidence answers up the chain ([Chen, Zaharia & Zou, 2023](https://arxiv.org/abs/2305.05176)). You can build it to fail upward, toward quality, not downward.

## So why isn't semantic routing already the default everywhere?

Because the people who would benefit most are the ones least incentivized to measure their own waste — and the tooling only recently got good enough to remove the excuse. RouteLLM was published at ICLR 2025 with open code and pretrained routers; it matched commercial routing products like Martian and Unify AI while running **over 40% cheaper** ([LMSYS, 2024](https://www.lmsys.org/blog/2024-07-01-routellm/)). The technical barrier is essentially gone. What remains is the organizational one: routing forces you to admit, in a dashboard, exactly how much of your bill was buying nothing.

That admission is uncomfortable, which is why the conversation stays polite. People talk about "model selection strategy" and "cost-quality tradeoffs" because those phrases imply the spending was thoughtful. The blunt version — *we never checked, and most of it was waste* — doesn't make it into the conference talk. But it's the true version, and the cost of not saying it is denominated in a currency every engineering leader claims to care about.

Here is my falsifiable prediction. By the end of **2027**, semantic routing will stop being a thing you bolt on and become a default layer — I expect at least one of the three major API providers (OpenAI, Anthropic, Google) to ship native query routing inside their own API, automatically downgrading easy calls and billing you less, marketed as a feature rather than a discount. And I'll commit to the harder, checkable claim: teams running a single frontier model for all traffic at the end of 2027 will be paying **3x to 5x more than routed competitors for statistically indistinguishable output quality**. If that gap fails to materialize — if unrouted and routed costs converge — I was wrong, and you can hold this paragraph against me.

I spent two years calling my waste discipline. The data was available the whole time. The only thing I lacked was the willingness to look at it, and that, not the engineering, is the part that should worry you.