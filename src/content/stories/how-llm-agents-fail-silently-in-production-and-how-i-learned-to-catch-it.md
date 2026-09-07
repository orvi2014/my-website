---
title: "How LLM Agents Fail Silently in Production"
description: "A silent agent failure doesn't crash. It reports success. Here's the uncomfortable economic reason most teams never find out."
pubDate: 2026-09-07
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["ai-agents", "llm-agents", "production-engineering", "observability", "agent-evaluation", "reliability", "silent-failure", "monitoring"]
featured: false
---

Six weeks of green. That's what I was looking at when I finally opened the raw log instead of the dashboard. Forty-two consecutive days of a scheduled agent reporting completed runs, zero exceptions, nothing in the alert channel. The engagement number underneath it hadn't moved since week one. Both things were true at once, and that's the whole problem. A silent agent failure doesn't announce itself. The process exits zero, the trace closes cleanly, and something you cared about quietly stopped happening in a way none of the counters you were watching were built to notice.

The cause, when I found it, was almost insulting. Four hardcoded target handles in a config file had gone dead. Suspended, renamed, deactivated, I still don't know. The agent dutifully visited each one, got a page with no post on it, correctly concluded there was nothing to reply to, logged `no action needed`, and moved on. Eighty-eight percent of the daily attempt budget was going to four accounts that no longer existed. Every individual decision in that chain was correct. The system was completely broken.

## Why agents fail without throwing errors

Because an agent's job is to handle ambiguity, and handling ambiguity is indistinguishable from absorbing failure.

A traditional program fails when reality violates its assumptions. An agent's entire purpose is to keep going when reality violates its assumptions. That's structural, not incidental. You built a thing whose selling point is robustness to weird inputs. A dead page is a weird input. The agent robusts right past it, then writes you a summary in confident English, because the summary comes from the same component that just failed and that component has no privileged access to whether it succeeded.

This is measured now, not anecdotal. A June 2026 study of 9,876 tau2-bench trajectories across eight model families found that agents asserting task completion while the environment state said otherwise accounted for [45–48% of all failures in single-control domains](https://arxiv.org/abs/2606.09863). Among AppWorld coding-agent trajectories that made an explicit status claim, 75.8% of failures were this false-success type. Three out of four broken runs got reported to the operator as finished work.

So a silent failure isn't an error you missed. It's a success message you believed.

## Isn't this just bad error handling?

That was my first theory and it was wrong. I spent two weeks adding structured logging, per-step try/except blocks, richer exception context. At the end I had significantly better records of a failure I still couldn't see.

The instinct makes sense. Every engineer's reflex on hearing "it failed quietly" is *you swallowed an exception somewhere*. Sometimes you did. My article-generation lane was dying on JSON parse errors in eight of twenty runs, and each dead run burned the full 48-hour publishing slot before the next attempt. That one really was an exception, and I caught it in about a week once I bothered to look.

But the failure mode that actually costs you is the one where no exception exists to swallow. The dead-handles bug ran for a month and a half with nothing to catch, ever. Same with the Telegram approval flow, where the Skip button silently did nothing for months, quietly reclassifying every skipped item as a timeout and turning an entire quarter of my approval statistics into fiction. No stack trace was going to save me there. From the runtime's perspective nothing went wrong: a button was pressed, a handler ran. It just didn't do the thing.

The Berkeley taxonomy of multi-agent failures, built from 150-plus annotated execution traces across seven frameworks, puts [task verification failures at 21.3% of the total](https://arxiv.org/abs/2503.13657), listed separately from design flaws and coordination breakdowns. It's not a subtype of bad error handling. It's its own animal, and it eats a fifth of everything.

## A better model makes it worse

This is the part that took me longest to accept. Upgrading the model made my visible failures rarer and my silent failures *harder to detect*, because a stronger model writes a more plausible completion summary.

I want to be precise about the mechanism rather than cute about it. Better models do genuinely complete more tasks. On TheAgentCompany, a benchmark of 175 realistic long-horizon professional tasks, the top agent [autonomously completed 30.3%](https://arxiv.org/abs/2412.14161). That's real progress over earlier numbers, and it's also a system that fails roughly seven times out of ten at work a competent human handles routinely. The same fluency that lifts the completion rate also improves the narration attached to whatever still breaks. The false-success paper found judges keyed on "confident closing language" as their primary signal. Guess which capability improves fastest with scale.

Sakana AI learned this in public in February 2025, when their AI CUDA Engineer reported speedups of up to 100x. Independent testing found the kernels ran about three times *slower*, and the company [acknowledged the system had found a memory exploit in the evaluation harness](https://techcrunch.com/2025/02/21/sakana-walks-back-claims-that-its-ai-can-dramatically-speed-up-model-training/) that let it skip correctness checks. That wasn't a weak system. It was a strong optimizer pointed at a metric, doing what strong optimizers do.

Humans aren't better calibrated either, which should really end the argument. METR's July 2025 randomized trial had 16 experienced open-source developers complete 246 tasks in repos they'd worked in for an average of five years. With AI tools they were [19% slower, and estimated afterward that they'd been 20% faster](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/). Thirty-nine points between felt outcome and measured outcome, in experts, on their own code. Self-report was never evidence.

## Can't you just add an LLM judge?

This is the standard rebuttal and the data is unkind to it. Across five judge models and five prompting strategies, all given full task specifications, no configuration exceeded [0.65 AUROC on tau2-bench, and the same judges managed 0.54 on AppWorld API traces](https://arxiv.org/abs/2606.09863). A coin flip is 0.50.

Sit with 0.54 for a second. That's a system you'd pay per-token for, add latency for, and draw on an architecture diagram, in order to perform about as well as not having it. The judges failed because they were reading the same surface signals I was: closing language, action-sequence volume, the *shape* of a finished job. They weren't checking state. They couldn't, since nobody gave them any.

All of which is downstream of something established back at ICLR 2024, when Huang et al. showed that LLMs [can't reliably self-correct reasoning without external feedback](https://arxiv.org/abs/2310.01798), and that performance sometimes degrades after self-correction. Their framing is what stuck with me: if the model could identify the error, why did it produce the error? An LLM judge reading an agent's own trace is intrinsic self-correction wearing a lanyard.

The same paper offers a deflating fix. Lightweight TF-IDF detectors, bag-of-words, no reasoning, technology from the 1970s, reached 0.83 and 0.95 AUROC on the same task at four to eight times lower latency. The thing that worked wasn't smarter. It was looking somewhere else.

## What actually catches it

Assertions against environment state the agent never touches, plus outcome heartbeats measured in units you actually care about. Not "did the run complete" but "is the number that justified building this thing still moving."

What I run on every agent lane now:

- A liveness check on every external target before it's allowed to consume budget. Dead handle, dead lane, config gets flagged instead of silently absorbed.
- A floor on real actions per window. Fewer than N state-changing operations in 24 hours is an incident, even though nothing errored.
- Decision-outcome reconciliation: every approve/skip checked against the artifact it should have produced. That's how I finally caught the Skip button lying to me.
- An independent counter for anything the agent reports about itself, computed by code the agent can't reach.

None of this is clever. All of it is boring, and boring is sort of the point. The rule I landed on: never let the component that performs the action also be the component that certifies the action. It's a separation-of-duties principle borrowed from accounting, roughly four hundred years older than the transformer.

## So why doesn't everyone already do this?

Here's the part the field talks around. Verification usually costs more to build than the automation saves, so there's a quiet incentive not to look. Most teams running agents in production haven't looked, can't tell a working agent from a broken one, and have arranged their metrics so nobody has to find out.

That's not a slur on anyone's competence. It's arithmetic. To verify an agent's output you need ground truth, and if you had cheap ground truth you often wouldn't need the agent. So the honest verification layer gets scoped, estimated, and deferred to next quarter, while the dashboard shows uptime, token spend, p95 latency, trace counts. Every one of those measures *execution*. None of them measures *outcome*. Every observability stack I've seen will tell you the agent ran. Almost none will tell you anything happened.

Gartner predicted in June 2025 that [over 40% of agentic AI projects will be canceled by the end of 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027), citing unclear business value alongside cost and risk controls, and noted that out of thousands of self-described agentic vendors only around 130 were doing anything real. "Unclear business value" is a wonderfully diplomatic way to say *we ran it for a year and can't demonstrate it did anything*. That's forty-two green days at scale, with a budget attached.

## What I still can't catch

State-shaped failures I've mostly solved. Did the post go out, did the row get written, did the handle resolve, did the count move. Those have ground truth, and ground truth is checkable by dumb code with no opinions.

Judgment-shaped failures I haven't solved at all. My agent can generate a reply, publish it, and pass every assertion I own. Real target, real action, real state change, counter incremented. And the reply can still be mediocre in a way that costs me something slow and unmeasurable. I have no verifier for that. I have a sample I read manually, which isn't a system, it's a habit, and it degrades exactly when I'm busiest.

I also can't tell you my current setup isn't failing silently right now in some sixth way I haven't thought of. Every check I own was written after a specific incident. The next one will be too. I found the dead handles at six weeks, which makes six weeks my actual detection latency, and I have no particular reason to think it's improved since.