---
title: "Replay Production Prompts to Test an LLM Model Router"
description: "To test an LLM model router, replay production prompts through the candidate, grade answers against your current model, and switch only on measured parity."
pubDate: 2026-11-09
category: "building"
author: "Orvi"
readingTime: 8
tags: ["LLM routing", "model router", "LLM evals", "shadow testing", "production traffic", "LLM-as-judge", "AI agents", "cost optimization"]
featured: false
---

Replay production prompts to test your LLM model router. Send a sampled slice of live traffic through the candidate, grade its answers against what your current model produced, and switch only when the grades hold. Sample enough prompts from each task type to see its failures, which for most products means a small slice of traffic rather than all of it, and read the results per task type instead of as one average.

The approval stats in my Twitter growth agent were wrong for months, and nothing complained. The Telegram Skip button did nothing, so every skipped item got logged as a timeout. The numbers looked like a working system because the system's bookkeeping agreed with itself.

A model router can fail the same way. It sends a request to a cheaper model, gets a 200 back, and logs a lower cost. Every metric you already watch says the change worked. The one metric that would say otherwise, answer quality on your prompts, is usually the one nobody records.

## Is Replaying Production Prompts Worth the Effort?

Yes, once a router will send real users to a model other than the one you already trust. Before that point, a benchmark comparison might be enough.

Routers get bought and tuned against the numbers an organization already reviews: cost per call, latency, error rate. A router that sends easy prompts to a cheap model improves all three on day one. Quality has no line on the dashboard, so any tuning done against that dashboard optimizes for cost and latency alone.

Much of the routing literature leads with cost. [FrugalGPT (Chen, Zaharia and Zou, 2023)](https://arxiv.org/abs/2305.05176) reports up to 98% savings in inference cost while matching the best individual LLM on the downstream task. The savings are the headline. Whether that match holds on your prompts is a separate question the headline never answers.

## Why Don't Public Benchmarks Settle the Router Question?

Public benchmarks measure a router's average behavior on someone else's prompts. That's the wrong distribution for your product. Use them to shortlist candidates, not to approve one.

The [RouteLLM paper](https://arxiv.org/abs/2406.18665) reports cost reductions of more than 2x in some settings on public benchmarks. Its [project page](https://sky.cs.berkeley.edu/project/routellm/) claims over 85% savings on MT-Bench while keeping 95% of GPT-4's performance. MT-Bench is 80 multi-turn questions. Your support tickets, extraction schemas, and required output formats aren't in it, so a router tuned to that distribution has never seen your failure modes.

The benchmark and the dashboard share one flaw. Both measure the router on inputs that are easy to score, then treat that score as a stand-in for the thing you care about. Replay swaps the stand-in for your own traffic.

## How Many Production Prompts Should You Replay?

Replay a stratified sample: a fixed minimum number of prompts from every task type, topped up with a small percentage of total traffic. Treat any fixed percentage as a starting point. The number that matters is how many samples each task type gets, not the overall percentage.

Stratify by task type, because failures can cluster there. Say a router is right on 97% of your summarization prompts and wrong on every legal extraction. The average hides the second problem, and the average is the number that ends up on the cost slide.

## How Do You Grade Replayed Answers Without Fooling Yourself?

Grade pairwise against the answer users already got. Judge in both orders and count only verdicts that agree across both. The candidate's answer never gets served. It exists only to be compared.

```python
import random
from collections import defaultdict

SAMPLE_RATE = 0.075  # example rate; tune per product
MIN_PER_TASK = 50  # example floor, not a measured number
rng = random.Random(20261109)  # fixed seed so the sample is reproducible

def normalize(verdict, candidate_side):
    # Map "a" / "b" / "tie" to who won, given which side the candidate was on.
    if verdict == "tie":
        return "tie"
    return "candidate" if verdict == candidate_side else "served"

def replay(traffic_log, route, judge):
    groups = defaultdict(list)
    for row in traffic_log:
        groups[row["task_type"]].append(row)

    rows = []
    for task, group in groups.items():
        k = min(len(group), max(MIN_PER_TASK, int(SAMPLE_RATE * len(group))))
        for row in rng.sample(group, k):
            prompt, served = row["prompt"], row["response"]  # what the user got
            candidate = route(prompt)                        # shadow only, never served
            ab = judge(prompt, a=served, b=candidate)        # "a" | "b" | "tie"
            ba = judge(prompt, a=candidate, b=served)
            rows.append({
                "task": task,
                "ab": normalize(ab, "b"),  # in the ab call, the candidate is "b"
                "ba": normalize(ba, "a"),  # in the ba call, the candidate is "a"
            })
    return rows
```

The served answer is the baseline, so the test measures change against the system users already depend on. Both judge orders are required because a single order lets the judge's position preference decide the close calls.

Decide per task type using a fixed table, written before the replay runs:

| Result on the sampled slice | Action |
|---|---|
| Two-order losses ≤ 5% AND wins-or-ties in both orders ≥ 95% of samples | Promote the router for that task type |
| Two-order losses > 5% | Keep the current model for that task type |
| Anything else (too many flipped verdicts to reach 95%) | Hand-review the flipped samples; if they are genuine close calls, count them as ties and re-apply the table; otherwise tighten the rubric and rerun |

A sample counts as a win or tie only when both orders agree; a sample whose verdict flips between orders counts as neither until it is reviewed.

The 95% and 5% thresholds are examples. Pick yours per task type based on what a wrong answer costs, and write them down before the replay runs.

Writing the table first matters. A threshold picked after the results arrive will fit whatever the results happened to be.

## Does an LLM Judge Make the Replay Meaningless?

No. The judge's biases are real, which is exactly why the protocol above runs both orders and keeps the candidate out of its own judging. They're controllable, not disqualifying.

[Zheng et al. (2023)](https://arxiv.org/abs/2306.05685) document position bias, verbosity bias, and self-enhancement bias in LLM judges. The same paper reports that a strong judge such as GPT-4 reaches over 80% agreement with human preferences on MT-Bench and Chatbot Arena. Eighty percent isn't perfect, which is why replay gives you a ranking of candidates on your traffic rather than a verdict. It still beats the cost chart, which has no quality signal at all.

The fix for self-enhancement is structural: the judge must come from a different model family than any model the router can select, so no model grades its own answers or its family's. The fix for verbosity is a rubric that scores correctness against the source material.

## What Can't You Replay?

Prompts whose tool calls have side effects, such as sends, writes, or payments, have to be replayed with tools stubbed or skipped, or the replay repeats those actions. Multi-turn prompts need the full stored conversation context, not just the last message, or the candidate answers a question the user never asked. Logs that contain user PII need the same access controls in the replay pipeline as in production. Sampling temperature means a single replay of a prompt is one draw, not the model's answer, so compare the spread across draws rather than one sample. The code above takes one draw per prompt for brevity; for prompts served at non-zero temperature, call route() several times and judge each draw.

## What Does a Passing Replay Prove?

A passing replay proves parity on the slice you sampled, for the task types you sampled, under the rubric you wrote. It doesn't prove the router holds after a provider updates a model, after your prompts change, or after traffic drifts toward a task type you under-sampled.

So the replay has to run continuously at a low rate, not once before launch. The cost side deserves separate scrutiny too. I built [Baar-Core](https://github.com/orvi2014/Baar-Core) after an agent loop left running overnight produced a $47 bill. It enforces a budget before each call and uses a cheap model to score prompt complexity from 0.0 to 1.0 before routing. Its semantic router is the kind of component this test is for: gpt-4o-mini scores each prompt, and when the budget runs low, hard tasks are downgraded to the cheaper model so the turn still completes. That means routing quality depends on how much budget is left, so a replay of Baar-Core's routing should include runs with a nearly exhausted budget, not just a fresh one. Baar-Core enforces the cost side. Checking whether its routed and downgraded answers still hold up is a separate problem it doesn't solve, and for me that part is still open. Its documented features are the pre-flight budget check, complexity routing and budget-aware downgrade; none of them grades answer quality.

The same question applies to any budget-triggered fallback, including the local-model fallback covered in [Fall Back to a Local LLM When the API Budget Runs Out](https://www.robatdasorvi.com/chapters/building/fall-back-to-a-local-llm-when-the-api-budget-runs-out): the fallback path needs its own replay.

For routing that picks a model by what a request needs, see the earlier essay on [routing LLM requests by model capability](https://www.robatdasorvi.com/chapters/building/route-llm-requests-by-model-capability-tools-vision). The [semantic routing write-up](https://www.robatdasorvi.com/chapters/ai-agents/how-semantic-routing-cut-my-llm-costs-by-70-without-touching-model-quality) covers what happened to cost when routing was tuned. Replay is how you keep checking that quality holds as traffic and models change.

If you have a minute before the next router change goes out, pull last week's logs, take a stratified sample by task type, and run the candidate against the served answers in both judge orders. Don't ship on the cost chart alone. That chart was built to count calls, so it will report success on every wrong answer that came back with a 200.