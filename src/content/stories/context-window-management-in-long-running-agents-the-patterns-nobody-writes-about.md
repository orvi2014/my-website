---
title: "Context Window Management in Long-Running Agents: The Patterns Nobody Writes About"
description: "Context window management isn't compression. What years of long agent runs, one embarrassing mistake of mine, and the long-context benchmarks actually say."
pubDate: 2026-09-11
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["ai-agents", "context-window", "llm-engineering", "context-engineering", "agent-architecture", "long-context", "prompt-caching", "rag"]
featured: false
---

The agent had been running for four hours and it was arguing with itself about a file it had already fixed.

I watched it open `migrations/0014_add_index.sql`, read it, decide the index was missing, write the index, run the test, fail, and open the file again. Third time. Somewhere around turn 90 the summarizer had fired, and what it produced was immaculate: a clean paragraph about everything the agent had accomplished. What it dropped was the one sentence from turn 12 where I'd said *the index exists, the test is wrong.* Eleven words. The failed diff it kept instead ran 3,000 tokens.

For years I'd thought about context window management as a packing problem. How do I fit more in. That night I understood I'd been solving the wrong thing long enough to have built three systems on top of the mistake.

## Why does my AI agent get worse the longer it runs?

Two reasons. Performance degrades with input length well before the window is full. And the thing filling your window is mostly the agent's own failed attempts, which are the highest-token, lowest-value content in the session.

The first half is measured. Chroma's *Context Rot* report (July 14, 2025) ran 18 models, including GPT-4.1, Claude 4, Gemini 2.5 and Qwen3, and found performance varies significantly with input length even on trivially simple tasks, with meaningful degradation showing up at 50K tokens inside a 200K-token window ([trychroma.com](https://www.trychroma.com/research/context-rot)). NVIDIA's RULER benchmark (2024) tested 17 long-context models across 13 tasks and found that near-perfect needle-in-a-haystack scores collapse the moment you ask for multi-hop tracing or aggregation ([arXiv:2404.06654](https://arxiv.org/abs/2404.06654)).

The second half nobody writes about, because it's embarrassing to admit you've looked. Go dump the raw context of a long-running agent at hour three and sort every token by where it came from. In my runs the split lands somewhere around 8% system prompt and tools, 6% actual user instruction, 11% retrieved source material. The remaining three quarters is transcript: tool outputs, stack traces, the 40,000-token `npm test` dump where the real failure is on line 12, and the agent's own reasoning about approaches it already abandoned.

So three quarters of the attention budget goes to the model rereading its own diary.

## Doesn't a bigger context window just solve this?

No, and this is the counterargument I believed longest. A 1M-token window doesn't buy you 1M tokens of usable reasoning. It buys you 1M tokens of somewhere to put things, which is a different resource.

The NoLiMa benchmark (Modarressi et al., 2025) is the cleanest refutation I know. It builds needle-in-a-haystack tests where the question and the answer share almost no literal vocabulary, so the model has to infer the association instead of string-matching it. At 32K tokens, 10 of 12 tested models dropped below 50% of their own short-context baseline. GPT-4o went from 99.3% to 69.7% ([arXiv:2502.05167](https://arxiv.org/abs/2502.05167)). Thirty-two thousand tokens is a medium-sized pull request.

Position matters too, and it has survived every architecture generation so far. Liu et al.'s *Lost in the Middle* (2023) found GPT-3.5-Turbo scored 75.8% when the relevant document sat at the start of the context and 53.8% when it sat in the middle, which is worse than the 56.1% it managed closed-book with no documents at all ([arXiv:2307.03172](https://arxiv.org/abs/2307.03172)). Handing the model the answer, in the wrong place, was worse than handing it nothing.

The architecture explains it. Attention creates n² pairwise relationships for n tokens, and Anthropic's context engineering guidance puts the consequence bluntly: context is a finite resource with diminishing marginal returns, and models have an attention budget that gets stretched thin as you spend it ([anthropic.com](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). You can't buy attention with window size.

What actually broke my "just make it bigger" instinct wasn't a paper, though. It was noticing that my *worst* agent runs were the ones with the best retrieval.

## Does adding more relevant context improve accuracy?

Not reliably. Semantically similar distractors hurt more than random filler does, which means a well-tuned retriever handing back five near-duplicate documents can do more damage than one returning junk.

This is the Chroma finding that rearranged my head: performance degrades *faster* when the needle and the question are semantically similar, and even a single distractor measurably lowers accuracy. I had built a retrieval layer whose entire job was to maximize semantic similarity to the query. With great care and several weeks of eval work, I had built a machine for manufacturing confusable distractors, and then congratulated myself on the recall numbers.

Here's the confession proper. For about three years I treated context management as compression, a lossy-encoding problem where the goal was maximum information per token. I tuned chunk sizes. I ran summarization benchmarks. I was genuinely proud of a pipeline that squeezed a 200-message history into 4,000 tokens at 94% fact retention on my own eval.

Fact retention was the wrong metric and I should have caught it years earlier. What agents lose across a compaction boundary is almost never facts. It's constraints, negations, and the reasoning behind a decision, which happen to be the three things with the worst token-to-importance ratio in the whole transcript. "Don't touch the auth middleware" is five words. What it prevents is a two-hour detour. Every summarizer I've evaluated, including the ones I wrote myself, preferentially keeps what happened over what was ruled out, because what happened has more tokens and more nouns in it.

I'd been building a better codec. The problem wanted a filing system.

## What should actually live in the context window?

Only what the model needs *this turn*, plus the constraints it must never violate, plus a pointer to everything else. Anthropic's framing is the one I converged on independently: find the smallest set of high-signal tokens that maximize the odds of the outcome you want.

Four patterns survived contact with production, roughly in order of how much they mattered.

Put constraints last, not first. Everyone drops the rules into the system prompt, because that's where rules go. But the recency end of the window is the reliable end. The U-shape in *Lost in the Middle* has two peaks, and the tail one is the peak you can control cheaply. I now re-inject the active constraint set as the final block before every model call. Costs maybe 200 tokens a turn. It killed off the single most common failure class I had.

Give failures a line, not a transcript. When a tool call fails, what enters the permanent record is one line: what was attempted, what the error class was, and whether it's worth retrying. The full output goes to a file the agent can re-read on demand. That one change cut my median context size by roughly 60% with no capability loss I could measure, because the agent almost never re-read those files. It didn't want them. It never had.

Keep everything dynamic out of the prefix. This is the detail that costs real money and shows up in no think-piece. Interpolate a timestamp, a current-date string, or a rotating session ID into your system prompt and you invalidate the prompt cache on every single turn of a hundred-turn run. I did this for months, via a helpful `Current time: {now}` line that no task ever used. The cost difference between a cached and uncached prefix over a long agent run is roughly an order of magnitude. It was one f-string.

Give the window a floor, not just a ceiling. The StreamingLLM paper (Xiao et al., 2023) found that keeping the KV states of just the first four tokens as "attention sinks" restores stable perplexity and lets models stream past 4 million tokens, with up to 22.2× speedup over sliding-window recomputation ([arXiv:2309.17453](https://arxiv.org/abs/2309.17453)). The lesson generalizes past that specific implementation: a small, fixed, never-evicted anchor at the head of the window is load-bearing. Whatever else you compact, don't compact the top.

## Why do experienced engineers still get this wrong?

Because the failure is silent, delayed, and looks exactly like a model problem. Nothing throws. The agent doesn't error out at turn 90, it just gets subtly and expensively stupid, and the obvious conclusion is that you need a better model.

I've watched three separate teams, mine included, respond to hour-three degradation by upgrading models. It works, briefly, which is the worst available outcome, because it confirms the wrong diagnosis and buys four months before the same wall shows up at hour five. The tell is always the same. The agent repeats work it already did. Not *fails* at the work. Repeats it. When you see repetition you have a context problem, not a capability problem. A model that has forgotten something behaves identically to a model that never knew it, and only one of those gets fixed by spending more per token.

There's a second reason, which is that context assembly is the one part of an agent stack nobody has a test suite for. We test prompts. We test tools. We test outputs. I have never seen a fixture asserting what the assembled window looks like at turn 60, and turn 60 is exactly where the bug lives, inside a string that gets built at runtime and thrown away.

## What happens next

Give it eighteen months and I'd expect "context diff" to be an ordinary debugging artifact. You pull up two runs, see which turn dropped which constraint, and the whole thing feels about as exotic as reading a stack trace.

The frameworks that win won't be the ones with the cleverest compaction. They'll be the ones where working memory is an inspectable, writable, version-controlled object with an eviction policy you can actually read, and where the first question after a bad run stops being *which model did you use* and becomes *show me what was in the window*.

I'll still have that migration file open somewhere. Turn three of four, for old times' sake.