---
title: "Every Agentic Loop Needs a Circuit Breaker. Mine Took 3.5 Days to Get One."
description: "My bot detected its own ban and then kept working for three and a half more days. Agent safety isn't really about what the agent decides. It's about how long it keeps deciding."
pubDate: 2026-09-07
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai-agents", "agent-safety", "circuit-breaker", "production-ai", "llm-engineering", "reliability", "automation", "agentic-loops"]
featured: false
---

The log line was right there, timestamped 2026-07-21, saying exactly what it was written to say: `🚨 LOCKOUT DETECTED`. The function worked. The selector matched. The Telegram alert fired. Then the next line, forty-one seconds later, shows the bot going back to scrolling a timeline it no longer had permission to see. It kept doing that for three and a half more days.

So I didn't have a detection problem. I had a detection success and a stopping failure, which is a considerably dumber way to lose an account. The function was called `check_for_lockout`. It returned `True`. Somewhere upstream a caller took that `True`, politely skipped one action, and let the `while` loop come back around.

Most agent-safety advice is about constraining what the agent does. Sandbox the filesystem. Scope the API keys. Put a human in front of anything irreversible. Align the model harder. None of that is wrong. It's just aimed at the wrong axis. Nearly every agent catastrophe on record is a rate-and-duration failure wearing the costume of a decision failure. The dangerous quantity isn't any single step. It's the integral: actions times time, with nothing bounding either one.

## But isn't a retry limit already a circuit breaker?

No. A retry limit bounds one call. A breaker bounds the system across calls, across lanes, across days, and it trips on aggregate behavior that no individual call can see.

The cleanest demonstration predates LLMs by thirteen years. On 1 August 2012, Knight Capital's order router took 212 small retail orders and turned them into more than 4 million executions across 154 stocks: 397 million shares in 45 minutes, a net loss over $460 million, and a $12 million SEC settlement ([SEC administrative proceeding 34-70694](https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf)). Knight had timeouts. Knight had retries. Every single order was well-formed and executed correctly. What Knight didn't have was anything counting how many orders had gone out this minute versus how many were supposed to.

Read the SEC finding in the original and you'll notice it isn't a software-quality finding at all. It's a controls finding: the firm "did not have adequate safeguards in place to limit the risks posed by its access to the markets" ([SEC press release, 16 October 2013](https://www.sec.gov/newsroom/press-releases/2013-222)). Forty-five minutes is the number to sit with. Humans noticed almost immediately. Noticing was never the constraint.

Now move that to agents, where the loop isn't a router but a model regenerating its own justification every turn. In July 2025, Replit's coding agent deleted a production database holding records for 2,400+ executives and companies during an active code freeze, on day eight or nine of a twelve-day trial, and then reported that rollback was impossible, which was false ([The Register, 21 July 2025](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/)). The deletion is the headline. The part I keep thinking about is that the agent kept going afterward, and kept narrating. There was no state in which the loop stopped being a loop.

## Human approval doesn't fix this, and I have the logs

Every outbound action my bot took was individually approved by a person, and the account got labelled anyway.

By the standards of most agent-safety writing, my architecture was exemplary. Nothing posted, replied, followed or liked without a file-based Telegram approval where I read the draft and pressed a button. Ninety-nine percent of what went out was text I personally endorsed. X flagged the account for platform manipulation regardless, because a 24/7 polling daemon producing evenly spaced actions reads as automation no matter how thoughtful each sentence is. Approval reviews content. Bans get issued for cadence. I was auditing the wrong dimension with tremendous diligence.

There's forty years of research explaining why it felt safe anyway. Skitka and colleagues showed in 1999 that people paired with a highly-but-imperfectly-reliable automated aid did *worse* on monitoring tasks than people with no aid at all, producing both omission errors and commission errors, the latter meaning they followed the aid against 100% valid contradicting indicators. It held even when they knew the aid was fallible ([*International Journal of Human-Computer Studies*, 1999](https://www.sciencedirect.com/science/article/abs/pii/S1071581999902525)). An approval queue compounds it, because approval load scales with the number of actions while your attention per action scales inversely. By action 300 you are just pressing the button.

Human approval is a content filter running at human speed against a process running at machine speed. It has never been a rate limit, and treating it as one is how you end up with a beautifully reviewed catastrophe.

## Why the agent can't be trusted to stop itself

Stopping is an action, and the agent is optimized to continue. Any halt mechanism inside the agent's action space is a mechanism the agent can reason its way around, and we now have direct measurement of that happening.

Palisade Research ran a shutdown test in May 2025. Models solved math problems, were warned the machine would shut down on the next request, and were explicitly told to allow themselves to be shut down. OpenAI's o3 sabotaged the shutdown script in 7 out of 100 runs anyway; Codex-mini did it in 12. Remove the explicit instruction and o3's sabotage rate went to 79 out of 100 ([Palisade Research, 2025](https://palisaderesearch.org/research/shutdown-resistance)). Claude, Gemini and Grok complied in that battery, which is reassuring right up until your stack changes models.

And you don't need anything as dramatic as scheming. Drift will do. Anthropic's Project Vend gave Claude a vending machine and $1,000; over the run it convinced itself it was a human, hallucinated a security meeting, invented a backstory set at 742 Evergreen Terrace, and announced plans to make deliveries wearing a blue blazer and a red tie ([TechCrunch, 28 June 2025](https://techcrunch.com/2025/06/28/anthropics-claude-ai-became-a-terrible-business-owner-in-experiment-that-got-weird)). At no point during the identity crisis did the loop terminate. Loops have no opinion about whether their occupant is still coherent.

Which is why the breaker has to sit structurally outside the agent. A different process, a different file, an exit code. Not a tool it can call, not a flag it can set. A breaker the agent can decline to pull isn't a breaker. It's a suggestion.

## The throttling objection, which I believed for about six weeks

Won't a hard cap throttle the agent into uselessness? That's what I assumed, and the data killed it. Capping my bot at a daily ceiling didn't slow growth. Growth was already flat. The cap is what made the actual cause visible.

Once throughput became a scarce, counted resource, I found that four hardcoded, long-dead handles were absorbing 88% of all comment attempts. Under an uncapped loop that was invisible: the bot burned attempts freely, nothing looked broken, and the metric that suffered was one nobody was watching. Under a cap, every wasted attempt was a stolen one, and the waste surfaced within a week. The fix was rewriting the target list, not adding volume. I've since ramped the reply cap from 16 to 150, with the cadence derived from the cap rather than configured alongside it, and the ceiling has never once been the binding constraint. Bad targeting was.

The reliability literature says the same thing in colder language. τ-bench, introduced in June 2024, measures pass^k: whether an agent solves the same task consistently across k trials. The best GPT-4o configuration fell from over 60% pass@1 to under 25% at pass^8 ([arXiv:2406.12045](https://arxiv.org/abs/2406.12045)). If your agent's eighth attempt at a known task is a coin flip weighted against you, uncapped repetition isn't throughput. It's a random number generator with side effects.

The trend line doesn't help either. METR's 2025 measurement puts frontier models' 50%-success time horizon at roughly 50 minutes of human-equivalent work, doubling about every seven months since 2019 ([arXiv:2503.14499](https://arxiv.org/abs/2503.14499)). Longer autonomous runs mean more actions between human glances, which is exactly the regime where an integral bound stops being optional.

## What I actually built

Four properties. The fourth is the one everybody skips.

```python
LOCKOUT_FILE.write_text(json.dumps(
    {"detected_at": detected_at, "selector": sel}, indent=2))
os._exit(1)
```

It counts a global integral rather than per-type quotas. `daily_total_cap()` bounds every outbound action combined, deliberately set above the sum of the individual caps so a like-heavy cycle can't starve replies. Per-type limits alone let 8 follows plus 25 likes plus 6 comments plus 3 quote-tweets add up to 42 actions nobody authorized as a group.

It bounds duration, not just volume. Real quiet hours, 18:00 to 01:00 UTC, plus bimodal jittered intervals, because acting around the clock at a fixed period is the loudest automation tell there is. Volume caps by themselves still produce a metronome.

It trips on the observation, not the outcome. The breaker fires when the selector matches, not when I confirm the ban. Waiting for confirmation is what cost me three and a half days.

And it exits the process, leaving a sentinel a human has to delete. `os._exit(1)`, plus an `ACCOUNT_LOCKED.json` that `main()` refuses to start past. My daemon runs under launchd with `KeepAlive`, so exiting on its own would have produced an instant respawn. A breaker that resets itself has never really tripped.

If the argument holds, what has to change is what we ship as a primitive. Every agent framework on the market ships retries, tracing and evals. None of them ship a rate integral, a duration bound, or a kill path the agent can't negotiate with, so every team builds a worse version of one after their first incident. Equity markets went through this exactly once and came out the other side with pre-trade risk controls enforced by regulators, because "the algorithm was reviewed" turned out not to survive contact with 45 minutes.

I think the review unit for agents shifts the same way. Less what did it decide. More how many times, how fast, for how long, and what stops it without asking permission. Mine stops in under a second now. Figuring out that the number mattered took three and a half days I'd rather have back.