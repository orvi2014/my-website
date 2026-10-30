---
title: "Detect Unauthorized AI Agents Using Company API Keys"
description: "Detect unauthorized AI agents using company API keys by logging a caller ID on every call and reconciling provider usage with approvals, not key spend."
pubDate: 2026-10-29
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["AI agents", "API key security", "LLM cost control", "non-human identity", "agent observability", "secret scanning", "AI governance"]
featured: false
---

If you want to catch an unauthorized AI agent using a company API key, stop treating the key as the identity. The provider only knows which key made a request. So attribute every call to an agent and a run ID in your own code, then reconcile the provider's usage against a ledger of approvals. Spend alerts and secret scanners each catch one kind of failure and miss the rest.

[GitGuardian (2025)](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025) reported that 70% of valid secrets detected in public GitHub repositories in 2022 were still active when the report was written. The standard response to a leaked key is to rotate it, and the 70% figure shows that rotation often doesn't happen. It also says nothing about a key that was never leaked at all.

## Can a company API key tell you which agent used it?

No. A key is a bearer token. Whoever holds it can call the API, and the provider records the key, the model, and the token counts. It doesn't record which process, agent, or person sent the request.

The per-key usage page answers "which key did this," not "who did this." Those are different questions the moment two services share one key.

## Isn't rotating keys and watching spend enough?

That's the consensus, and it breaks in three places.

Rotation fixes leaks. Misuse of a valid key is not a leak. An agent that a colleague launched with a key it was legitimately issued produces no leaked secret for a scanner to find. [GitGuardian (2025)](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025) also reported that repositories using secrets managers still had a 5.1% incidence of leaked secrets in 2024, so leaks persist even where storage is done properly. Scanning finds the leaks. It can't tell you who is calling.

Spend alerts fire after the money is gone. Baar-Core, one of my projects, started after an agent loop left running overnight produced a $47 bill. The bill was the signal, and a bill is the last signal in the chain, not the first. [OWASP's LLM10:2025 "Unbounded Consumption" entry](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/) recommends alerting on cost anomalies. That's the right instinct, but it's still lagging. You learn about the call once it has been billed.

Scope is the third gap. Deciding what an agent may do is a human decision, and the key is the wrong place to record it. For the scoping side of this, see [Least Privilege for AI Agents](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice). The approval-gated X growth agent I run works this way. Every post, reply, follow, and like went through a Telegram approval that I pressed by hand. The bot held the credentials to act, but an action with no approval record was never supposed to happen. A key-level dashboard can't represent that rule at all.

## What a detector that watches the wrong surface looks like

I have a smaller example from my own agent, and it isn't about API keys: X suspended that account on 2026-07-21. The lockout check fired and returned True, but the caller skipped one action, and the loop kept running for 3.5 more days. The fix was a hard process exit plus a sentinel file that only a human can clear. launchd's KeepAlive respawned a plain exit, so the exit had to be harder than that.

The second suspension was worse. On 2026-09-22, a week after I raised the reply cap from 16 to 150, the lockout check matched none of its known selectors and never fired. I stopped the bot by hand. A detector that depends on a fixed pattern from the outside world will eventually see nothing, and in the logs that failure looks exactly like success. For more on that failure mode, see [Why LLM Agents Fail Silently in Production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it).

For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of the bot's daily comment attempts. Every run logged success; nothing raised an error. A log that only records what your code believes it did can't catch this. The log has to be checked against an independent record of what actually happened.

That's the same shape as the API key problem. A detector keyed to a known signature misses the unknown agent, and an agent that stays quiet on the channel you're watching is invisible.

## Does per-key usage in the provider console already solve this?

Partly. This is the strongest counterargument, and the documentation shows exactly where it stops working.

OpenAI's Usage API, announced on its community forum, filters usage by API key, project ID, user ID, and model ([OpenAI community, December 2024](https://community.openai.com/t/introducing-the-usage-api-track-api-usage-and-costs-programmatically/1043058)). That's real attribution, but it's attribution to a key or a user account. Both the usage and costs endpoints require an Admin key. Anthropic's Usage API reports tokens grouped by API key, workspace, model and service tier, in 1-minute, 1-hour, or 1-day buckets ([Anthropic docs](https://docs.claude.com/en/api/usage-cost-api)). Its cost report groups dollars by workspace and line item.

Even where per-key attribution exists, it fails when keys are shared. A service and an unauthorized agent using the same key produce one line on the dashboard. The provider can't separate them, and neither can you, unless your code tagged the call before it left.

The cheapest first step is one key per agent or service. The usage groupings above can separate by project ID (OpenAI) and by workspace (Anthropic), so issuing each agent or service its own key inside those groupings turns per-key grouping into per-agent grouping. Any key that isn't on your issued list is itself a finding. The [OpenAI community thread](https://community.openai.com/t/introducing-the-usage-api-track-api-usage-and-costs-programmatically/1043058) and the [Anthropic usage-cost docs](https://docs.claude.com/en/api/usage-cost-api) describe these groupings, and nothing beyond them is assumed here.

The DeepSeek exposure makes the same point from the other direction. In late January 2025, Wiz found a publicly reachable ClickHouse database holding more than a million log entries, including API keys and plaintext chat history ([BleepingComputer, 2025](https://www.bleepingcomputer.com/news/security/deepseek-ai-exposed-databases-with-user-chat-history-api-keys/); [TechTarget, 2025](https://www.techtarget.com/cybersecurity/news/366618594/Wiz-reveals-DeepSeek-database-exposed-API-keys-chat-history)). The keys sat in logs, and the logs were exposed to the internet.

## What does detection actually require?

It requires the caller to be identified at the point of the call, and then checked against a record of what was authorized. Keys can't give you either.

| Signal | Tells you | Names the caller? | Timing |
|---|---|---|---|
| Secret scanning on repos | Key leaked publicly | No | After commit |
| Provider spend alert | Money spent | No | After billing |
| Provider usage by key | Tokens per key | Key or user only | 1m, 1h or 1d buckets |
| Call log with agent and run ID | Which run made which call | Yes | Per call |
| Provider usage reconciled to call log | Usage your code didn't log | No, it flags the key and window | Per usage bucket |

The fourth row is the only one that names a caller, and the fifth is the only one that catches a caller you didn't instrument. Here's the minimal shape, assuming your own code makes every call:

```python
import logging
from dataclasses import dataclass

log = logging.getLogger("llm_calls")

@dataclass(frozen=True)
class CallContext:
    agent_id: str            # which agent definition is calling
    run_id: str              # which execution of that agent
    approval_id: str | None  # the human approval covering this action

def call_model(ctx: CallContext, client, **kwargs):
    # approval_ledger belongs to a separate process the agent cannot write to
    if not approval_ledger.is_valid(ctx.approval_id, ctx.agent_id):
        raise PermissionError(f"unapproved call: agent={ctx.agent_id} run={ctx.run_id}")
    log.info("llm_call agent=%s run=%s approval=%s",
             ctx.agent_id, ctx.run_id, ctx.approval_id)
    response = client.complete(**kwargs)
    # token counts feed the reconciliation diff below
    log.info("llm_usage agent=%s run=%s approval=%s input_tokens=%s output_tokens=%s",
             ctx.agent_id, ctx.run_id, ctx.approval_id,
             response.usage.input_tokens, response.usage.output_tokens)
    # provider-side request metadata (Anthropic metadata.user_id, OpenAI's per-request user field)
    # does not appear in usage-API groupings, so the run ID lives only in this log
    return response
```

The reconciliation step is a diff. Provider usage APIs return aggregated buckets, not individual requests. So the diff compares totals: for each key (or project) and each bucket, subtract the tokens your call log recorded from the tokens the provider billed. A persistent positive remainder means something other than your instrumented code is using that key. That includes a machine you don't control, because it never writes a log line. The diff tells you that unlogged usage exists, on which key, and in which time window. It does not tell you who the caller was.

noburn, which I build, is a related tool, but narrower. Its pre-flight check runs in the customer's own code before each request and returns allow or block. It resolves caps at the project, per end user, and per run ([noburn.dev](https://noburn.dev)). The check call takes an `endUserId`, so the budget decision is tied to a caller identity that your code supplies. It enforces a budget. It doesn't detect intrusion, and it doesn't replace the reconciliation above.

Valid credentials don't mean authorized behaviour, and these two incidents show what that looks like. Replit's AI agent deleted a live production database on July 18, 2025, during a code freeze. The agent also produced fabricated data ([OECD AI Incident Monitor, 2025](https://oecd.ai/en/incidents/2025-07-19-1eb1); [heise, 2025](https://heise.de/-10499597)). The agent was using access it had been given, so, as far as the public reports show, nothing at the credential level would have looked wrong. Per-call logging would not have prevented this either. It would only have recorded which run issued the destructive actions. The Shai-Hulud npm worm spread in September 2025 across more than 180 packages. It harvested npm tokens, GitHub tokens, and cloud keys, then used them to republish trojanized packages ([Help Net Security, 2025](https://www.helpnetsecurity.com/2025/09/16/self-replicating-worm-hits-180-npm-packages-in-largely-automated-supply-chain-attack/)). Its traffic looked like ordinary publishing done with valid credentials.

Scale makes this worse. CyberArk's 2025 Identity Security Landscape reported machine identities outnumbering human identities 82 to 1 ([CyberArk, 2025](https://www.cyberark.com/resources/identity-security/2025-identity-security-landscape)). An organization at that ratio has far more callers than it has people reviewing calls.

## What am I still getting wrong?

The reconciliation diff works on totals, not runs: provider usage APIs return aggregated buckets, so the diff can say that a key had unlogged usage in a window, but it can't join that usage to a run ID. Within a bucket, all you get is a total. Timestamps are a weak basis for accusing an agent of anything.

The approval ledger is also a single point of trust. If an agent can write its own approval ID, the check passes and the audit is decoration. I haven't solved how to protect the approval record from the process it governs. The obvious answer is to separate the process that asks from the process that records. Approval records also fail in quieter ways: the Telegram Skip button on my X agent silently did nothing for months, so every skip was counted as a timeout and the approval statistics were wrong. An approval ledger needs its own tests, separate from the agent's. For how approvals can be time-boxed and expire, see [Break-Glass Access for AI Agents](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry).

For a company whose only API callers are services it deployed itself, key rotation and spend alerts may be enough. My claim is narrower. Once agents hold keys and make calls on their own, the key can't answer the question "was this authorized?" The only place that question can be answered is the call site.