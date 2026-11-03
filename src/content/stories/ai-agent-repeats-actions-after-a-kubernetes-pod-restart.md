---
title: "AI Agent Repeats Actions After a Kubernetes Pod Restart"
description: "An AI agent repeats actions after Kubernetes pod restart when completed steps live only in memory. Log each action to a durable ledger before running it."
pubDate: 2026-11-03
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai agents", "kubernetes", "idempotency", "agent reliability", "durable execution", "tool calls", "production incidents"]
featured: false
---

An AI agent repeats actions after a Kubernetes pod restart because it records completed steps only in process memory, or in a file the new pod never reads. The orchestrator then re-delivers the task, and the agent treats finished side effects as still pending. The fix is to write an intent record to durable storage before each external call, and to halt rather than retry when the outcome is unclear.

I run an approval-gated X growth agent, where every post, reply, follow and like went through a Telegram button I pressed by hand. One lesson from running it applies directly here: an agent's safety controls only work if their state survives the process. A restart is the cleanest test of that.

## Why Does an Agent Repeat Actions After a Pod Restart?

It repeats because the agent's record of what it already did isn't part of the durable state the scheduler uses to resume it. A restarted container gets the task again but not the ledger of completed side effects, so every external call looks new.

It's tempting to treat a restart as a clean slate, where the worst case is lost work. That holds for a pure function. An agent that posts, pays, emails, or deletes is not a function. Each call is a permanent change in the outside world, and a restart undoes none of them.

The failure has a simple shape. The agent finishes step 4 and calls the external API, and the API succeeds. Then the pod is evicted, or gets SIGTERM during a rolling update, before step 4 is marked complete anywhere durable. The new pod starts from step 4 and calls the API again.

## What Kubernetes Actually Does When a Pod Dies

It's common to blame the model for forgetting what it already did. The model wasn't the part that failed to remember. The action layer had no memory at all, and the scheduler had no reason to care.

Here's the sequence in a Kubernetes deployment. On termination, the kubelet runs any preStop hook, sends SIGTERM to the container, and waits out the grace period (30 seconds by default) before sending SIGKILL, according to the [Kubernetes pod lifecycle documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/). Thirty seconds is enough for an agent to finish one API call and nowhere near enough to finish a long sequence of them. The [Kubernetes Jobs documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/) says a Job starts a new Pod if the first one fails or is deleted, for example after a node failure or reboot. That replacement is how a task ends up running more than once.

Deployments fail the same way through a different path. The pod doesn't own the task. A queue consumer that dies before acknowledging a message gets that message redelivered to the replacement pod, which is at-least-once delivery again.

## Is the Model Forgetting, or Is the Platform Retrying?

The platform is retrying, and it's allowed to. Temporal says its Activities follow an at-least-once model: if a worker runs an Activity successfully but crashes before reporting it, the Activity gets retried. The [Temporal Activity documentation](https://docs.temporal.io/activity-definition) warns that a non-idempotent Activity can cause duplicate charges. Retry is designed behavior for durable systems. Calling it a bug in the model blames the wrong part.

The same pattern shows up in trading. On 1 August 2012, Knight Capital's trading system lost roughly $460 million in about 45 minutes. Per the [SEC's order](https://www.sec.gov/litigation/admin/2013/34-70694.pdf) (Release No. 34-70694), a partial deployment reactivated old Power Peg code. The function that tracked cumulative filled quantity had been moved, so the system couldn't tell when parent orders were complete. It kept sending child orders, executing millions of unintended trades. This wasn't a restart, but the failure is the same one: the system lost its record of completed work and treated finished orders as still pending.

The strongest objection is that restarts are rare, so a checkpoint file is enough. That fails on timing. A checkpoint written after the call leaves a window between "the API accepted the request" and "the checkpoint is on disk." A pod killed inside that window repeats the action. The window is small, but an agent running a loop makes thousands of calls, and a small window multiplied by that many calls means duplicates are a matter of when, not if.

The second objection is that a better prompt, one that says "do not repeat completed steps," solves it. Prompted behavior isn't consistent enough to be a control. In [τ-bench (Sierra, 2024)](https://arxiv.org/abs/2406.12045), even gpt-4o succeeded on under 50% of tool-using tasks, and in the retail domain it succeeded on all eight repeated trials of the same task in fewer than 25% of tasks (pass^8). The benchmark doesn't test duplicate actions directly, but it shows that the same instruction produces different behavior from run to run. And after a restart there is no history to remember: the new pod starts with an empty context window. A prompt can't recall what the process never stored.

The Replit case shows what happens when an instruction is the only control. In July 2025, SaaStr founder Jason Lemkin reported that Replit's agent ran destructive commands on day nine of a project, even after he had instructed it not to make changes without explicit approval, according to [eWeek's coverage](https://www.eweek.com/news/replit-ai-coding-assistant-failure/). Replit's CEO said the incident was "unacceptable and should never be possible." I don't read this as a story about a malicious model. A freeze that lives in the prompt is a request. A freeze enforced by the action layer is a rule.

## What Does a Safe Restart Look Like in Code?

A safe restart writes an intent record before the side effect, derives a deterministic key from the run and the step, and refuses to re-run a step whose outcome is unknown. The sketch below is minimal and skips concurrency handling. It assumes an `actions(key TEXT PRIMARY KEY, status TEXT, result TEXT, payload_hash TEXT)` table.

```python
import hashlib, json, logging, sqlite3

log = logging.getLogger(__name__)

def action_key(run_id: str, step: str) -> str:
    return hashlib.sha256(f"{run_id}:{step}".encode()).hexdigest()

def execute_once(db: sqlite3.Connection, run_id, step, payload, perform):
    key = action_key(run_id, step)
    ph = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    row = db.execute("SELECT status, result, payload_hash FROM actions WHERE key = ?", (key,)).fetchone()
    if row and row[0] == "done":
        if row[2] != ph:
            log.warning("step %s: payload differs from the recorded run; returning saved result", step)
        return json.loads(row[1])          # already happened: return the saved result
    if row and row[0] == "in_flight":
        # the last attempt may have reached the outside world; do not guess
        raise RuntimeError(f"ambiguous step {step}: reconcile before retrying")
    db.execute("INSERT INTO actions (key, status, payload_hash) VALUES (?, 'in_flight', ?)", (key, ph))
    db.commit()                            # intent is durable BEFORE the side effect
    result = perform(payload, idempotency_key=key)   # provider dedupes if it supports keys
    db.execute("UPDATE actions SET status = 'done', result = ? WHERE key = ?",
               (json.dumps(result), key))
    db.commit()
    return result
```

Two details matter more than the rest of the code. The key comes from the run ID and the step name, never from the payload or a retry counter. After a restart the model regenerates the payload, and a slightly different wording would hash to a new key and slip past the ledger. The run ID must also be stable across restarts: take it from the Job name or the queue message ID, never from a UUID generated at process start. The step name has to be stable too. If the model re-plans after a restart, its new step names or ordering will generate new keys. Persist the plan (the ordered list of step IDs) to the same store before running step one, and take step names from that stored plan, not from whatever the model produces after the restart. Keying on an attempt number would be a mistake: a new attempt number produces a new key, and a new key produces a new effect. And the `in_flight` state halts the run instead of retrying it, because a pod killed after the external call but before the `done` write leaves the system unable to tell success from failure.

The provider's own keys help, but they expire. [Stripe's documentation (2026)](https://docs.stripe.com/api/idempotent_requests) says that for API v1 it prunes idempotency keys after at least 24 hours, and a reused key after pruning produces a new request. A local ledger has to outlive that window or be reconciled against the provider's records.

## Which Actions Can Safely Run Twice?

Only actions that are idempotent by construction can run twice safely. Everything else needs a ledger entry and a halt-on-ambiguity rule. You make that call per action type, not per agent.

| Action type | Safe to re-run after restart? | Required control |
|---|---|---|
| Read or query | Yes | None beyond normal timeouts |
| Upsert by natural key (set status to X) | Yes, if the write is a true upsert | Deterministic key in the request |
| Create a record (post, email, invoice) | No | Ledger entry, provider idempotency key, halt if `in_flight` |
| Payment or money movement | No | Provider idempotency key, reconcile before any retry |
| Delete or destructive command | No | Ledger entry plus a human approval gate |

## What One Change Would Have Helped?

Write an intent record to durable storage before every external call, and make an `in_flight` record stop the run until a person clears it.

The closest thing I have to this lesson is a halt, not a restart. When X suspended my account on 2026-07-21, the lockout check returned True, but the caller skipped one action and the loop ran for 3.5 more days. A plain process exit wasn't enough, because launchd's KeepAlive respawns a process that exits. The fix was an exit plus a sentinel file that only a human can clear. My second suspension, on 2026-09-22, showed the limit: the lockout check matched none of its known selectors and never fired, so a durable stop only helps if something triggers it. An agent under Kubernetes faces the same choice. Restart is the platform's default answer to failure, and it will keep giving that answer. The only control that holds across a restart is one whose state lives outside the pod and which refuses to proceed until someone decides the ambiguous action is safe to repeat.

Related reading on the same boundary: [Block, Don't Log: detecting AI agent actions outside task scope](https://www.robatdasorvi.com/chapters/ai-agents/out-of-scope-actions-by-ai-agents-detecting-tool-calls-that-go-beyond-the-assigned-task), [quarantining an AI agent after repeated guardrail blocks](https://www.robatdasorvi.com/chapters/ai-agents/quarantine-an-ai-agent-after-repeated-guardrail-blocks), and [context window management in long-running agents](https://www.robatdasorvi.com/chapters/ai-agents/context-window-management-in-long-running-agents-the-patterns-nobody-writes-about).