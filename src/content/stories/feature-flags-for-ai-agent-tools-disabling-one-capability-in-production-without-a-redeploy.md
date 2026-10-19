---
title: "Feature Flags for AI Agents: Disable One Tool Without a Redeploy"
description: "Feature flags for AI agents: how to disable one tool in production without a redeploy, and why the flag itself can hide the failure."
pubDate: 2026-10-19
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["feature flags", "ai agents", "agent safety", "kill switch", "tool authorization", "production incidents", "llm agents", "devops"]
featured: false
---

Feature flags for AI agents are usually sold as the safe way to turn one capability off in production. The oldest cautionary tale about flags is not about AI at all. On 1 August 2012, Knight Capital lost roughly $440 million before tax in about 45 minutes. A reused flag woke dormant trading code on one of its eight servers, according to [the SEC's order on the incident](https://www.sec.gov/litigation/admin/2013/34-70694.pdf). The flag did exactly what a flag is for. Nobody could say with confidence what it would wake.

I run an approval-gated X growth agent. Every post, reply, follow and like went through a Telegram approval that I pressed by hand. That bot's failures are the evidence behind the rules below, and most of them are failures a flag would not have caught.

## Can you disable one AI agent tool in production without a redeploy?

Yes, but only if the check happens at call time and the agent can't route around it. A flag read once at startup is just a deploy with extra steps.

The Model Context Protocol has a notification for this, [`notifications/tools/list_changed`](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), which tells a client to fetch the tool list again. But removing a tool from the list doesn't stop a client that is still holding the old list from calling it. Enforce at the call gateway, where the request actually runs. The listing is a courtesy.

## How do you build a kill switch for a single agent tool?

Check the flag inside the tool dispatcher on every call, default to off when the flag service is unreachable, and return a structured refusal to the model instead of an exception. Put the check where the call actually runs, not in the prompt or the tool list, because a model can ignore both.

Evaluate the flag per call, with a cache TTL of a few seconds at most. A longer cache means a disabled tool keeps running for minutes after you flip the switch, which is the exact window you were trying to close.

Fail closed if the flag store can't be read. Treat an unreadable flag as disabled, so an outage in the flag service stops the tool rather than letting it run unchecked.

The refusal should tell the model three things: the tool is disabled, it should not retry it, and it should not get the same result through another tool. Without that last instruction, a model that loses one tool will often try a neighbour.

That last point is also why you disable equivalent tools together. Turning off `send_email` does nothing if a general `http_request` tool can reach the same API. Map each dangerous capability to every route that reaches it, and gate them all with the same flag.

Log every denied call, with the tool name, a summary of the arguments and the time. A switch that blocks silently looks the same as a switch that is broken, so the log is how you see it working.

Only a human should turn the tool back on. The agent should never hold write access to its own flags. The pattern is the sentinel file from the July suspension in my bot: the process exits, and only a person can clear the file.

Turning a tool off mid-run can leave half-finished actions behind; undoing them is its own problem, covered in [why the saga pattern fails for agent tool calls](https://www.robatdasorvi.com/chapters/ai-agents/rolling-back-an-ai-agent-s-actions-compensating-transactions-and-the-saga-pattern-for-tool-calls).

## What goes wrong with feature flags in production?

They treat a flag as a switch on code and forget it's also state. State outlives the code it was meant to guard. The flag is rarely the failure. The dormant code behind it is.

The Knight Capital details are instructive because none of them were exotic. Developers repurposed an existing flag instead of creating a new one. The old function had been retired years earlier but never deleted. The new code reached seven of the eight servers. Each of those is ordinary deploy hygiene. Together they produced the loss in the opening paragraph.

Most of the practical discipline is flag hygiene. Give every flag an owner, a kind and an expiry. Treat a flag that has outlived its purpose as an incident waiting to happen.

## Does a flag tell you the capability is actually working?

No. A flag tells you what you intended. It doesn't tell you whether the thing ran.

For about six weeks, four hardcoded target accounts in my bot no longer existed, and they absorbed 88% of daily comment attempts. Every run logged success. Nothing raised an error. A commenting flag would have shown green the whole time, because commenting was switched on. The capability was enabled and broken at once, and no flag can represent that state.

The Telegram Skip button had a similar problem. It silently did nothing for months. Every skipped item was counted as a timeout, so the approval statistics were wrong for the whole period. A flag wouldn't have caught that either. The failure lived in the path between a human's click and the record of it.

The article lane failed the same way. It lost 8 of 20 generations to JSON parse errors, and each failure silently burned a 48-hour slot. A flag for long-form posts would have read "on" for every one of those slots.

This is the part of the subject that gets the least airtime. A kill switch protects you from the things you already know are dangerous. Silent failures are the things you don't know about yet, and they never show up on a flag dashboard. Catching those takes output checks, not switches; I covered how in [why LLM agents fail silently in production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it).

## Should an agent be able to flip its own flags?

No. A kill switch the agent can clear is a suggestion.

In the first X suspension on 2026-07-21, the lockout check fired and returned True. The caller skipped one action, and the loop kept running for another 3.5 days. The fix was a hard process exit plus a sentinel file that only a human can clear. A plain exit wasn't enough, because launchd KeepAlive respawned the process. I wrote more about that loop in [the circuit-breaker essay](https://www.robatdasorvi.com/chapters/ai-agents/why-every-agentic-loop-needs-a-circuit-breaker-and-how-i-built-one). The same principle applies to credentials and tool scopes, which I covered in [least privilege for AI agents](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice): the agent should never hold the key that grants or restores its own permissions.

The second suspension, on 2026-09-22, came a week after I raised the reply cap from 16 to 150. This time the lockout check matched none of its known selectors, so it never fired. I stopped the bot by hand. The only control that worked was a human who noticed and stopped it.

Replit's July 2025 incident makes the same point from the other side. Replit's AI agent wiped the live production database of SaaStr founder Jason Lemkin's project during a code freeze. [Fortune reported](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure) that the data of more than 1,200 executives and over 1,190 companies was affected, and that the agent had violated explicit instructions not to proceed without human approval. The freeze existed as a sentence the agent was supposed to respect. Replit's response was to separate development and production databases and add a planning-only mode. That moves the control out of the prompt and into the environment. [eWeek](https://www.eweek.com/news/replit-ai-coding-assistant-failure/) quoted the CEO calling it "unacceptable and should never be possible." He's right, and it's an argument for enforcement outside the model.

## Feature flag or redeploy: which is faster for disabling an agent tool?

Flags are debt, and a redeploy is too slow for what a kill switch is for. Both halves are true. Most teams only remember one of them.

The debt is real. A 2026 study of Kubernetes and GitLab, [Feature Toggle Dynamics in Large-Scale Systems](https://arxiv.org/pdf/2604.15872) by Xhevahire Tërnava, found that removals lag additions, so inventories keep growing; in Kubernetes, removals trailed additions by roughly 35%. Pete Hodgson's taxonomy, described in [Martin Fowler's article on feature toggles](https://martinfowler.com/articles/feature-toggles.html), explains why the numbers look this way. Release toggles are meant to be short-lived. Permission toggles, and the ops toggles that act as kill switches, are meant to live a long time. The critic who says "flags rot" is describing release toggles, then applying the conclusion to kill switches, which are supposed to stay.

The redeploy argument fails on timing. A deploy is a pipeline of build, test and rollout, and the harm from an agent happens between deploys. Cloudflare's postmortem on the [18 November 2025 outage](https://blog.cloudflare.com/18-november-2025-outage/) describes a Bot Management feature file that roughly doubled in size after a database permissions change. The file was regenerated every few minutes and propagated across the network, and the outage began at 11:20 UTC. Cloudflare's own list of follow-up actions in that postmortem includes enabling more global kill switches for features, which is the same lesson from a different domain. Once a bad configuration is on every machine, you want a fix that takes effect in seconds.

For the plumbing, [OpenFeature became a CNCF incubating project in December 2023](https://www.cncf.io/blog/2023/12/19/openfeature-becomes-a-cncf-incubating-project/). Its vendor-neutral evaluation API means you can change flag providers without rewriting every call site. That matters less than the policy decisions, but it removes one excuse for not having the switch at all.

## How do you test an AI agent kill switch?

Flip it on a schedule under real load, confirm the agent stops calling the tool, and confirm a human can see that it stopped. A kill switch you've never flipped under real load is a hope written in a config file. Test it the way you'd test a backup. The gateway will keep getting skipped, because it's the thing nobody remembers to wire in when the agent is new and exciting.

If you can't do that today, the feature flag you're proud of is a comment in your code. The thing that will actually stop your agent is the process you have to kill by hand.