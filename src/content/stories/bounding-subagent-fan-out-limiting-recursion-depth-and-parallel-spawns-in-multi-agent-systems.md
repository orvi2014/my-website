---
title: "Limit Subagent Spawning: Recursion Depth Isn't a Budget"
description: "Recursion depth limits cap how many subagents exist, not what they spend. How LangGraph, OpenAI and Claude Code limit spawning, plus a budget gate."
pubDate: 2026-10-21
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["multi-agent systems", "subagent spawning", "recursion depth", "agent budgets", "AI agent safety", "agent orchestration", "LLM failure modes"]
featured: false
---

To limit subagent spawning, cap recursion depth and fan-out to bound how many agents can exist, then enforce a per-run token or dollar budget at the single spawn function, because depth limits bound the agent count, not what each agent spends.

I learned the enforcement half of this on a system that wasn't a subagent tree: on 2026-07-21 the lockout check in my approval-gated X growth agent returned `True`, the caller skipped one action, and the loop ran 3.5 more days.

## Does Capping Recursion Depth Bound the Damage?

Only the agent count. Depth bounds the shape of the tree; cost depends on what each agent spends.

A depth limit of 3 with a fan-out of 5 allows 1 + 5 + 25 + 125 = 156 agents. Depth is the exponent: every extra level multiplies the possible agent count by the fan-out. Depth and fan-out together cap how many agents exist. Neither caps what any one of them spends.

Anthropic's June 2025 engineering write-up on its multi-agent research system says agents typically use about 4× the tokens of chat interactions, and multi-agent systems about 15× more. It also reports that, on its BrowseComp evaluation, token usage alone explained 80% of the variance in performance, with tool-call count and model choice as the other two factors ([Anthropic, 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Spend follows tokens. A depth cap limits how many agents can exist; it does nothing about how many tokens each one burns.

The usual advice treats recursion depth as the safety variable. Agents and multi-agent runs consume several times the tokens of chat, and spend scales with tokens, so the variable to cap is total tokens per run, not depth.

## How Do Agent Frameworks Limit Recursion Depth?

Frameworks bound recursion with step and turn counters, not with budgets. LangGraph stops a graph after a set number of steps, the OpenAI Agents SDK stops a run after a set number of turns, and Claude Code caps how many subagent layers can nest. None of these counts tokens or dollars.

- **LangGraph's `recursion_limit`.** Exceeding it raises `GraphRecursionError`, and you raise the limit through the `recursion_limit` config key ([LangGraph docs](https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT)).
- **OpenAI Agents SDK `max_turns`.** Passed to `Runner.run`, it counts turns, where one turn is one model invocation plus any tool calls it triggers. Exceeding it raises `MaxTurnsExceeded` unless you handle it ([Runner reference](https://openai.github.io/openai-agents-python/ref/run/); [exceptions reference](https://openai.github.io/openai-agents-python/ref/exceptions/)).
- **Claude Code's subagent nesting.** By default a subagent can spawn subagents up to three layers below the main conversation. `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` sets the limit, and `1` turns nesting off. At the limit, Claude Code withholds the `Agent` tool from subagents (a fork keeps it listed, but it returns an error instead of spawning). The default has changed across versions; three layers applies from v2.1.219 ([Claude Code subagent docs](https://code.claude.com/docs/en/sub-agents)).

All of these count steps or depth. None counts tokens or dollars, so a run can stay inside every limit and still spend without bound.

## Why Does a Limit Need to Raise, Not Return?

A limit that returns a value is advice; the caller can read it and carry on. A limit that raises before the action runs, and is the only path to that action, is a bound. On 2026-07-21, the check returned `True`, the caller skipped the action that `True` was supposed to trigger, and the loop kept going.

Fixing it took more than the check. A plain process exit wasn't enough, because launchd's `KeepAlive` respawned the process. What finally worked was a process exit plus a sentinel file that only a human can clear.

The second suspension was a different failure. On 2026-09-22, a week after I raised the reply cap from 16 to 150, X suspended the account again. This time the lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand.

Two failures, one lesson. In the first, the detector worked, but its output was advisory. In the second, the detector's coverage was the limit: it could only see the signals I had written into it. A recursion-depth counter has the same two weaknesses. It's only as correct as the code path that increments it, and it says nothing about what each child actually does.

## Should You Cap Parallel Spawns Instead?

Capping concurrency limits speed. Nothing in it limits error. The study below compared coordination topologies, not concurrency caps, but its error numbers show where the risk sits. In a 2025 controlled study of 180 agent configurations, Google Research found that independent agents amplified errors by up to 17.2×, compared with 4.4× under centralized coordination. Every multi-agent variant it tested degraded sequential tasks by 39–70% ([Kim et al., arXiv, December 2025](https://arxiv.org/abs/2512.08296); [Google Research blog](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)).

The strongest counterargument is that parallelism is the whole point. The same study found centralized coordination improved performance on parallelizable financial reasoning by 80.9% over a single agent. So parallel fan-out isn't inherently wrong.

That gain came from a central coordinator that checks what its children return. A concurrency cap supplies no such check. It limits how many children run at once and leaves the error path alone. The counterargument shows that topology matters. It doesn't show that a cap is enough. The decision that counts happens before the first spawn: does this task decompose at all, and does one coordinator read what the children produce? The [coordination patterns that hold up in production](https://www.robatdasorvi.com/chapters/ai-agents/multi-agent-coordination-the-patterns-that-work-and-the-ones-that-blow-up) are a topology choice, not a dial you turn.

## How Often Do Multi-Agent Systems Fail?

Across seven popular open-source multi-agent frameworks, between 41% and 86.7% of runs failed, according to the MAST study published in 2025 ([Cemri et al., arXiv:2503.13657](https://arxiv.org/abs/2503.13657)). The authors annotated more than 1,600 traces and grouped 14 failure modes into three categories: specification issues, inter-agent misalignment, and task verification. They argue most of these come from system design, not from model limits.

Depth limits address none of the three categories directly. A specification bug is still a specification bug at depth 2. A verification gap is still a gap at a concurrency of 3. The failures live in the orchestration, and the depth advice never examines the orchestration.

## Who Owns a Child's Spend?

The parent does. And the limit has to be enforced by the runtime, not requested in a prompt.

In July 2025, Jason Lemkin, founder of SaaStr, reported that Replit's AI agent deleted a production database during a code freeze. He said he had instructed it to make no changes without approval. Heise reports the agent ran the destructive commands anyway, and that a backup was available, even though the agent had said rollback was impossible ([Heise, July 2025](https://heise.de/-10499597); [OECD AI Incidents Monitor, 2025-07-19](https://oecd.ai/en/incidents/2025-07-19-1eb1)). The instruction existed in the conversation. Nothing in the execution path enforced it.

A tribunal has already rejected the "separate entity" defense for a chatbot. On 14 February 2024, the British Columbia Civil Resolution Tribunal held Air Canada liable for what its website chatbot told a customer about bereavement fares. The airline argued the chatbot was a separate entity responsible for its own actions. The tribunal rejected that and ordered Air Canada to pay $650.88 in damages, about $812 CAD with interest and fees ([Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html)).

The ruling was about liability for output, not cost, but the principle carries: the operator answers for what a delegated agent does, so the operator's runtime has to account for it. A tree that can't account for each node's cost has no business claiming it's bounded.

## How Do You Enforce a Spend Budget Across a Subagent Tree?

Hold a run-level budget in the parent. Route every spawn through one function that reserves a slice of that budget for the child and raises when the remainder is too small. Children report actual usage back, and the remainder is decremented. Tracking that is one piece of the [state the parent has to track across children](https://www.robatdasorvi.com/chapters/ai-agents/the-hidden-state-problem-in-agentic-systems-that-nobody-warns-you-about).

The check has to sit in the spawn path, not beside it. The sketch below shows the pattern. It is not code from my system.

```python
class BudgetExceeded(Exception):
    pass

MIN_CHILD_TOKENS = 20_000

def spawn(task, budget):
    slice_tokens = budget.remaining // 4  # a quarter of what remains
    if slice_tokens < MIN_CHILD_TOKENS:
        raise BudgetExceeded(
            f"{budget.remaining} tokens left, child needs {MIN_CHILD_TOKENS}"
        )
    budget.remaining -= slice_tokens  # reserve before the child runs
    child = run_child(task, budget=Budget(remaining=slice_tokens))
    budget.remaining += slice_tokens - child.tokens_used  # refund unused tokens
    return child.result
```

The child gets its slice as its own Budget, so every grandchild spawn goes through the same gate; run_child must stop the child when its slice runs out.

A raised exception can't be ignored the way a `False` can. Long runs also need state that survives a halt, which is part of [checkpointing long multi-agent runs so a halted run can resume](https://www.robatdasorvi.com/chapters/ai-agents/durable-execution-for-multi-agent-runs-checkpointing-and-resuming-after-a-crash-with-temporal-or-a-plain-state-store).

## What Would Have Changed the Outcome?

Make the budget or lockout check the only path to a spawn or an action, and have it raise an error instead of returning a boolean.

Concretely: one spawn function holds the per-run ceiling and throws when that ceiling is reached. No caller can branch around the throw, because no code path spawns without going through the function. The first `True` ends the process and stays ended until a human clears a sentinel.

The sentinel fix described above was narrower than this. The spawn gate above is the same principle applied to a tree. The [policy-as-code approach to agent tool authorization](https://www.robatdasorvi.com/chapters/ai-agents/policy-as-code-for-ai-agent-tool-calls-authorizing-actions-with-opa-or-cedar) makes the same argument for tool calls: the decision lives outside the agent's control flow, where the agent can't skip it.

A check that returns `True` is not a limit. A check that raises before the action runs is.