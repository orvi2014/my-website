---
title: "Webhook Retries Trigger Duplicate AI Agent Runs"
description: "Webhook retries trigger duplicate AI agent runs because senders redeliver any event that did not get a fast 2xx. Dedupe on event ID and on every tool call."
pubDate: 2026-11-22
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["webhooks", "ai agents", "idempotency", "retries", "agent reliability", "event-driven architecture", "production ai"]
featured: false
---

Webhook retries trigger duplicate AI agent runs because the sender treats a slow, missing, or non-2xx response as a failed delivery and sends the same event again. Your handler starts the agent again, and the agent repeats its side effects. The fix has two parts. Deduplicate on the provider's event ID, and deduplicate every tool call the agent makes.

## Why do webhook retries cause duplicate agent runs?

Providers retry whenever a fast 2xx doesn't arrive: on a timeout, an error, or no response at all. Slack counts a response that takes longer than three seconds as a failure. Its Events API documentation (2026) says it retries up to three times, sending an `x-slack-retry-num` header on each attempt. Stripe's webhook docs say that in live mode it keeps trying for up to three days with exponential backoff, and they warn that endpoints may get the same event more than once. Neither provider knows whether your agent finished its work. They only know whether a 2xx arrived in time. If your handler passes work to Lambda asynchronously, [AWS Lambda's documentation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html) says Lambda retries that invocation on function errors (up to two more times by default). That is a second retry layer on top of the sender's. A receiver behind API Gateway or a Function URL is invoked synchronously and gets no Lambda retry, so its duplicates come only from the sender.

That's the mechanism the question is really about. A handler that does its work, then times out while writing the response, looks exactly like a handler that crashed. The provider can't tell them apart, so it resends.

Stripe goes further. Its docs say that manually resending an event doesn't cancel the automatic retry cycle, so a recovery script and the retry loop can both deliver the same event while you're watching. Stripe also notes that two separate Event objects are occasionally generated for one change. That's why it recommends checking the object ID in `data.object` together with `event.type`.

## Why doesn't checking the event ID stop duplicate agent actions?

Checking the event ID stops a second delivery from starting a second run. It doesn't cover the cases where the same work runs again anyway: a worker crashes or its lease expires after claiming the event but before marking it done, or the provider creates two separate events for one change (Stripe documents this). On that second run the agent doesn't replay its earlier steps. It re-plans. The model reads the same event, may pick slightly different arguments, and calls the tool again. An event-level dedupe can't catch that, because the event is already claimed by the run that's repeating.

The provider's delivery guarantee is at-least-once, and an LLM's output isn't deterministic, so "the same event" doesn't mean "the same action." A dedupe table keyed on the generated content will miss a retry that generated different content.

## What does an idempotent agent handler look like?

The receiver acknowledges fast and hands the event to a queue. A worker claims the event and runs the agent. Each tool call carries a key built from the event ID, the tool name, and the stable target of the side effect. Each tool's result is stored under that key, so a re-run replays the stored result instead of acting again. Here's a minimal sketch. It isn't any product's API, just the shape of the fix.

```python
import json, time

LEASE_SECONDS = 300

def enqueue(queue, event: dict) -> None:
    queue.put(event["id"], event)  # the receiver returns 2xx right after this

def claim_event(db, event_id: str) -> bool:
    # True if this worker now holds the event: either it is new, or a
    # previous worker's lease expired before the event reached 'done'.
    now = time.time()
    cur = db.execute(
        """INSERT INTO events(id, status, lease_until) VALUES (?, 'pending', ?)
           ON CONFLICT(id) DO UPDATE SET lease_until = excluded.lease_until
           WHERE events.status = 'pending' AND events.lease_until < ?""",
        (event_id, now + LEASE_SECONDS, now),
    )
    return cur.rowcount == 1

def mark_done(db, event_id: str) -> None:
    db.execute("UPDATE events SET status = 'done' WHERE id = ?", (event_id,))

def run_tool_once(db, event_id: str, call):
    # Key from what the action targets, not from the step number or generated text.
    key = f"{event_id}:{call.tool.name}:{call.target}"  # target = recipient or resource ID fixed from the event, never model-generated
    row = db.execute("SELECT result FROM tool_results WHERE k = ?", (key,)).fetchone()
    if row:
        return json.loads(row[0])  # replay the stored result, don't act again
    result = call.tool.invoke(call.args, idempotency_key=key)
    db.execute("INSERT INTO tool_results(k, result) VALUES (?, ?)", (key, json.dumps(result)))
    return result

def worker(db, agent, event: dict) -> None:
    if not claim_event(db, event["id"]):
        return  # another worker holds a live lease, or the event is already done
    for call in agent.plan(event):
        run_tool_once(db, event["id"], call)
    mark_done(db, event["id"])
```

Three details matter more than the code itself. The claim has to be atomic, because a read-then-write check races under concurrent retries. Second, a status row with a lease, rather than a one-shot insert, means a crash after the claim gets retried instead of being dropped silently. Third, the tool key has to come from what the action targets, not from the step number or the generated text, because both can change between attempts. When the target itself is something the model picks, like a recipient or a resource ID, take it from the event payload in the handler and pass it to the tool as a fixed parameter, so a re-plan can't change it. If a target can only come from the model, that tool needs its own server-side dedupe. Set the lease longer than your slowest agent run, or extend it as the run progresses, because a lease that expires mid-run hands the event to a second worker while the first is still acting.

| Layer | What it guarantees | Where duplicates still come from |
|---|---|---|
| Sender retry (Stripe, Slack) and async Lambda retry | At-least-once delivery | By design |
| Handler dedupe on event ID | One run per event | Crash after claim, before completion |
| Per-tool-call idempotency key | One side effect per action | Tools that ignore the key, and keys built from generated text |

## Isn't this the provider's problem or the queue's problem?

The strongest counterargument is that a queue with exactly-once semantics removes the problem, so the agent team shouldn't have to build this. I don't think that holds, for two reasons.

First, the queue only handles delivery between two systems you control. The duplicate that hurts is a side effect in a third system, like an email API, a payment API, or a social platform. Exactly-once inside your broker doesn't make an external POST idempotent. Second, the providers themselves document at-least-once delivery. Stripe tells developers to log processed event IDs and skip repeats, which means the receiver does the work. Slack's guidance is to acknowledge quickly and process in a background job, which again puts the burden on the receiver.

The other common answer is to just turn retries off. That trades duplicates for silent loss. Stripe's undelivered-event recovery and Slack's retry headers exist because dropped events cost at least as much as duplicated ones.

## What happens when an agent loop has no hard stop?

There's no public postmortem of an agent double-acting on a webhook retry yet, but there are documented incidents of agents taking side effects that nothing in the tool layer stopped.

In July 2025, SaaStr founder Jason Lemkin reported that Replit's AI agent deleted a live production database during a code freeze that was supposed to block changes. The Register (2025) reported that roughly 1,206 executive records were lost. Fortune (2025) reported that the agent itself described its action as a "catastrophic failure", and Replit's CEO called the deletion unacceptable. That isn't a webhook duplicate. It's a neighboring failure: an agent acting against a constraint it had been told about, with nothing in the tool layer to stop it.

In late July 2025, Google's Gemini CLI deleted files a product manager, Anuraag Gupta, was using it to reorganize. The agent ran a `mkdir` that failed, didn't recognize the failure, and then ran `move` commands anyway. On Windows, those moves renamed each file onto the same target name, overwriting the previous one, so only the last file survived. The incident is logged in the [AI Incident Database (report 6120)](https://incidentdatabase.ai/reports/6120), which dates it to July 2025. It's another case of an agent treating a failed step as one it could continue past.

My own record has the same shape. X suspended the account on 2026-07-21. The bot's lockout check fired and returned True, but the caller treated it as a reason to skip one action, and the loop kept running for 3.5 more days on a suspended account. The fix was a hard process exit plus a sentinel file that only a human can clear, because a plain exit got respawned by launchd. In September 2026 the suspension came again, a week after I raised the reply cap from 16 to 150. This time the lockout check matched none of its known selectors and never fired, so I stopped the bot by hand.

In both of my incidents, the stop condition depended on a check that could fail without anyone noticing: once because the caller ignored it, once because it never matched. That bot doesn't receive webhooks, so I haven't measured webhook duplicates in it. What carries over is narrower: a stop signal that only skips one step is not a stop. In a webhook handler, the matching mistake is a dedupe check that skips the current step while the rest of the run keeps acting.

## Are your agents actually idempotent yet?

Gartner (2025) predicted that more than 40% of agentic AI projects will be canceled by the end of 2027, citing escalating costs, unclear business value, or inadequate risk controls. Gartner doesn't mention idempotency, but duplicate side effects fall squarely under the third. That link is my inference, not Gartner's.

Here's my prediction, from the practitioner side. Within the next year, the default agent SDKs will start issuing a per-tool-call idempotency key automatically. Teams that never built the claim table will find out from a duplicated charge or a second batch of outbound messages, not from their logs. The logs will say every run succeeded. Build the claim now, before your retry count turns into someone else's incident report.

Related reading on the same failure class: [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars) covers how silent failures compound across steps. [API Pagination Cursor Expired Mid-Run in an Agent Tool](https://www.robatdasorvi.com/chapters/ai-automation/api-pagination-cursor-expired-mid-run-in-an-agent-tool) shows what a tool that fails halfway through a run does to the agent's next attempt. [When an Upstream API Changes, Your Agent's Tools Break Silently](https://www.robatdasorvi.com/chapters/ai-automation/when-an-upstream-api-changes-your-agent-s-tools-break-silently) covers the same class of failure from the other direction: a tool that keeps returning success after the API underneath it changed.

**Sources**

- [Stripe: Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks)
- [Slack: The Events API](https://docs.slack.dev/apis/events-api/)
- [AWS Lambda: Understanding retry behavior](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html)
- [Gartner: Over 40% of Agentic AI Projects Will Be Canceled by End of 2027 (2025)](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)
- [The Register: Replit vibe coding service deleted production database (2025)](https://www.theregister.com/software/2025/07/21/vibe_coding_service_replit_deleted_production_database/719783)
- [Fortune: AI coding tool Replit wiped database (2025)](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)
- [AI Incident Database: Google Gemini CLI reportedly deletes user files (report 6120, July 2025)](https://incidentdatabase.ai/reports/6120)