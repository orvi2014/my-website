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

Last month I watched a customer support agent refuse to answer a question it had already answered three messages earlier. The second time around, a different agent in the same pipeline had added a note to the conversation flagging the topic as sensitive. The first agent read the flag, deferred to it, and apologised to the user for not being able to help. Neither agent was wrong by its own rules. Together they produced an outcome nobody intended.

This is not a story about AI failing. It is a story about what happens when AI succeeds — when multiple agents, each following their instructions correctly, interact with each other in ways their designers never anticipated.

## What Are Agent Rules, and Why Do They Conflict?

Every deployed AI agent operates inside a set of constraints. Some come from the model itself — the values and behaviours baked in during training. Some come from the operator — the system prompt that shapes the agent for a particular use case. Some come from the user in real time. These layers are designed to work together, and mostly they do, when there is only one agent in the room.

Multi-agent systems break that assumption. When an orchestrating agent hands a task to a subagent, it is not just passing data — it is passing context into an environment that has its own rules it did not author. The subagent will apply its own operator's instructions, its own safety filters, its own definitions of what it is and is not allowed to do. If those definitions conflict with what the orchestrator expected, the system degrades in ways that are very hard to observe from the outside.

The customer support agent that went quiet was following a rule it had been given: defer to sensitivity flags. The flag had been written by a compliance team trying to prevent an agent from discussing active legal cases. The question being asked had nothing to do with legal cases. The flag's author had not imagined a world where other agents would generate flags programmatically, at volume, without the context a human would have applied.

## Why Is This Different From the Software Integration Problems We Already Know?

Software systems have always had interface mismatches. APIs return unexpected formats. Services make assumptions about call order. Dependencies break when one component updates and another does not. We have decades of tooling for managing this.

The difference with agents is that the mismatch is not just structural — it is semantic. Two services can negotiate over a data format. Two agents are negotiating over meaning: what a word implies, what a request entails, what a refusal communicates. And they are doing it in natural language, which was not designed for precision.

When a traditional API call fails, it fails loudly — an exception, a non-200 status code, a timeout. When an agent misinterprets another agent's context and acts on that misinterpretation, nothing fails. The pipeline completes. A response is generated. The error is a wrong answer that looks like a right one.

A logistics company I spoke to last year ran into exactly this. Their pricing agent and their inventory agent were both calling a fulfilment agent. The pricing agent's system prompt told the fulfilment agent to assume all requests were pre-approved by finance. The inventory agent's system prompt said nothing about approval status. When the inventory agent made a request the fulfilment agent interpreted as unapproved — because it had no approval flag — the fulfilment agent silently queued the request for human review instead of processing it. Orders sat in a queue for four days before anyone noticed. The system had worked exactly as specified.

## What Happens When Agents Disagree About Who Is in Charge?

There is a hierarchy in theory. The model maker sets hard limits that cannot be overridden. The operator configures behaviour within those limits. The user adjusts within what the operator allows. In a single-agent system, this hierarchy is clean.

In a multi-agent system, the hierarchy multiplies. When Agent A calls Agent B, is Agent A acting as an operator, a user, or something else entirely? If Agent B's instructions tell it to treat all automated callers as untrusted users, and Agent A's pipeline depends on Agent B treating it with operator-level trust, the system breaks — not with an error, but with degraded, cautious behaviour that is hard to attribute and harder to debug.

The honest answer is that nobody has defined this cleanly yet. Some model providers are working on it. Agent-to-agent trust is a genuine open problem in the field, and the solutions being proposed — cryptographic attestation of agent identity, explicit trust levels for automated callers, audit trails that span pipeline boundaries — are technically tractable but organisationally complex. They require the teams deploying agents to agree on conventions that do not yet exist as standards.

In the meantime, agents are interacting under a kind of assumed consent. Agent A calls Agent B expecting to be understood. Agent B responds having applied rules Agent A did not know about. Both report success.

## What About the Intentional Version of This Problem?

Prompt injection is the attack surface that keeps security researchers busy. A malicious actor embeds instructions in content that an agent will read — a webpage, an email, a document — and those instructions attempt to override the agent's real instructions. Tell the agent it is now in a different mode. Tell it its previous rules have been suspended. Tell it the user has already consented to something they have not.

What makes prompt injection interesting as an attack is that it is not a technical exploit in the traditional sense. It does not overflow a buffer or bypass an authentication check. It exploits the same mechanism that makes agents useful — their ability to read context and act on it. The attack surface is the feature.

In a multi-agent system, prompt injection becomes a different kind of problem. Now the malicious instructions do not need to come from external content. They can come from another agent — one that has been compromised, or one that was designed by a different party with different interests, or one that is simply operating under rules that happen to conflict. The line between "an agent following its instructions in a way that disrupts your pipeline" and "an agent being weaponised against your pipeline" is not always obvious.

A research team at a major university published a paper last year describing what they called cascading injections — scenarios where a compromised subagent passes modified context up to an orchestrator, which then acts on that context and passes the contamination forward to other agents in the system. By the time the contaminated instruction reaches a consequential action, it has been laundered through several agents that each acted in good faith on what they received.

## Who Decides Whose Rules Win?

This is the question nobody is comfortable answering, and it is the one that matters most.

When two human employees have conflicting instructions from their respective managers, organisations have escalation paths — chains of command, documented policies, people whose job it is to adjudicate. When two agents have conflicting rules, there is no escalation path. The agent that processes last sets the outcome. The agent that refuses first determines the ceiling. The agent with the most conservative rules for ambiguous cases will, over time, constrain what the whole system can do.

This creates a subtle incentive problem. Operators who want their agents to work well inside multi-agent systems have reason to make their rules as permissive as possible, so that their agent does not become the bottleneck. Operators who want their agents to be reliable and safe have reason to make their rules as restrictive as possible. The more agents interact, the stronger the pressure on both sides.

I do not think this resolves into a simple answer. It is genuinely a governance problem — not a technical one — and governance problems do not get solved by better code. They get solved by organisations agreeing on standards, which takes time and conflict and the kind of boring institutional work that does not generate conference talks.

## What Should You Actually Do if You Are Building With Agents Today?

Treat every agent boundary as an interface that can and will behave unexpectedly. Document the rules you are giving each agent. Document what you assume other agents' rules are, and audit whether those assumptions are true. When something goes wrong, check whether the failure was a rule conflict before you check whether it was a code bug — in a lot of cases, the pipeline completed without error, and the problem lived in the semantics.

Design for the case where a downstream agent refuses your request. Not because it will always happen, but because building a system that degrades gracefully when it does is much easier before you have deployed than after.

And hold lightly the assumption that multi-agent coordination is a solved problem. It is not. The companies that are handling it well are handling it through discipline and monitoring and explicit negotiation about rules across teams — not because the infrastructure made it easy.

The rule wars are not a future threat. They are what happens every time two agents interact under different instructions and nobody checked whether the instructions were compatible. That is happening at scale, right now, mostly quietly, and mostly the failures look like success.

That is the part worth paying attention to.
