---
title: "AI Agent Tests Pass Locally but Fail in CI"
description: "AI agent tests pass locally but fail in CI because the two environments differ in deployed code, model sampling, or skipped checks. Here is how to tell which."
pubDate: 2026-11-12
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["AI agents", "CI/CD", "flaky tests", "LLM evaluation", "deployment drift", "agent testing", "continuous integration"]
featured: false
---

An AI agent's tests pass on your laptop and fail in CI because the two places aren't running the same thing. The gap usually falls into one of three buckets: different deployed code, model output that changes from run to run, or checks that got skipped and then counted as passes. Any of them can make a green local run mean a lot less than it looks.

On the morning of August 1, 2012, Knight Capital Group's trading system was supposed to be running one version of its order router on all eight servers. Seven had the new code. The eighth didn't, because nobody had copied the update to it. The new code reused a configuration flag that, on the old machine, still triggered a retired routine called Power Peg. The SEC found that Knight had no written procedure requiring a second technician to review the deployment. Before the open, the system sent staff 97 automated error emails about Power Peg, and nobody acted on them ([SEC order, 2013](https://www.sec.gov/litigation/admin/2013/34-70694.pdf)).

## A documented drift failure: Knight Capital, 2012

One server ran old code that read a repurposed flag differently, and no check compared the fleet before trading started. The SEC found Knight lost more than $460 million in about 45 minutes ([SEC order, 2013](https://www.sec.gov/litigation/admin/2013/34-70694.pdf)).

The easy story is that the new code was buggy. That wasn't the whole problem. The old routine had sat dormant for years, and the flag change made it reachable on one machine only. The test that would have caught it wasn't a unit test of the new logic. It was a check that every server was running the same build. Knight's mismatch was between production servers, not between a laptop and a CI runner, but the mechanism is the same: two environments everyone assumed matched, and no check that compared them.

## Why does an AI agent test pass on a laptop and fail in CI?

The laptop and the CI runner differ in what they have, not in what the test says. The usual gaps look like this:

| Difference | How it hides | Check that exposes it |
|---|---|---|
| Deployed code or prompt version | Local checkout is newer than the CI image | Log the commit SHA and a hash of the prompt files in both runs and compare them |
| Model alias | `latest` resolves to a different snapshot in CI | Pin the exact model version string in both places |
| Sampling settings | Local run got a lucky sample | Run N times and report the pass rate, not one result |
| Secrets and env vars | Local shell exports a key CI lacks | Fail fast when a required variable is unset |
| Rate limits and timeouts | Local calls are sequential; CI runs in parallel | Log retries and 429s as first-class results |
| Skipped tests | Skip reads as neutral or green | Treat any skip in an agent gate as a failure |

## How do I tell which cause it is?

1. Rerun the failing test on the same commit in CI 5–10 times. If it sometimes passes, the cause is model variance, not the environment.
2. Run the CI image locally with `docker run` on the same image tag. If it fails there too, the cause is the image or its dependencies, not your code.
3. Print and compare the resolved model ID, the commit SHA, a hash of the prompt files, and the names of the required env vars (never their values) in both runs.
4. Count the skipped tests in the CI report. A required check that shows as skipped has not passed.

I haven't hit these in a CI pipeline, but I've hit the failure underneath the last row: a check that reports green when nothing useful happened. An approval-gated X growth agent I built ran for about six weeks with four hardcoded target accounts that no longer existed. They soaked up 88% of the bot's daily comment attempts, and every run logged success. Nothing raised an error. The logs were green for the wrong reason. That is the same shape as a CI run where a skip or a missing fixture passes for a result.

Another case: the Telegram Skip button in the same bot did nothing for months, so every skipped item got counted as a timeout. The approval stats were wrong for that whole stretch. The problem wasn't the model. The label on the outcome was wrong, and the approval statistics were built on it.

## How do I make agent tests reproducible in CI?

Start by recording real model responses once and replaying them in CI as fixtures, using the VCR, or cassette, pattern. Unit-level agent tests then make no live model calls, so they behave the same on every machine. Keep a separate live-model eval job, clearly labeled, that reports a pass rate against a threshold. It is the only job allowed to call the model, so drift shows up there without making the fast suite flaky.

## Does temperature 0 make AI agent tests repeatable?

No. Setting temperature to 0 reduces variation without eliminating it, so one green run is weak evidence. This is the strongest counterargument to "it's just environment drift," and it deserves a direct test.

The argument goes like this: set temperature to 0, pin the model version, and the agent becomes deterministic, so any CI failure must be an environment bug. The evidence doesn't support that. Atil and colleagues (2024) set five LLMs to their most deterministic settings and ran eight common reasoning tasks ten times each. In [their arXiv paper, "Non-Determinism of 'Deterministic' LLM Settings"](https://arxiv.org/abs/2408.04667), the output still varied across runs at temperature 0.

So the counterargument is half right. Pinning settings is necessary because it removes one source of drift. It isn't sufficient, because the leftover variance means a test that passes once has sampled the distribution exactly once. The fix is to measure the pass rate across repeated runs and set a threshold. That's a different test design from the one most teams start with.

Same model and same prompt don't guarantee the same output across environments. Anthropic's [September 2025 postmortem](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues) described three infrastructure bugs, including a context-window routing error and a compiler miscompilation in an approximate top-k operation. Together they made the same Claude model produce degraded output on some hardware and serving paths but not others. A test that passes on one serving path is evidence about that path, not about the model everywhere.

## How flaky are automated tests in CI?

Flakiness is common enough that a single failure in CI is weak evidence in either direction. In 2016, the [Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) reported that almost 16% of its tests had some level of flakiness, and about 1.5% of all test runs were flaky.

Those numbers describe conventional tests with no model in the loop. An agent test adds a model call, a network hop, a rate limit, and a prompt that may have changed since the last run. I'd expect the base rate for an agent suite to be higher than Google's, not lower, though I haven't seen it measured. The lesson isn't to rerun until you get green. Automatic reruns make the suite look stable while hiding the drift that caused the failure in the first place.

## Why does a skipped check look like a pass in CI?

A skipped check is neither a pass nor a failure, but CI systems often treat it as one. GitHub's documentation says a skipped job reports its status as Success and does not block a merge, even if it is a required check ([GitHub Docs](https://docs.github.com/en/actions/using-jobs/using-conditions-to-control-job-execution)). Don't count on the runner to handle this. Refuse to merge when a required check is skipped.

A minimal gate, saved as `ci/gate.py` and run before any agent eval job:

```python
import hashlib, sys

def build_hash(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def gate(worker_hashes: dict[str, str], results: list[dict]) -> None:
    """worker_hashes maps each worker name to build_hash() of its bundle."""
    if len(set(worker_hashes.values())) > 1:
        sys.exit(f"build drift across workers: {worker_hashes}")
    skipped = [r["name"] for r in results if r["status"] == "skipped"]
    if skipped:
        sys.exit(f"{len(skipped)} required checks skipped, not passed: {skipped}")
    # results without a pass_rate are single-run checks; only live-eval jobs should report one
    for r in results:
        if r["status"] == "pass" and r.get("pass_rate", 1.0) < 0.9:
            sys.exit(f"{r['name']} passed only {r['pass_rate']:.0%} of runs")
```

The gate is a sketch, not a product. It does three things the usual setup doesn't. It compares what's deployed, it treats skips as failures, and it checks the pass rate instead of trusting a single run.

## What would have changed the outcome?

A check that compared the eight servers' builds before the open would very likely have caught the stale machine. Knight's failure wasn't that nobody tested the new logic. It was that nothing confirmed every machine was running it. Agent teams fail the same way when a local checkout, a CI image, and a production worker quietly disagree about the code, the prompt, or the model.

Before any AI agent eval counts as evidence, the gate has to answer one question: are all the machines running the same build? If they aren't, a green run anywhere is a record of a different system. The Knight case is old, but the drift half of the problem hasn't changed. The test was green on the machine someone checked, and the failure lived on a machine nobody compared.

For more on how agent pipelines fail without raising an error, see [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars). For the same pattern in tool calls against changing external services, see [When an Upstream API Changes, Your Agent's Tools Break Silently](https://www.robatdasorvi.com/chapters/ai-automation/when-an-upstream-api-changes-your-agent-s-tools-break-silently). For why a human review step matters more than a passing run, see [AI-Assisted Coding vs Vibe Coding: The Difference Is Review](https://www.robatdasorvi.com/chapters/ai-automation/ai-assisted-coding-vs-vibe-coding).