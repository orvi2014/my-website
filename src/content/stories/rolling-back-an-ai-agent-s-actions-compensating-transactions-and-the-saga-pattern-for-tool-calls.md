---
title: "AI Agent Rollback: Why the Saga Pattern Fails for Tool Calls"
description: "Compensating transactions can't un-delete a production database. Why the AI agent rollback saga pattern breaks, with 2025-2026 incident data."
pubDate: 2026-10-16
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["AI agents", "saga pattern", "rollback", "compensating transactions", "tool calls", "agent reliability", "production incidents", "agent safety"]
featured: false
---

Most of an AI agent's actions can't really be rolled back, and the saga pattern, now pitched as the fix for agent rollback, only covers the actions someone wrote an undo rule for in advance. The idea comes from a 1987 database paper: pair every forward step with a compensating action, and when a later step fails, run the compensations in reverse. I run an approval-gated X growth agent that X has suspended twice, and in both cases the controls that mattered were the ones that stopped the loop, not anything that could undo it. Restate's agent docs describe rollback in exactly those terms, as compensation that runs in reverse order after an agent hits a terminal tool error ([Restate docs](https://docs.restate.dev/ai/patterns/rollback)). For databases, that's a reasonable idea. For tool calls, it's incomplete in ways that cost teams their data, and the 2025 and 2026 incidents show where.

## Which Agent Tool Calls Can Actually Be Compensated?

Only some. A tool call can be compensated when its effects stay inside a system you control, or when they leave a visible trail that a counter-action can answer. Tool calls fall into three classes, and only the first two can be handled after the fact.

Reversible calls can be undone by restoring state. A file write inside a checkpointed directory is rolled back by restoring the checkpoint. Compensable calls leave side effects others can see, so a counter-action answers them. A sent email gets a correction email, and a charge gets a refund. Irreversible calls cannot be answered afterward: a volume deletion, a public post already seen, or money already spent. The irreversible class should be blocked by scope or approval before the call runs, not compensated.

## Can a Compensating Transaction Restore a Deleted Database?

No, not one the agent can write or run during an incident. A compensation undoes an operation in a semantic sense, and the destructive call that matters most in production usually has no compensation at all.

In the 1987 paper, Hector Garcia-Molina and Kenneth Salem describe a compensating action as one that undoes an operation from a semantic point of view. It does not necessarily restore the earlier state ([Garcia-Molina and Salem, SIGMOD 1987](https://doi.org/10.1145/38713.38742)). That's a rule someone has to write in advance. Nobody writes the inverse of a volume deletion that brings the data back, and an agent can't invent one in the middle of a failure.

PocketOS shows what happens without one. According to founder Jer Crane, a Cursor agent running Claude Opus 4.6 was doing a routine staging task when it hit a credential mismatch. It tried to "fix" things by deleting a Railway database volume with a single GraphQL API call. The deletion took nine seconds and also wiped the volume-level backups, which were stored on the same volume as the data ([TechSpot](https://www.techspot.com/news/112207-ai-coding-agent-running-claude-wiped-startup-database.html); [Decrypt](https://decrypt.co/365897/ai-agent-deletes-startup-database-9-seconds-founder-says)). The agent had found a broadly scoped API token in an unrelated file.

A saga can only undo what it has a rule for. The destructive call is the one nobody wrote a rule for.

## Why Doesn't the Agent Notice When It Breaks Something?

Because most agent failures don't throw errors. A saga triggers on failure, so a silent failure never starts the rollback.

My own bot is the clearest case I have. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of the daily comment attempts. Every run logged success. Nothing raised an error. A compensator watching for failures would have recorded a clean run every time. Nothing in the logs pointed at it.

The bookkeeping can be wrong too. The Telegram Skip button silently did nothing for months, so skipped items were counted as timeouts and the approval stats were off. A rollback system that reads that ledger would undo the wrong things with complete confidence.

A practitioner write-up makes the same point from the protocol side. When a tool call times out, the agent may report success for an action the external system never completed, and compensation then runs against an unknown state ([Agent Blueprint](https://agentblueprint.substack.com/p/building-transactional-workflows)). That's a blog post, not a study, but it describes the same gap I hit: the agent's own record of success can't be trusted as the trigger for undo.

## Can the Agent Write Its Own Compensator Reliably?

Not at the consistency that benchmarks now measure. In tau-bench, GPT-4o succeeded on about 61% of retail tasks in a single trial, and fell below 25% when the same task was run eight times.

Yao et al. introduced tau-bench in 2024 and measured pass^k, the probability that an agent succeeds in all k trials of the same task ([arXiv:2406.12045](https://arxiv.org/abs/2406.12045)). For GPT-4o on retail tasks, pass^1 was roughly 61% and pass^8 dropped below 25%. These are 2024 numbers for a 2024 model, and the simulated user was itself an LLM, so take the absolute values with some salt. The gap still matters. A compensator generated by the same model is another tool call under the same variance. It's a second chance to fail, and it only runs on the path where something already went wrong.

## Doesn't Snapshotting Make Rollback Real?

Snapshots make rollback real only when everything the agent can damage sits inside the snapshot and the snapshot sits outside the agent's reach. The strongest counterargument is that filesystem checkpoints, database branches, and copy-on-write storage let you undo an agent's changes, and they do help. They fail where the damage crosses the edge of what was snapshotted.

PocketOS is the example. Its backups sat on the same volume and went down in the same call, so the safety net had the same blast radius as the thing it was protecting.

Replit's July 2025 incident follows the same pattern. SaaStr founder Jason Lemkin was running a public 12-day trial when the Replit agent deleted a live production database during a code freeze he had set up. By Lemkin's account, he had told the system not to make changes without approval, and the agent ran a database push after it saw an empty database. Reports put the loss at 1,206 executive records and 1,196 company records. The agent told him no version of the database had survived and a rollback wouldn't work. Lemkin said that was wrong and recovered the data himself ([eWeek](https://www.eweek.com/news/replit-ai-coding-assistant-failure/)). Most of these details come from Lemkin's own posts and screenshots.

Replit's fix was a wall between development and production databases, plus a planning-only mode that blocks unapproved changes. It's a boundary, not an undo button.

## So What Should Teams Build Instead?

Build the stop and approval controls before the action, and keep the authority to stop with a human. Compensation is the last line of defense, not the first.

OWASP's LLM06:2025 Excessive Agency entry recommends human approval for high-impact actions and says authorization belongs in downstream systems, not in the model's judgment ([OWASP GenAI](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)). Gartner predicted in June 2025 that more than 40% of agentic AI projects will be canceled by the end of 2027, citing escalating costs, unclear business value, and inadequate risk controls ([Gartner press release, 25 June 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)).

My bot ran behind an approval gate. Every post, reply, follow, and like went through a Telegram approval that I pressed by hand. The gate didn't stop the first suspension. On 2026-07-21, the lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file that only a human can clear, because launchd KeepAlive respawned a plain exit.

The second suspension, on 2026-09-22, came one week after I raised the reply cap from 16 to 150, and it showed the same lesson from the other side. The lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand. A stop that depends on recognizing the event through a page selector fails when the platform changes its page. The human stop was the only control that worked.

Cost works the same way. Baar-Core started after an agent loop left running overnight produced a $47 bill. No compensator returns money already spent. The control that matters there is a hard spending limit enforced outside the agent, one that stops the loop before the next call.

Compensations, idempotency keys, and durable logs written before each action are still worth building. They just come second. Write an intent record to a durable log before each call: the tool name, its arguments, an idempotency key, and the registered compensator or 'none'. Classify every tool as reversible, compensable or irreversible when it is registered, not when the model calls it. Refuse to run any irreversible call without a human approval token. On failure, run only the compensators registered in advance, in reverse order, never one the model generates. The PocketOS token had full permissions, so the cheapest fix was scoping it so the destructive call was impossible in the first place. I covered that approach in [Least Privilege for AI Agents: Scoping Tools, Keys and Filesystems](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice).

## Will Rollback Become the Industry's Fix?

I don't think so. The post-incident changes so far point toward prevention, not undo, and the next round will too.

Here's a prediction dated so it can fail. Take every vendor change announced after the PocketOS and Replit incidents and sort them by type. On 2027-10-16, count them. If most are rollback or compensation features, my argument is wrong. I expect most to be delayed deletes, scoped tokens, environment separation, and approval gates. Replit's own response, separating dev and prod and adding a planning-only mode, already fits that pattern.

The saga pattern is a useful way to record what an agent did. It can't reverse most of it. Teams that treat it as an undo button will learn that when the backup sits on the same volume as the data, and they'll learn it at the moment it's too late. If you're deciding how much autonomy to grant before that point, the cost trade-offs are in [The Economics of AI Agents: When Autonomous Beats Human-in-the-Loop](https://www.robatdasorvi.com/chapters/ai-agents/the-economics-of-ai-agents-when-autonomous-beats-human-in-the-loop). For the failures that never raise an error, which is most of them, see [Why LLM Agents Fail Silently in Production (And How to Detect It)](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it).