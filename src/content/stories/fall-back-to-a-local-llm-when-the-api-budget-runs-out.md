---
title: "Fall Back to a Local LLM When the API Budget Runs Out"
description: "To fall back to a local LLM when your API budget runs out, check spend before each call and route only tolerant tasks to a local server like Ollama."
pubDate: 2026-11-01
category: "building"
author: "Orvi"
readingTime: 8
tags: ["local LLM fallback", "API budget", "LLM cost control", "Ollama", "AI agents", "pre-flight budget check", "LLM routing"]
featured: false
---

To fall back to a local LLM when your API budget runs out, check the remaining budget before every call. If it's low, send only pre-approved task types to a local OpenAI-compatible server like Ollama, refuse everything else with an explicit error, and log every switch. A silent fallback is worse than a hard stop.

The Stanford AI Index 2025 reports that the price of reaching GPT-3.5-level performance on MMLU fell from about $20 to $0.07 per million tokens between November 2022 and October 2024, a 280-fold drop ([Stanford HAI](https://hai.stanford.edu/news/ai-index-2025-state-of-ai-in-10-charts)). And your budget still ran out. Cheaper tokens don't shrink the bill when your agent gets to spend more of them. That gap is where this problem lives.

## Is a Local Fallback Actually Worth Building?

Yes, if your workload splits into tasks a small model can finish. No, if every call really needs the frontier model. Most workloads don't split evenly, so measure yours before you build anything.

The routing research points the same direction. FrugalGPT (Chen, Zaharia and Zou, 2023) reports up to 98% cost reduction while matching the best single API on the tasks it tested, by cascading queries through cheaper models first ([arXiv:2305.05176](https://arxiv.org/abs/2305.05176)). RouteLLM (Ong et al., 2024) reports cost savings over GPT-4 of 3.66x on MT Bench at about 95% of GPT-4 quality, but only 1.41x on MMLU at about 92% ([arXiv:2406.18665](https://arxiv.org/abs/2406.18665)). Treat the 98% as an upper bound from their experiments, not a planning number. The gap between RouteLLM's two benchmarks is the point: savings depend on the workload, so plan from your own traffic.

My inference, not something those papers tested: a local model can act as the cheapest tier of that kind of cascade. On hardware you already run, it adds no per-token API charge, and it keeps working after your provider account stops accepting requests.

## Why Does the Fallback Have to Be Loud?

A fallback that doesn't announce itself turns a budget problem into a quality problem nobody owns. The caller gets an answer, the logs show success, and the difference shows up weeks later in your results.

I built Baar-Core after an agent loop left running overnight produced a $47 bill. Its [pre-flight check](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed) estimates cost locally and raises `BudgetExhausted` before any network call, so that outcome is one the caller has to handle ([Baar-Core](https://github.com/orvi2014/Baar-Core)). Its downgrade is different: when the budget is too tight for the capable model, hard tasks automatically fall back to the cheaper model so the turn still completes. That trade-off keeps work moving, and it is exactly why a fallback needs its own record.

What's still unsolved is the gap between Baar-Core's documented behaviour and the pattern in this article. On an exhausted budget, the documented path is `BudgetExhausted`, not a switch to a local model. Ollama is listed among the [LiteLLM-supported providers](https://docs.litellm.ai/docs/providers) that Baar-Core works with. The allowlist and path log below are a pattern layered around a budget check, not a documented Baar-Core feature.

A different guard in my X bot taught me why this matters. On 2026-07-21, X suspended the account. The lockout check fired and returned True, but the caller skipped one action, and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file that only a human can clear. On 2026-09-22 the account was suspended again, and this time the lockout check matched none of its known selectors, so it never fired at all. The first failure showed that a guard whose result the caller can ignore isn't a guard. The second showed that a guard can fail without firing at all.

A budget fallback has the same shape. If the check returns "local" and the caller treats that as ordinary success, the system keeps running and nothing alerts you. So record the path inside the wrapper, where no caller can skip it.

## How Do You Wire the Switch?

Put the budget check and the model choice in one function, and return which path ran. Ollama exposes an OpenAI-compatible endpoint under the `/v1/` path on local port 11434, and its docs say the API key is required but ignored, so a placeholder works ([Ollama docs](https://docs.ollama.com/api/openai-compatibility)).

```python
import os
from openai import OpenAI

cloud = OpenAI()  # provider key from environment
local = OpenAI(base_url=os.environ["OLLAMA_BASE_URL"], api_key="ollama")

LOCAL_OK = {"extract", "classify", "rewrite"}  # task types verified in your own evals

def complete(task: str, messages: list, budget) -> tuple[str, str]:
    est = budget.estimate(messages)            # local arithmetic, no network
    if budget.remaining >= est:
        r = cloud.chat.completions.create(model="gpt-4o", messages=messages)
        budget.record(r.usage)
        log_path(task, "cloud")
        return r.choices[0].message.content, "cloud"
    if task not in LOCAL_OK:
        log_path(task, "refused")
        raise BudgetExhausted(task)            # refuse; do not degrade silently
    try:
        r = local.chat.completions.create(model="llama3.1:8b", messages=messages)
    except Exception:
        log_path(task, "local_error")
        raise                                  # no cloud retry: it spends the budget
    log_path(task, "local")
    return r.choices[0].message.content, "local"
```

This is a sketch that has not been run. You'll define `budget` (with `estimate`, `remaining` and `record`), `BudgetExhausted` and `log_path` yourself, and set `OLLAMA_BASE_URL` to the local `/v1/` endpoint, and the model names are placeholders. What matters is that `complete()` writes the path to the log itself on every branch it decides. A cloud call that raises isn't logged here, so add a `cloud_error` entry in your own version.

Use this table to pick the behaviour for each path:

| Condition | Task in allowlist | Behaviour | Logged as |
|---|---|---|---|
| Budget covers estimate | any | Frontier model | `cloud` |
| Budget short | yes | Local model | `local` |
| Budget short | no | Raise, no call made | `refused` |
| Local call fails | yes | Raise, do not retry on cloud | `local_error` |

The last row is deliberate. Retrying on the cloud after a local failure spends the budget you were trying to protect. This is a proposed pattern. I have no measured results from running a local fallback in production.

## Which Tasks Can Safely Go Local?

Only send tasks you've measured against a local model. I'd start with extraction, classification and rewriting, where the output is short and checkable. Keep open-ended reasoning, multi-step planning and anything customer-facing on the refusal path until you have evidence.

Quantization research supports trying this, but it doesn't settle the question. Kurtic et al. (ACL 2025) ran over 500,000 individual evaluations across Llama-3.1 8B, 70B and 405B, and found that 4-bit weight-only quantization recovered about 99% of baseline accuracy on the main benchmarks ([arXiv:2411.02355](https://arxiv.org/abs/2411.02355)). The 8B model recovered the least: 96.88% on TruthfulQA on Leaderboard V1, 96.1% on average on the harder Leaderboard V2 tasks, and about 93% on Arena-Hard (24.0 against 25.8 at full precision). But that compares a quantized model against the same model at full precision. It doesn't show that a local model matches a frontier API. Run your own eval set before you trust the fallback.

## What Breaks When the Local Model Has to Call Tools?

Check tool calls first, because the local path doesn't support everything the cloud path does. Ollama's compatibility page supports `tools` and `response_format` but lists `tool_choice`, `logit_bias`, `user`, `n` and logprobs as unsupported on chat completions ([Ollama docs](https://docs.ollama.com/api/openai-compatibility)). If your code forces a specific tool with `tool_choice`, the local path won't behave the way the cloud path did.

Malformed output costs more than tokens. In my X bot's long-form article lane, JSON parse errors killed 8 of 20 generations, and each failure silently burned a full 48-hour slot. A local model that emits slightly broken JSON does the same thing: the request "succeeds," the parser fails, and the time is gone. Count parse failures as a cost line in your fallback, not as a retry.

Agent loops make it worse. A loop that retries on the local model still burns wall-clock time. With no iteration cap, a fallback can keep a runaway loop alive longer than the budget ever would have.

## What Happens After the Fallback Runs Quietly for a Month?

My expectation, not a measurement: if nobody records which model answered, the local path stops being an exception and becomes invisible. If quality later drops, you can't tell a prompt change from a model change. I've seen that kind of invisibility in a different form: four hardcoded accounts that no longer existed absorbed 88% of my bot's daily comment attempts for about six weeks, and every run logged success.

Library fallbacks can carry the same risk. The LiteLLM docs describe fallback lists tried in order after retries fail ([LiteLLM docs](https://docs.litellm.ai/docs/proxy/reliability)). A fallback list is a routing policy, and every policy needs a log entry showing which branch served each request. Without that log, you can't tell whether the fallback is saving money or hiding a regression.

## Isn't a Smaller Model Just Worse Output?

Yes, on hard reasoning and on anything that needs fresh knowledge. That's the honest objection. The answer isn't to accept worse output everywhere. Route only the work where worse output is acceptable, and refuse the rest.

The routing papers support the split, not the fallback itself. FrugalGPT cascades queries through cheaper models and RouteLLM routes between a stronger and a weaker model, but both keep the strong model available for hard queries. Once your budget is gone you have no such escalation, which is why the refusal path has to do that job. "A local fallback is garbage" is true of an unrouted fallback that sends everything local. It's much weaker against an allowlisted fallback that refuses the hard cases. The fallback's job is to keep easy work moving while the budget is gone, not to match the frontier model.

## What Should You Do Before Tonight?

Add one line to your call wrapper that records which model answered, and run it for a week before changing anything else. Then pick the three task types you'd accept from a local model, test them on your own examples, and make everything else raise. Don't turn the fallback on until the refusal path has fired once in a test. The refusal is the part that protects you. Keep a [hard spend limit](https://www.robatdasorvi.com/chapters/building/why-i-built-hard-spending-caps-for-llm-apis) in place as well, so the budget check is not your only control.