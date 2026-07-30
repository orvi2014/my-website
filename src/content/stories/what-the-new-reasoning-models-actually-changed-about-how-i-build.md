---
title: "What the New Reasoning Models Actually Changed About How I Build"
description: "The data says reasoning models make developers 19% slower. Here's what actually changed in my software development workflow once I stopped ignoring that."
pubDate: 2026-07-15
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["reasoning models", "software development", "AI coding", "developer productivity", "OpenAI o1", "code review", "AI agents", "SWE-bench"]
featured: false
---

In 2025, METR ran a randomized controlled trial on 16 experienced open-source developers working real GitHub issues in codebases they knew well. Half the tasks allowed AI tools, half didn't. The developers using AI, including reasoning models, took 19 percent *longer* to finish. Afterward, when asked how AI had affected their speed, they said it made them 20 percent faster. Nobody in the study noticed the slowdown while it was happening.

I read that number six months after I'd already lived it. I'd spent the back half of 2025 wiring reasoning models (o1, then o3, then Claude's extended-thinking variants), into every part of my software development workflow, on the assumption that a model which "thinks longer" before answering must produce work that needs less fixing. That assumption is the standard advice on reasoning models: they reduce errors, so they reduce your total time. It's repeated in every vendor blog post and most engineering newsletters. It is wrong for the reason METR's data shows and for a second reason nobody measures: reasoning models don't just get things wrong less often, they get things wrong more *convincingly*. That's a different problem, and it costs different time.

## What Did the METR Number Actually Measure?

It measured real task completion time on real repositories, not benchmark accuracy. That distinction is the whole story.

METR's developers had an average of five years on the codebases they were working in ([arxiv.org/abs/2507.09089](https://arxiv.org/abs/2507.09089)). They weren't novices misusing the tools. They used Cursor and Claude 3.5/3.7 Sonnet, wrote prompts, reviewed diffs, and iterated, the exact loop every AI coding tutorial recommends. The 19 percent slowdown happened inside that loop, not despite it. Before the study, participants forecast a 24 percent speedup. After finishing the tasks and living the slowdown firsthand, they still reported believing AI had helped by 20 percent. The gap between forecast, lived experience, and self-report is nearly 40 points, in the same direction, twice.

That's the sentence worth sitting with: **experienced developers cannot reliably feel the difference between AI making them faster and AI making them slower.** The instrument they're using to judge, their own sense of flow while typing prompts and accepting suggestions, measures something other than elapsed time. It measures effort per keystroke, and reasoning models reduce keystrokes while increasing total minutes spent reviewing what the keystrokes produced.

## What Was I Doing With Reasoning Models That Made This Worse?

I was using them as a faster author, when the actual bottleneck in my work was never authoring.

For most of my career, writing the first draft of a function was never what ate the hours. Reading a legacy module and understanding why a bug existed, or verifying that a change didn't break three unrelated call sites, always took longer than typing the fix. Reasoning models are extremely good at the part that was never the bottleneck. o1-preview scored 41.3 percent on SWE-bench Verified at launch; by the December 2024 release, o1 had climbed to 48.9 percent on the same benchmark ([OpenAI o1 System Card](https://openai.com/index/openai-o1-system-card/)). Those are real gains at generating plausible, structurally correct patches for well-scoped issues. I read that trajectory as "the model is getting more correct" and handed it more authoring responsibility, bigger diffs, more files touched per prompt, less scaffolding written by hand first.

What I got back looked more correct than what earlier models produced, and that was the trap. A GPT-4o patch that was obviously wrong got rejected in five seconds. An o1 patch that was subtly wrong, right approach, one incorrect assumption about how a config value propagated three files away. Took twenty minutes to catch, because it read like something I would have written myself. Stack Overflow's 2025 Developer Survey found that 66 percent of developers report spending more time fixing "almost-right" AI-generated code than before, and that "AI solutions that are almost right, but not quite" is the single most-cited frustration with these tools, named by 45 percent of respondents ([Stack Overflow 2025 Developer Survey](https://survey.stackoverflow.co/2025/ai/)). Trust in AI output accuracy fell from 40 percent to 29 percent over the same period the models got better at benchmarks. Those two lines on the same chart, correctness up and trust down, is the whole argument against the standard advice in one graph.

## What Changed When I Stopped Asking for Code First?

I stopped treating the reasoning model as the author and started treating it as the prosecutor of my own drafts.

The switch happened on a specific afternoon working on a billing reconciliation job, the kind of task with enough edge cases (partial refunds, currency rounding, retried webhooks) that a plausible-looking fix is genuinely dangerous, because it passes the tests you thought to write and fails the ones you didn't. I'd asked o1 to implement the reconciliation logic directly, gotten something clean and well-commented, and only caught the rounding bug because a number looked one cent off in a manual test three days later. That cent was the tell. I rewrote the same feature myself, badly, in about forty minutes, then handed the draft to the model with one instruction: find every case where this breaks. It found four, one of which was the same rounding bug in a different guise. It took less combined time than the first approach, and I ended the session understanding the code, because I'd written it.

That's the actual shift new reasoning models produced in my process. Not faster code generation, faster, harsher review of code I still write myself for anything with real edge-case density. **The reasoning that makes these models good at catching my mistakes is the same reasoning that makes their own mistakes hard to catch**, because a model working from a wrong premise reasons its way to a coherent, well-argued wrong answer instead of an obviously broken one. Using it as author hides that failure mode. Using it as reviewer exposes it, because now the coherent argument is aimed at something I already know the shape of.

## Doesn't the SWE-Bench Jump From 41 to 49 Percent Prove Reasoning Models Are Getting Faster?

No. It proves they're getting better at a specific, narrow kind of task, and that's not the same claim.

SWE-bench Verified is built from GitHub issues with a human-confirmed correct patch and a test suite that already exists ([OpenAI, "Introducing SWE-bench Verified,"](https://openai.com/index/introducing-swe-bench-verified/) August 2024). It rewards a model for converging on one known-good answer inside a well-bounded diff. That is close to the best-case scenario for how these models fail: bounded scope, existing tests, a single right answer. METR's study measured the opposite scenario, open-ended tasks in codebases with tacit knowledge no benchmark captures, judged by whether the change actually shipped correctly, not whether it matched a reference patch. A model can improve substantially on the first kind of task while making the second kind of task slower, because the second kind of task's cost isn't "can a correct patch be generated". It's "can I tell, without redoing the work myself, whether this particular patch is the correct one." Benchmark accuracy answers the first question. It says nothing about the second, and the second is what determined the 19 percent number.

If reasoning-model gains were closing that verification gap, you'd expect trust in AI accuracy to be flat or rising as benchmark scores climbed through 2025. It fell 11 points instead. The counterargument that better benchmarks imply better real-world throughput requires that verification cost scale down with generation quality. The data says it scales up, because better-looking wrong answers cost more to catch than worse-looking ones.

## What Do I Actually Do Differently Now?

I draft the parts of the system where a wrong answer would be expensive and hard to notice, and I let the reasoning model draft the parts where a wrong answer is cheap and obvious. Boilerplate, migrations with an existing pattern to follow, test scaffolding, the model writes those, because a mistake there fails loudly. Anything touching money, state that's hard to replay, or logic where "close" is functionally identical to "wrong," I write first and hand to the model as an adversary, explicitly asked to argue against my own assumptions rather than extend them.

That's the inversion the METR number was actually describing, before anyone had named it: the models got better at producing answers that feel finished, and feeling finished is precisely the property that defeats a developer's instinct for how much checking a piece of code still needs. The 19 percent slowdown wasn't a temporary calibration problem that better models would fix. It was the honest cost of verification finally showing up in the timer, after years of the same cost hiding inside "reading the code," which nobody times. I'm not faster than I was before reasoning models. I ship fewer of the bugs that used to cost me a Saturday, because I stopped asking the model to convince me and started asking it to try to prove me wrong.