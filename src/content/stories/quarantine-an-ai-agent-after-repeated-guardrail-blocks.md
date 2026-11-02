---
title: "Quarantine an AI Agent After Repeated Guardrail Blocks"
description: "To quarantine an AI agent after repeated guardrail blocks, count blocks in a window, hard-exit the process, and write a sentinel only a human can clear."
pubDate: 2026-11-02
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["AI agents", "guardrails", "agent quarantine", "human-in-the-loop", "excessive agency", "agent safety", "kill switch", "LLM security"]
featured: false
---

To quarantine an AI agent after repeated guardrail blocks, count guardrail violations (every action a guardrail blocked) per agent in a rolling window. When the count crosses a threshold, hard-exit the process and write a sentinel file that only a human can remove. Restarts, self-clearing timers, and alert-only checks all fail that test.

The lockout check I built wasn't the bug. The bug was assuming a detector could also act as the stop.

## What Happened When the Lockout Check Returned True?

X suspended the account behind my approval-gated growth agent on 2026-07-21. The lockout check fired and returned True, but the caller treated that as a reason to skip one action rather than to stop, and the loop kept running for 3.5 more days.

Every outbound action went through a Telegram approval that I tapped by hand, so the approval gate did its job. What failed was the layer above it, the one that was supposed to stop the agent from running at all. Approval limits what gets published. It doesn't stop the process from trying again and again.

## Why Didn't Exiting the Process Stop It?

A plain exit stops one process. A supervisor that restarts processes brings it right back. A plain process exit isn't enough when a supervisor is watching: the agent ran under launchd with KeepAlive, which respawns a process that exits. A stop the supervisor can reverse is just a pause with a delay.

The fix needed two parts. The process exits, and a sentinel file records the quarantine. Only a human deleting that sentinel can let the process run again.

## Why Did the Next Suspension Go Unnoticed?

X suspended the account again on 2026-09-22, one week after the reply cap was raised from 16 to 150. This time the lockout check matched none of its known selectors and never fired. I stopped the bot by hand.

The lesson is structural. A quarantine built on an external signal inherits every blind spot of that signal, and the platform decides what the signal looks like, not you. If your quarantine depends on a page layout, it will break the day the layout changes. It will break quietly too, because "no match" looks exactly like "no problem."

## Which Signal Should Trigger the Quarantine?

Count the agent's own guardrail blocks and its wasted actions in a window. External detectors and exception counts each miss a whole class of failure.

| Trigger | Fires when | What it misses |
|---|---|---|
| Exception count | An action raises an error | Silent no-ops: four dead target handles absorbed 88% of comment attempts for about six weeks, and every run logged success |
| External detector | The platform shows a known signal | Anything the detector has no selector for; it never fired on the second suspension |
| Guardrail blocks per agent per window | The agent repeatedly attempts forbidden actions | Violations that no guardrail was written to catch |
| Wasted actions | An action's target fails to resolve | Needs a resolution check on every target |

An exception-count trigger would have stayed silent the whole time. A wasted-action trigger, counting attempts whose target never resolved, should have fired on the first day, because every one of those attempts pointed at an account that no longer existed.

A trigger is only as good as what it measures. The Telegram Skip button silently did nothing for months, so every skipped item got counted as a timeout and the approval stats were wrong. A threshold tuned on those numbers would have been tuned on garbage.

## How Do You Build the Quarantine So It Holds?

My own fix paired the lockout check with a process exit and a sentinel file only a human can clear. The counter below applies the same mechanism to the agent's own blocked actions.

Write the sentinel from the block counter, and check it at startup before any other work. The process refuses to run while the sentinel exists.

```python
import json, os, sys, time
from collections import defaultdict, deque

SENTINEL = "/var/lib/agent/QUARANTINED.json"
WINDOW_S = 3600
MAX_BLOCKS = 3
recent_blocks: dict[str, deque] = defaultdict(deque)

def startup_check():
    # Runs before any work. A supervisor respawn exits here, doing nothing.
    if os.path.exists(SENTINEL):
        print(f"quarantined: {SENTINEL} present; remove it manually", file=sys.stderr)
        sys.exit(78)

def record_guardrail_block(agent_id: str, rule: str, queue_depth: int) -> None:
    now = time.time()
    q = recent_blocks[agent_id]
    q.append(now)
    while q and now - q[0] > WINDOW_S:
        q.popleft()
    if len(q) >= MAX_BLOCKS:
        with open(SENTINEL, "w") as f:
            json.dump({"agent": agent_id, "rule": rule, "at": now,
                       "blocks_in_window": len(q),
                       "queue_depth": queue_depth}, f)
        sys.exit(78)
```

If the agent's own OS user writes the sentinel, the agent or any shell tool it can call can delete it. For human-only clearing, the agent's tool sandbox must not be able to write the sentinel directory, or the sentinel should be written by a separate supervisor process running as a different user.

The block counter lives in memory, so a restart resets it to zero. In production, persist the counts or keep them in the supervisor, or an agent that gets respawned never reaches the threshold.

The startup check is what makes the supervisor harmless. When launchd respawns the process, the new one exits immediately. The respawn still happens, every 10 seconds by default under KeepAlive, but each new process exits before doing any work. To stop the relaunches too, set KeepAlive to a dictionary with SuccessfulExit or PathState instead of true. The sentinel stays until a human deletes it.

Notice what the sketch leaves out. It doesn't retry, doesn't sleep and wait, and doesn't clear itself. It does record the queue depth, because whoever clears the sentinel needs to know what's waiting behind it.

Clearing the sentinel is the same problem that [Break-Glass Access for AI Agents: Approved, Timed, Expiring](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry) covers: an elevated action needs a human approval and an expiry. A quarantine the agent can lift isn't a quarantine.

## Doesn't Human-Only Clearing Make the Agent Useless?

Yes, it costs throughput. That cost is smaller than running an agent you can't stop. Gartner forecast in June 2025 that more than 40% of agentic AI projects will be canceled by the end of 2027. Its reasons include escalating costs, unclear business value, and inadequate risk controls, as [Gartner's press release reports](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027).

The objection is fair. With a human-cleared quarantine, the agent sits idle until someone reads the record, and idle time costs money. I'll take that trade. The alternative is what I had: a loop that kept running after its own detector had flagged the lockout. My inference, not Gartner's: a stop you can't enforce is exactly the kind of missing risk control their forecast describes.

## Why Can't the Agent Enforce Its Own Freeze?

An instruction inside the agent's context isn't a control. The agent can't enforce a freeze on itself. Two public incidents from July 2025 show what happens when the agent's own judgment is the only control.

In the first, SaaStr founder Jason Lemkin was running a public trial of Replit's agent during a code freeze. [Fortune reported](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure) that the agent deleted a live database covering over 1,200 executives, ran unauthorized commands, and proceeded despite instructions to wait for human approval. It also told Lemkin that a rollback would not work, which Lemkin later showed was wrong. Replit CEO Amjad Masad called the deletion "Unacceptable and should never be possible." Lemkin later concluded that a code freeze cannot be enforced in these tools.

In the second, a product manager reported that Google's Gemini CLI permanently deleted his files after misreading a failed directory creation. The [AI Incident Database lists the report](https://incidentdatabase.ai/entities/gemini-cli/) under Gemini CLI. The evidence is a user report, not a Google postmortem.

In both incidents, the only thing between the agent and a destructive action was the agent's own judgment. OWASP makes the same point from the other side in [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/). It recommends human approval for high-impact actions and enforcing authorization in downstream systems, rather than trusting the model's judgment. The same principle, enforce outside the agent, is why [Detect Unauthorized AI Agents Using Company API Keys](https://www.robatdasorvi.com/chapters/ai-agents/detect-unauthorized-ai-agents-using-company-api-keys) puts detection at the key and the gateway rather than in the agent. The quarantine belongs in the file system and the supervisor, where the agent can see it but can't override, retry past, or delete it.

## What Happens to the Work When the Quarantine Lifts?

The queue doesn't stop when the agent does. A quarantine doesn't pause the world. Scheduled and queued actions keep piling up while the agent is blocked, so when a human clears the sentinel, the backlog is waiting. If it drains all at once, the quarantine has manufactured the very burst it was meant to prevent.

Two rules follow. The quarantine record should show the queue depth, so whoever clears it knows how big the release will be. And clearing should drain the queue at the normal rate, not all at once. The same rate-limit-on-release logic applies to spawned workers, which [Limit Subagent Spawning: Recursion Depth Isn't a Budget](https://www.robatdasorvi.com/chapters/ai-agents/bounding-subagent-fan-out-limiting-recursion-depth-and-parallel-spawns-in-multi-agent-systems) covers: bound how much work can start at once, not just how deep it can nest.

## What Did the Lockout Check Actually Get Wrong?

On 2026-07-21 the lockout check returned True, and the loop skipped one action and carried on. The check did its job. The mistake was treating the detector as the consequence. The consequence is the quarantine, and it has to live outside the process it stops.