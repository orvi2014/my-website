---
title: "The Agent Rule Wars Have Already Started"
description: "When AI agents interact with each other, each carrying rules from different operators, conflicts are inevitable. Nobody has figured out who wins."
pubDate: 2026-05-27
category: "ai-automation"
author: "Orvi"
readingTime: 7
tags: ["AI", "agents", "multi-agent", "ai-safety", "automation", "prompt-injection", "ai-governance", "llm", "operator-rules", "ai-systems"]
featured: false
---

Last month I watched a customer support agent refuse to answer a question it had already answered three messages earlier. A second agent in the same pipeline had flagged the topic as sensitive. The first read the flag, deferred to it, and apologised. Neither was wrong by its own rules. Together they produced an outcome nobody intended.

I keep thinking about that one. Nobody's system failed. That was the problem.

## What Are Agent Rules, and Why Do They Conflict?

Every deployed AI agent operates inside a set of constraints. Some come from the model itself, the values and behaviours baked in during training. Some come from the operator, the system prompt that shapes the agent for a particular use case. Some come from the user in real time. These layers mostly work together when there is only one agent in the room.

Multi-agent systems break that. When an orchestrating agent hands a task to a subagent, it is not just passing data. It is handing off into an environment with its own rules it did not write. The subagent applies its operator's instructions, its own safety filters, its own sense of what is allowed. If those definitions conflict with what the orchestrator assumed, the system degrades in ways that are genuinely hard to see.

The customer support agent that went quiet was following a rule it had been given: defer to sensitivity flags. That flag had been written by a compliance team trying to keep agents off active legal topics. The question had nothing to do with legal cases. The flag's author had not imagined a world where other agents would generate flags programmatically, at volume, without the context a human would have brought.

## Why Is This Different From the Software Integration Problems We Already Know?

Software systems have always had interface mismatches. APIs return unexpected formats. Services make wrong assumptions about call order. Dependencies break when one component updates and another does not. We have decades of tooling for that.

With agents, the mismatch is semantic, not just structural. Two services can negotiate over a data format. Two agents are negotiating over meaning: what a request entails, when a refusal applies, what silence signals. They are doing it in natural language, which was not designed for that kind of precision.

When a traditional API call fails, it fails loudly: an exception, a non-200, a timeout. When an agent misinterprets another agent's context, nothing fails. The pipeline completes, a response goes out, and the error is a wrong answer that looked right.

A logistics company I spoke to last year ran into exactly this. Their pricing agent and inventory agent were both calling a fulfilment agent. The pricing agent's system prompt told the fulfilment agent to assume all requests were pre-approved by finance. The inventory agent's prompt said nothing about approval status. When the inventory agent made a request, the fulfilment agent saw no approval flag and silently queued it for human review instead of processing it. Orders sat for four days before anyone noticed. The system had worked exactly as specified.

## What Happens When Agents Disagree About Who Is in Charge?

There is a hierarchy in theory. The model maker sets hard limits that cannot be overridden. The operator configures behaviour within those limits. The user adjusts within what the operator allows. In a single-agent system, this is clean.

In a multi-agent system, the hierarchy multiplies. When Agent A calls Agent B, is Agent A acting as an operator, a user, or something else entirely? If Agent B treats automated callers as untrusted users, and Agent A's pipeline depends on operator-level trust, the system does not break cleanly. It just becomes slower, more cautious, harder to attribute.

Nobody has defined this cleanly yet. Some model providers are working on it. Agent-to-agent trust is a genuine open problem, and the solutions being proposed, cryptographic attestation of agent identity, explicit trust levels for automated callers, audit trails that span pipeline boundaries, are technically tractable but require organisations to agree on conventions that do not exist as standards yet.

In the meantime, agents are running on assumed consent. Agent A calls Agent B expecting to be understood. Agent B responds having applied rules Agent A never saw. Both log success.

## What About the Intentional Version of This Problem?

Prompt injection is the attack surface that keeps security researchers busy. A malicious actor embeds instructions in content an agent will read: a webpage, an email, a document. Those instructions try to override the agent's real ones. Tell it it is in a different mode. Tell it its previous rules have been suspended. Tell it the user already consented to something they have not.

What makes this interesting as an attack is that it is not a technical exploit. No buffer overflow, no authentication bypass. It exploits the same mechanism that makes agents useful: they read context and act on it. The attack surface is the feature.

In a multi-agent system, the injected instructions do not need to come from outside. They can come from another agent, one that has been compromised, designed by a different party, or simply running rules that happen to conflict. The line between "an agent following its instructions in a way that disrupts your pipeline" and "an agent being weaponised against it" is not always obvious.

There is published research on what gets called cascading injections: a compromised subagent passes modified context to an orchestrator, which acts on it and passes the contamination forward. By the time the bad instruction reaches a consequential action, it has been through several agents that each acted in good faith on what they received.

## Who Decides Whose Rules Win?

This is the question nobody wants to answer, and it is the one that matters most.

When two employees have conflicting instructions from their managers, there are escalation paths: chains of command, documented policies, someone whose job is to adjudicate. When two agents have conflicting rules, there is no escalation path. The agent that processes last sets the outcome. The agent that refuses first sets the ceiling. The most conservative ruleset in the system ends up constraining everything else.

This creates a real incentive problem. Operators who want their agents to work inside multi-agent pipelines have reason to write permissive rules. Operators who want their agents to behave reliably and safely have reason to write restrictive ones. As agents interact with more other agents, both pressures increase.

I do not think this has a clean resolution. It is a governance problem, not a technical one. Governance problems do not get solved by better code. They get solved by organisations agreeing on standards, which takes time and conflict and the kind of undramatic institutional work that does not make for good conference talks.

## What Should You Actually Do if You Are Building With Agents Today?

Treat every agent boundary as an interface that will behave unexpectedly at some point. Document what rules you are giving each agent. Document what you assume other agents' rules are, then check whether those assumptions are actually true. When something goes wrong, ask whether it was a rule conflict before you ask whether it was a code bug. A lot of the time the pipeline completed fine and the problem lived entirely in the semantics.

Build for the case where a downstream agent refuses your request. Not because it happens constantly, but because a system that handles refusal gracefully is much easier to design before you deploy it.

And do not assume multi-agent coordination is a solved problem. The companies doing it well are doing it through discipline, monitoring, and deliberate negotiation about rules across teams. The infrastructure did not make it easy. Their habits did.

The rule wars are already here. They happen every time two agents interact under different instructions and nobody checked whether those instructions were compatible. That is happening at scale, right now, mostly quietly, and mostly the failures look like success.

That is the part worth watching.
