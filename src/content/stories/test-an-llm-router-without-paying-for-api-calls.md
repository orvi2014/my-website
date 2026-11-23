---
title: "Test an LLM Router Without Paying for API Calls"
description: "Test an LLM router without paying for API calls: stub the provider, replay recorded responses, gate budgets locally. Only sampled quality evals spend money."
pubDate: 2026-11-21
category: "building"
author: "Orvi"
readingTime: 8
tags: ["LLM router", "LLM testing", "mock LLM API", "VCR cassettes", "LLM cost control", "agent engineering", "pytest", "budget guardrails"]
featured: false
---

You can test an LLM router without paying for API calls by keeping its requests away from the provider during the test run. Replay recorded responses, stub the client with a canned reply, and check the budget gate locally. Then only a small, deliberately chosen set of cases ever reaches a paid endpoint.

For about six weeks, four hardcoded target accounts in my X bot no longer existed, and they absorbed 88% of its daily comment attempts. Every run logged success. Nothing raised an error.

Routers fail the same way. A router is a small program that decides which model answers which request. Most of its bugs live in that decision and in whatever happens around it: the wrong model picked for a simple prompt, a budget that doesn't block, a fallback that never fires, a malformed response that crashes the parser. None of those needs a live model to reproduce. A suite that calls the provider on every run makes checking the plumbing cost the same as asking the model a question.

## Doesn't Mocking the Provider Just Test the Mock?

No. A stub replaces only the model's answer. The router's own logic runs unchanged around it. The thing you're replacing is the one part whose output you don't control and don't need to re-measure on every commit.

LiteLLM's documentation describes a `mock_response` parameter on `completion()` that returns a set reply instead of calling the provider, aimed at testing ([LiteLLM docs: mock requests](https://docs.litellm.ai/docs/completion/mock_requests)). That's the transport seam. Whatever library you use, the principle holds: put the seam where the network starts, not in the middle of your routing code.

Save this as `tests/test_router_offline.py`:

```python
import litellm
import pytest
from baar import BAARRouter, BudgetExhausted

def test_transport_stub_returns_canned_reply():
    # mock_response answers without calling the provider
    response = litellm.completion(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "What time is it?"}],
        mock_response="ok",
    )
    assert response.choices[0].message.content == "ok"

def test_exhausted_budget_blocks_before_transport():
    router = BAARRouter(budget=0.00001)
    with pytest.raises(BudgetExhausted) as exc:
        router.chat("Any prompt at all")
    assert exc.value.remaining <= 0.00001
```

The first test only shows LiteLLM's seam: if you wrote your own router on LiteLLM, this is where you'd inject canned replies. Baar-Core's README doesn't document passing mock_response through BAARRouter, so for Baar the replay has to happen at the HTTP layer with a cassette (below). The second test runs Baar's real budget gate and shows it refuses before any call goes out. Neither spends anything.

Baar-Core's README shows the second pattern directly. With `budget=0.00001`, the first call raises `BudgetExhausted`, and no network calls are made ([Baar-Core README](https://github.com/orvi2014/Baar-Core)). A budget gate is supposed to stop requests before they leave your machine, so test it by checking that nothing left the machine: run the offline suite with pytest-socket's `--disable-socket` flag ([pytest-socket](https://github.com/miketheman/pytest-socket)), which makes socket creation raise an error, so any real connection attempt fails the test instead of quietly reaching the provider. Set LITELLM_LOCAL_MODEL_COST_MAP=True in that run so LiteLLM uses its bundled price map instead of fetching one at import.

## What Baar-Core's Own Router Makes Harder to Test

I started Baar-Core after an agent loop I left running overnight produced a $47 bill.

I built Baar-Core's router around a call that a plain stub doesn't cover. A cheap model (gpt-4o-mini, ~$0.000015/call per the README) scores each task's complexity from 0.0 to 1.0 before the router chooses a model. So the routing decision is itself a network call, and an offline test has to stub or replay the scorer as well as the final completion.

That is the trade-off. The README describes the scorer as semantic rather than keyword matching, and the price of that is a paid call on every routing decision. In a test, that call has to be stubbed or replayed like any other.

The branch most worth testing offline is the downgrade. Per the README, when a task scores as complex but the remaining budget is too close, the router falls back to the cheaper model so the turn still completes. That branch only fires near exhaustion, so it is the one least likely to be exercised by normal use and the cheapest to pin down with a replayed score and a small budget. With Baar, that means recording a cassette for a prompt the scorer rates as complex, then replaying it with a budget just above the cheap model's cost. The README doesn't document a way to inject a score directly or to read back which model answered, so the assertion has to come from the recorded request in the cassette (which model the completion request named), not from a router attribute.

What's unsolved: for Baar, a $0 routing test proves the routing given a recorded score. It does not prove the score is right.

## Can a Router Be Tested Without Measuring Its Quality?

Not the quality of its choices, and you shouldn't pretend otherwise. That question needs real model outputs. You need them occasionally, on a fixed sample, not on every commit.

The strongest evidence that routing quality is measurable comes from RouteLLM, which trained routers on human preference data to choose between a stronger and a weaker model. The paper reports that its routers can cut costs by over 2x in certain cases without sacrificing response quality on public benchmarks ([Ong et al., RouteLLM, arXiv 2024](https://arxiv.org/abs/2406.18665)). That result needed labelled preference data and real completions. It didn't come from a unit test.

So split the work into four layers and price each one honestly:

| Test layer | Calls provider? | Cost per run | What it proves |
|---|---|---|---|
| Routing choice given a recorded scorer response | No, replayed | $0 | Which model the completion request names, for that score |
| Budget gate at zero remaining | No | $0 | Refusal happens before transport |
| Transport replay (recorded cassette) | No, replayed | $0 | Parsing and error paths survive real payloads |
| Quality eval on a sampled prompt set | Yes | Paid, scheduled | The router's choices are good |

If your router uses an LLM to classify prompts, as Baar-Core's does, that classifier call is a provider call too and needs its own stub or cassette.

The first three rows run on every commit. The last runs on a schedule, with its own budget line and a written record of what it cost. Running a quality eval on every push doesn't make it a better test. It just repeats the same bill until someone turns it off.

## Won't Recorded Responses Go Stale and Hide Provider Changes?

Yes. This is the failure that matters most, because it's quiet. A cassette is a frozen answer from a provider that keeps changing. Once a suite is free to run, its cassettes become a maintained artifact. Nobody maintains an artifact that never breaks.

VCR.py records real HTTP traffic into a cassette and replays it on later runs. Its record modes set the risk. `once` records only when no cassette exists. `none` makes no new HTTP requests at all. `all` never replays recorded interactions ([VCRpy documentation](https://vcrpy.readthedocs.io/)). Use `none` in CI, so a missing interaction fails loudly instead of quietly calling the provider.

```python
import vcr
from baar import BAARRouter

replay = vcr.VCR(
    cassette_library_dir="tests/cassettes",
    record_mode="none",                       # CI never reaches the network
    filter_headers=["authorization", "x-api-key"],
)

def test_reply_parses_from_recorded_response():
    router = BAARRouter(budget=0.10)
    with replay.use_cassette("small_model_reply.yaml"):
        reply = router.chat("Translate 'good morning' to Japanese")
    assert reply.strip() != ""
```

With Baar-Core the cassette has to hold two interactions, the complexity-scoring call and the completion. If the scorer's request is missing, `record_mode="none"` fails the test, which is what you want.

Re-record on a schedule, not only when a test breaks. A cassette recorded in January says nothing about how the same model answers in November. A green replay is evidence about the cassette, not about the provider.

The objection is that free tests make it easy to stop asking whether they still measure anything. The bot's dead accounts are the same trap in another form: every run logged success while most attempts went to accounts that no longer existed. Every stubbed or replayed test should carry a note about what it can't see, and the scheduled eval should be the one thing allowed to say the router got worse.

## Isn't Testing With Fake Prices Just Hiding the Bill?

It is, if the price table in your tests never gets refreshed. Price tables go stale faster than most code, which is why the budget logic needs its own check.

The Stanford AI Index found that the cost of querying a model scoring at GPT-3.5 level on MMLU fell more than 280-fold between November 2022 and October 2024. In that report's example, the price dropped from $20.00 to $0.07 per million tokens, with Gemini-1.5-Flash-8B as the model ([Stanford HAI AI Index 2025](https://hai.stanford.edu/ai-index/2025-ai-index-report)). That drop came mostly from cheaper models reaching the same level, not from one model's list price falling. But it means a price table tied to last year's model lineup can be badly wrong about what a call costs now. An inflated price makes a budget gate block calls it should allow. A stale low price lets through calls it should block.

The defence is cheap. Keep the price table in one file, give it a `last_verified` date, and fail a test when that date is older than your review interval. The budget test checks the arithmetic. A separate, dated check covers the inputs. The free suite can tell you the logic is right. It can't tell you the prices are current, and it shouldn't pretend to.

## What Changes If This Is Right?

If a router's plumbing can be tested for nothing, the CI bill for an LLM system stops growing with the number of commits. The paid line item becomes a scheduled quality eval with a fixed sample and a budget, reviewed like any other recurring cost.

It also changes what a passing build means. A green run should say the routing decisions, budget refusals and parser paths still behave the way they were recorded. It shouldn't say the router is good. Keeping those two claims apart is what lets a suite catch the quiet failures: the cassette that has gone stale, the price table that has drifted, the quality eval that quietly stopped running. The approach in [Replay Production Prompts to Test an LLM Model Router](https://www.robatdasorvi.com/chapters/building/replay-production-prompts-to-test-an-llm-model-router) extends the same split to real traffic. [Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed) covers the gate that the zero-spend tests depend on. For integration tests that need real, if weaker, completions, a local model is a fourth option with no API cost. LiteLLM supports Ollama, so a local model can be called through the same interface ([Fall Back to a Local LLM When the API Budget Runs Out](https://www.robatdasorvi.com/chapters/building/fall-back-to-a-local-llm-when-the-api-budget-runs-out)).

A router suite that costs nothing to run is only useful if someone keeps asking what it can't see.