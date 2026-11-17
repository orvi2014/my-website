---
title: "Synthetic vs Real Test Cases for LLM Agent Evals"
description: "Synthetic vs real test cases for LLM agent evals: synthetic cases rank agents reliably but inflate scores, while real production traces catch what they miss."
pubDate: 2026-11-16
category: "ai-automation"
author: "Orvi"
readingTime: 6
tags: ["synthetic test cases", "LLM agent evals", "agent evaluation", "LLM benchmarks", "production traces", "AI agent testing", "eval design"]
featured: false
---

Synthetic test cases are good enough to rank LLM agents against each other. They are not good enough to certify them. Real production traces catch failures that generated cases almost never contain, so the final release gate should run on real cases.

On 2026-09-22, X suspended my approval-gated X growth agent's account a second time, one week after the reply cap went from 16 to 150. The lockout check was supposed to stop the bot when that happened. It matched none of its known selectors and never fired, so I stopped the bot by hand. The check only knew the selectors I had written for it, and the real suspension page matched none of them. In July it had caught the first suspension. In September none of those selectors matched, and it caught nothing. That selector list was a hand-written fixture. It covered the cases I had imagined, and the first real input outside them went straight through. A synthetic eval suite fails the same way.

The research points the same way. In a 2025 study, Gill, Ravichander and Marasović generated LLM versions of the CondaQA and DROP benchmarks. They found the synthetic versions valid, but less challenging for LLMs than the human-written originals ([arXiv 2505.22830](https://arxiv.org/abs/2505.22830)).

## Do Synthetic Test Cases Rank LLM Agents Correctly?

Mostly, for relative ranking. Not for absolute scores. Rahmani et al. (2025) studied synthetic test collections for information retrieval and found that LLM-based retrieval systems scored higher when judged with LLM-generated queries and judgments. The bias mattered more for absolute performance numbers than for comparisons between systems ([arXiv 2506.10301](https://arxiv.org/pdf/2506.10301)). Rahmani's setup used LLM judgments as well as LLM queries; if your grader is also a model, check it first ([LLM-as-a-Judge Reliability: Check Your Grader Against Human Labels](https://www.robatdasorvi.com/chapters/ai-automation/llm-as-a-judge-reliability-how-to-check-your-grader-against-human-labels)). That is retrieval evaluation, not agent evaluation. I'm assuming the same split carries over to agents, and I haven't seen it measured there.

That split is the useful part. If you want to know whether agent v2 beats v1 on the same suite, a synthetic suite is a cheap instrument. If you want to say "this agent completes 95% of real tasks," the same suite is measuring something else. The bias moves the level, and teams make release decisions using the level.

## Why Do Synthetic Suites Score Higher Than Production?

Synthetic suites tend to be easier. The clearest evidence is Gill et al.: because the generated cases are less challenging, a model scored on them looks better than it would on the human-written originals.

The generating model can also favor outputs like its own. [Efficacy of Synthetic Data as a Benchmark](https://arxiv.org/pdf/2409.11968) (2024) reported a "bias factor" in which smaller LLMs favored their own generated data. Larger models didn't show the same pattern, so this matters mainly when a small model generates the suite.

My inference, not a measured result: generators sample from the designer's description of the task, so failures outside that description, such as the Replit code freeze below, are under-represented.

## So Why Do Teams Keep Trusting Synthetic Pass Rates?

Because the number is stable, and it goes up. A synthetic suite gives a clean figure on every run, and a flat figure stops prompting questions. Nobody goes back to check whether the fixture still resembles reality.

My bot showed the same mechanism at small scale. For about six weeks, four hardcoded account handles that no longer existed absorbed 88% of daily comment attempts. Every run logged success. Nothing raised an error, because the code path worked fine. The list was a hand-built fixture that had rotted, and the logs measured activity rather than outcomes. A synthetic eval suite is a bigger version of that list: a set of expected inputs, maintained by the people who wrote the expectations.

My inference, which I have not measured, is that the second-order effect is worse: a team optimizing against a rising synthetic score tends to write new cases in the style of the old ones, and the suite converges on the distribution the agent already handles.

## What Happens When an Agent Meets an Input No Fixture Covers?

It takes an action nobody listed as a case. In July 2025, SaaStr founder Jason Lemkin reported that Replit's AI agent ran destructive commands against a live production database during a code freeze. Lemkin had instructed it not to make changes without explicit permission. He said the loss covered 1,206 executives and 1,196 companies ([AI Incident Database, incident 1152](https://incidentdatabase.ai/cite/1152/); [Tom's Hardware](https://tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data)). Replit CEO Amjad Masad called it "Unacceptable and should never be possible," and said Replit was rolling out automatic separation between development and production databases.

The rule against changes lived in the instructions, not in a test. Rules that live only in prompts fail quietly. I wrote about that pattern in [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars). A suite built from expected tasks would check whether the agent could write a query. It would rarely check whether the agent obeys a code freeze the user had stated earlier in the conversation. The failure happened outside the eval's assumed action space, which is where synthetic generators are weakest, because they generate from the designer's model of the task.

Caveat: the most dramatic details, including the agent's admissions, come from screenshots and chat logs Lemkin shared. They did not come from an independent investigation.

In April 2025, Cursor's AI support agent told users about a non-existent "one device per subscription" policy, and several users cancelled their subscriptions over it. The company apologized ([Fortune, "A customer support AI went rogue—and it's a warning for every company considering replacing workers with automation"](https://fortune.com/article/customer-support-ai-cursor-went-rogue/)). A suite generated from a support spec would be unlikely to include "a user asks why they were logged out on a second device," because the spec has no such policy for the generator to draw from.

Multi-agent systems add more ways to fail. The MAST study (Cemri et al., 2025) built a taxonomy of 14 failure modes for multi-agent LLM systems and reported a Cohen's kappa of 0.88 for annotator agreement ([arXiv 2503.13657](https://arxiv.org/abs/2503.13657)). MAST's taxonomy was built by annotating real multi-agent execution traces. That is the point: the 14 modes came from watching systems run, not from a spec. A suite written from expected failures has no built-in way to tell you which of them it never exercises.

## Is Synthetic Coverage Good Enough When Real Traces Are Expensive?

This is the strongest counterargument, and the evidence answers it only in part. Real traces need labeling and redaction, and they arrive slowly. Synthetic cases are cheap, and the bias findings say they still order systems usefully. So the defensible position is to use each for what it does well: synthetic cases for fast regression ranking, real traces for the absolute gate.

Real cases are cheaper to get than they look. Sample a fixed number of production traces per week, redact them, and label pass/fail by hand. Then seed the synthetic generator from those traces rather than from the spec, so the generated cases stay close to what users actually send. For one way to replay real inputs without waiting, see [Replay Production Prompts to Test an LLM Model Router](https://www.robatdasorvi.com/chapters/building/replay-production-prompts-to-test-an-llm-model-router). A synthetic-only team gets a reliable ordering and an unreliable level, and release decisions depend on the level.

| Question | Synthetic cases | Real production traces |
|---|---|---|
| Is v2 better than v1 on the same suite? | Usually good; in IR test collections, bias was smaller for relative comparisons | Good, slower to collect |
| Does the agent meet a quality bar? | Weak; scores run high | Required |
| Does it obey rules not in the test set? | Only if someone wrote the case | Observed only after the fact |
| Cost to produce | Low | Labeling and redaction |

A gate that enforces this split is small:

```python
"""eval_gate.py: sketch that reports synthetic and real pass rates separately."""
from dataclasses import dataclass

@dataclass
class Case:
    id: str
    source: str   # "synthetic" or "real"
    passed: bool

def gate(cases: list[Case], min_real_pass: float = 0.95, max_gap: float = 0.10) -> bool:
    syn = [c for c in cases if c.source == "synthetic"]
    real = [c for c in cases if c.source == "real"]
    if not real:
        raise ValueError("no real cases: refusing to certify on synthetic alone")
    if not syn:
        raise ValueError("no synthetic cases")
    syn_rate = sum(c.passed for c in syn) / len(syn)
    real_rate = sum(c.passed for c in real) / len(real)
    print(f"synthetic={syn_rate:.2%} real={real_rate:.2%} n_real={len(real)}")
    return real_rate >= min_real_pass and (syn_rate - real_rate) <= max_gap
```

The 0.95 floor and 0.10 gap are placeholders; set them from your own tolerance for production failures.

The gap check matters as much as the floor. A large gap between synthetic and real rates is the signal that the suite has drifted from production. It should block a release even when both numbers look good. The same drift shows up between environments; see [AI Agent Tests Pass Locally but Fail in CI](https://www.robatdasorvi.com/chapters/ai-automation/ai-agent-tests-pass-locally-but-fail-in-ci).

## What Will the Gap Look Like Next Year?

Here is a prediction the data can falsify. By 2027-06-30, published agent evaluations that report both synthetic and production-trace pass rates will show a gap of at least 10 percentage points on tasks that perform writes or external actions. This is an extrapolation from the QA and retrieval studies above, none of which measured agents, and not a measurement I have made. If a public set of such evaluations published by that date shows a gap under 5 points, the argument here is wrong. The likely reason would be that teams started drawing their synthetic cases from real traces. That closes the gap by changing the test set rather than the agent.

The teams that get hurt first are the ones whose synthetic pass rate keeps rising while their production complaints don't stop.