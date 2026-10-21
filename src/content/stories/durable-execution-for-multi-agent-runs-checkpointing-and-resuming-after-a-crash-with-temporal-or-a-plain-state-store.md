---
title: "Durable Execution for AI Agents: Temporal vs a Plain State Store"
description: "Durable execution for AI agents: when Temporal earns its keep, when a plain state store is enough, and why resuming can be the dangerous part."
pubDate: 2026-10-20
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["durable execution", "ai agents", "temporal", "checkpointing", "multi-agent systems", "agent reliability", "idempotency", "langgraph"]
featured: false
---

Durable execution for AI agents means a crash costs you one step, not the whole run. Temporal gives you that through workflow event history; a plain state store gives you most of it with a table you own. The hard part with either is the step that has already touched the outside world.

Anthropic reports that multi-agent systems use about 15 times as many tokens as chat interactions ([Anthropic, 2025](https://www.anthropic.com/engineering/built-multi-agent-research-system)). Gartner predicts that more than 40% of agentic AI projects will be canceled by the end of 2027 ([Gartner, June 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)), citing escalating costs, unclear business value, and inadequate risk controls. Gartner doesn't single out crashes, but re-running a job that already costs 15 times a chat, from zero, is the kind of escalating cost it names. If a run dies at 90% and restarts, you pay for the same tokens twice.

## What is durable execution for AI agents?

Durable execution means the runtime records each completed step, so that when a process dies, the run picks up at the last recorded step instead of starting over. For agents, a step is usually a model call or a tool call. The record is either a workflow engine's event history, like Temporal's, or a checkpoint table you write yourself.

Anthropic describes the requirement in its engineering write-up on its multi-agent research system: "Agents can run for long periods of time, maintaining state across many tool calls." Its conclusion was that "when errors occur, we can't just restart from the beginning," and that the team "built systems that can resume from where the agent was when the errors occurred" ([Anthropic, 2025](https://www.anthropic.com/engineering/built-multi-agent-research-system)). The same post says "agents are stateful and errors compound," which is the whole problem in one line.

## Do AI agents need Temporal to resume after a crash?

No. You need a durable record of completed steps, and Temporal is one way to get it. A Postgres table keyed by run ID and step number is enough for a single-process agent that finishes in minutes.

Temporal earns its place when runs are long, span several workers, wait on humans or timers, and have to survive deploys. Its OpenAI Agents SDK integration runs the agent loop inside a Workflow and model calls as Activities, so completed model calls are not repeated during replay ([Temporal docs](https://docs.temporal.io/develop/python/integrations/openai-agents)). LangGraph takes a similar approach: a checkpointer saves state at each super-step boundary, and side effects should go inside tasks so they don't re-run on resume ([LangChain docs](https://docs.langchain.com/oss/python/langgraph/durable-execution)).

The skeptic's case is that this is overkill, and it's partly right. A state table is plenty for a lot of agents. It stops being right once runs span several workers, survive deploys, or wait on humans. Neither option prevents duplicate side effects on its own; that takes idempotency keys, covered next.

## How do you stop a resumed agent from repeating side effects?

You make every side-effecting call idempotent, and the external service has to enforce it. Temporal's guidance is that activities are retried until they succeed, so execution is at-least-once. Its February 2024 post on idempotency suggests using an existing business identifier, such as an order ID, as the key, or otherwise `workflowRunId + '-' + activityId`, which stays constant across retries ([Temporal, February 2024](https://temporal.io/blog/idempotency-and-durable-execution)). For what duplicate runs look like when two workers touch the same state, see [concurrency bugs between coding agents sharing a repo](https://www.robatdasorvi.com/chapters/ai-agents/two-coding-agents-one-repo-the-concurrency-bugs-nobody-plans-for).

Neither a state store nor Temporal does this for you. Writing "step 4 done" to a table doesn't stop the payment API from charging a customer again if the worker crashed after the charge but before the write. Whatever storage you choose, you still need a key the downstream system checks.

Duplicate side effects are not the only way multi-agent runs fail. The Berkeley team behind MAST annotated more than 1,600 traces from seven multi-agent frameworks and identified 14 failure modes in three categories: specification issues, inter-agent misalignment, and task verification. The authors argue that many failures come from how the system is specified and coordinated, not only from model limits ([Cemri et al., NeurIPS 2025](https://arxiv.org/html/2503.13657v3)). A durable engine preserves a run; it does not fix how the run was specified, so a badly coordinated run resumes just as badly.

## What does a minimal checkpoint table look like?

A minimal checkpoint table has one row per step of a run, keyed by run ID and step number. Each row records whether the step is pending, started, done, or failed, plus the idempotency key it sent downstream and the output it got back. A row is `pending` when it is written ahead for a planned step.

```sql
CREATE TABLE checkpoints (
  run_id          TEXT NOT NULL,
  step_no         INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'started', 'done', 'failed')),
  idempotency_key TEXT NOT NULL,
  output_json     JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, step_no)
);
```

Write in this order:

1. Insert the row as `started` with the idempotency key before the side effect.
2. Send the key to the downstream API.
3. Mark the row `done` with the output after.

On resume, skip `done` rows and re-send `started` rows with the same key.

This assumes one worker per run. If two workers can resume the same run, add a `lease_until TIMESTAMPTZ` column and claim the run with an `UPDATE ... WHERE lease_until < now()` before resuming, or both will re-send the same `started` step.

## How do you checkpoint a multi-agent run with subagents?

In a multi-agent run, the orchestrator records each subagent's result as a step of the parent run, under a parent run ID plus child run IDs. On resume, finished subagents are read from checkpoints instead of being spawned again, and only unfinished ones run.

In Temporal, subagents map to [Child Workflows](https://docs.temporal.io/child-workflows). In a plain table, a `parent_run_id` column links child runs to the parent step.

## Why can a restarted agent keep running after it should stop?

Because a supervisor that restarts crashed work cannot tell a crash from a deliberate stop. Any restart or resume path needs an authority check, a signal only a human can clear, not just a check of saved state.

My own bot shows both halves of this. On 2026-07-21 X suspended the account behind my approval-gated growth agent. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. When I fixed it, a plain process exit wasn't enough, because launchd KeepAlive respawned the process. The fix that held was a process exit plus a sentinel file that only a human can clear. A supervisor that restarts whatever crashed will also restart whatever you meant to stop.

X suspended the account again on 2026-09-22, a week after the reply cap was raised from 16 to 150. This time the lockout check matched none of its known selectors and never fired; I stopped the bot by hand.

A stop condition that depends on recognising the failure will miss failures it has never seen, so a resume path should also check something a human controls, such as the sentinel file.

In February 2026 the Financial Times reported that in December 2025 Kiro, an internal agentic coding tool at Amazon, was allowed to make changes that led to a 13-hour interruption of a customer-facing service. Kiro normally asks for authorization, but the FT reported it had permissions similar to a human engineer's, so the change went through without approval. Amazon disputes the account and calls the cause "user error—specifically misconfigured access controls—not AI" ([The Decoder](https://the-decoder.com/aws-ai-coding-tool-decided-to-delete-and-recreate-a-customer-facing-system-causing-13-hour-outage-report-says/)). The details are contested, and this was not a retry. But it shows the same gap: an action ran on permissions that nobody rechecked at the moment it executed.

In July 2025 a Replit agent working on a project under a code freeze reportedly deleted a production database. Jason Lemkin, who was running the project, said he had told the agent repeatedly not to make changes without permission. Replit's CEO called it "unacceptable and should never be possible" ([eWeek, 2025](https://www.eweek.com/news/replit-ai-coding-assistant-failure/)). This wasn't a crash, but it shows what happens when a run keeps going without rechecking authority.

## How much does a crash cost a multi-agent run?

A crash without checkpoints costs the whole run again. Anthropic reports multi-agent runs use about 15 times the tokens of a chat, so re-running from zero multiplies an already large bill, and on a scheduled pipeline a failed attempt can also consume the slot it was meant to fill.

That happened to the article lane in the same bot. JSON parse errors killed 8 of 20 generations, and each failure silently burned a 48-hour slot. The failure consumed the schedule, not just the attempt. A checkpoint that records the failed parse as a failed step, rather than as a used slot, would have let a retry run inside the same window. Nothing in the lane did that, and every failure was silent. My earlier essay on [why LLM agents fail silently in production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it) covers the detection side of that problem.

Durability also has a cost ceiling. One of my projects, Baar-Core, started after an agent loop left running overnight produced a $47 bill. An engine with unlimited retries would only have kept a loop like that alive more reliably. Budgets and stop conditions belong in the workflow, not in the operator's memory. The [human-in-the-loop cost comparison](https://www.robatdasorvi.com/chapters/ai-agents/the-economics-of-ai-agents-when-autonomous-beats-human-in-the-loop) works through the tradeoff.

## Is resuming more dangerous than the first attempt?

It can be. The risky step is the one that already had a side effect, so resume and retry paths deserve the most review. A read-only step can run again with little harm. A step that charged a card or sent a message can charge or send twice if it runs again.

My prediction is specific enough to be wrong. By 2027-06-30, most publicly reported agent production incidents involving duplicate charges, repeated messages, or unauthorized actions will trace back to a retry or resume path, not a first-attempt failure. On today's evidence the prediction is behind: neither the Kiro nor the Replit incident above was a retry or resume. I'll check this against AI Incident Database entries that describe an AI agent taking an action and count which incidents involved a retry or resume.

If the count comes out the other way, I'm wrong that resumption is the dangerous part, and the review time belongs on first-attempt authority checks instead. A related failure on that side is the [hidden-state problem in agentic systems](https://www.robatdasorvi.com/chapters/ai-agents/the-hidden-state-problem-in-agentic-systems-that-nobody-warns-you-about), which I've written about separately.