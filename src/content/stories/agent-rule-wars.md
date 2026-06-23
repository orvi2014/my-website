---
title: "Multi-Agent AI: Why Silent Failures Produce Wrong Answers That Look Right"
description: "Agent rule conflicts cause multi-agent pipelines to fail silently. Here's what breaks when multiple AI agents share one system and can't see it."
pubDate: 2026-05-27
category: "ai-automation"
author: "Orvi"
readingTime: 8
tags: ["ai", "agents", "multi-agent", "ai-safety", "automation", "prompt-injection", "ai-governance", "llm"]
featured: false
---

Last month I watched a customer support agent refuse to answer a question it had already answered three messages earlier. A second agent in the same pipeline had flagged the topic as sensitive. The first read the flag, deferred to it, and apologised. Neither agent was wrong by its own rules. Together they produced an outcome nobody intended.

I keep thinking about that one. Nobody's system failed. That was the problem.

## Why agent rules conflict in multi-agent pipelines

Agent rules conflict because each agent carries constraints from a different source, and those constraints were written without knowledge of each other.

Every deployed AI agent operates inside a set of constraints. Some come from the model itself, values and behaviours baked in during training. Some come from the operator, the system prompt that shapes the agent for a specific use case. Some come from the user in real time. These layers mostly work together when there is only one agent in the room.

Multi-agent systems break that. When an orchestrating agent hands a task to a subagent, it is not just passing data. It is handing off into an environment with its own rules it did not write. The subagent applies its operator's instructions, its own safety filters, its own sense of what is allowed. If those definitions conflict with what the orchestrator assumed, the system degrades in ways that are genuinely hard to see.

Gartner projected in late 2024 that 33% of enterprise software applications will include agentic AI by 2028, up from less than 1% that same year. Most of those deployments will involve multiple agents sharing pipelines neither was designed for. The number of cross-agent rule collisions in production is growing faster than the frameworks to manage them.

The customer support agent that went quiet was following a rule it had been given: defer to sensitivity flags. That flag had been written by a compliance team trying to keep agents off active legal topics. The question had nothing to do with legal cases. The flag's author had not imagined a world where other agents would generate flags programmatically, at volume, without the context a human would have brought.

## How multi-agent failures differ from ordinary software bugs

The difference is semantic, not structural. Traditional software mismatches fail loudly. Agent mismatches fail silently, producing wrong answers that look right.

Software systems have always had interface mismatches. APIs return unexpected formats. Services make wrong assumptions about call order. Dependencies break when one component updates and another does not. We have decades of tooling for that.

With agents, the mismatch is about meaning: what a request entails, when a refusal applies, what silence signals. They work it out in natural language, which was not designed for that kind of precision.

When a traditional API call fails, it fails loudly. An exception. A non-200. A timeout. When an agent misinterprets another agent's context, nothing fails. The pipeline completes, a response goes out, and the error is a wrong answer that looked right.

A logistics company I spoke to last year ran into exactly this. Their pricing agent and inventory agent were both calling a fulfilment agent. The pricing agent's system prompt told the fulfilment agent to assume all requests were pre-approved by finance. The inventory agent's prompt said nothing about approval status. When the inventory agent made a request, the fulfilment agent saw no approval flag and silently queued it for human review instead of processing it. Orders sat for four days before anyone noticed. The system had worked exactly as specified.

This is what makes multi-agent failures so costly to find. There is no stack trace. The failure does not announce itself. You find it four days later when someone asks why the queue is full.

## What happens when agents disagree about who is in charge

Nobody has formally defined the trust hierarchy between agents yet. Every multi-agent system is currently making it up.

There is a hierarchy in theory. The model maker sets hard limits that cannot be overridden. The operator configures behaviour within those limits. The user adjusts within what the operator allows. In a single-agent system, this is clean.

In a multi-agent system, the hierarchy multiplies. When Agent A calls Agent B, is Agent A acting as an operator, a user, or something else entirely? If Agent B treats automated callers as untrusted users and Agent A's pipeline depends on operator-level trust, the system does not break cleanly. It just becomes slower, more cautious, harder to attribute.

Anthropic's guidance on multi-agent orchestration acknowledges this directly: [subagents should behave safely regardless of the instruction source](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/multi-agent-orchestration), and should refuse requests from orchestrators that would violate their principles. That is the right instinct. The problem is that "safe" means something different depending on who wrote the rules. One operator's safe default is another operator's pipeline blocker.

The solutions being proposed, cryptographic attestation of agent identity, explicit trust levels for automated callers, audit trails that span pipeline boundaries, are technically possible. But they require organisations to agree on conventions that do not exist as standards yet. Until they do, agents run on assumed consent. Agent A calls Agent B expecting to be understood. Agent B responds having applied rules Agent A never saw. Both log success.

## How prompt injection exploits multi-agent pipelines

Prompt injection works because agents are designed to read context and act on it. The attack surface is the feature itself.

A malicious actor embeds instructions in content an agent will read: a webpage, an email, a document. Those instructions try to override the agent's real ones. Tell it it is in a different mode. Tell it its previous rules have been suspended. Tell it the user already consented to something they have not.

No buffer overflow, no authentication bypass. The attack exploits the same mechanism that makes agents useful.

In a multi-agent system, the injected instructions do not need to come from outside. They can come from another agent, one that has been compromised, designed by a different party, or simply running rules that happen to conflict.

This is not theoretical. Kai Greshake and colleagues published a paper in 2023 documenting exactly this class of attack in real deployed systems, calling them [indirect prompt injection attacks](https://arxiv.org/abs/2302.12173). They demonstrated that instructions embedded in external content, a web page an agent retrieves, an email it reads, could reliably hijack agent behaviour across multiple production systems without any direct access to the underlying infrastructure.

OWASP's LLM Top 10 v1.1, updated in 2025, [still ranks prompt injection first among risks for LLM applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

In a multi-agent pipeline, the attack compounds. A compromised subagent passes modified context to an orchestrator, which acts on it and passes the contamination forward. By the time the bad instruction reaches a consequential action, it has been through several agents that each acted in good faith on what they received. The contamination looks like normal context at every step.

The line between "an agent following its instructions in a way that disrupts your pipeline" and "an agent being weaponised against it" is genuinely blurry. The Greshake paper is worth reading if you are building anything that retrieves external content into an agent context. It is not comfortable reading.

## Who controls rule conflicts, and who takes the blame

Right now, the most conservative ruleset in a system wins by default. Nobody explicitly chose that.

When two employees have conflicting instructions from their managers, there are escalation paths: chains of command, documented policies, someone whose job is to adjudicate. When two agents have conflicting rules, there is no escalation path. The agent that processes last sets the outcome. The agent that refuses first sets the ceiling. The most conservative ruleset ends up constraining everything else, not because anyone decided that was right, but because refusals propagate and approvals do not.

Operators who want their agents to work inside multi-agent pipelines have reason to write permissive rules. Operators who want their agents to behave reliably have reason to write restrictive ones. As agents interact with more other agents, both pressures grow. They do not resolve.

Accountability disappears into that gap. When something goes wrong in a multi-agent system, who is responsible? The operator who wrote the conflicting rules? The model provider whose defaults produced the unexpected behaviour? The engineer who connected the two systems without checking whether their rules were compatible? Current frameworks do not have clean answers. They tend to get resolved after the fact, by whoever is closest to the incident when it surfaces. That is not governance. That is blame allocation.

I do not think this has a clean resolution. It is a governance problem, not a technical one. Governance problems do not get solved by better code. They get solved by organisations agreeing on standards, which takes time and conflict and the kind of undramatic institutional work that does not make for good conference talks.

The EU AI Act (2024) and the NIST AI Risk Management Framework both push toward documentation of AI system behaviour across organisational boundaries, but neither specifies how multi-agent rule conflicts should be resolved between operators. The [NIST AI RMF](https://airc.nist.gov/Docs/1) is genuinely useful for structuring how you think about this, even if it does not hand you a solution.

## How to prevent multi-agent failures in production

Document every boundary. Test what happens when a downstream agent refuses. Do not assume the pipeline will behave the way you think.

Treat every agent boundary as an interface that will behave unexpectedly at some point. Document what rules you are giving each agent. Document what you assume other agents' rules are, then check whether those assumptions are actually true. When something goes wrong, ask whether it was a rule conflict before you ask whether it was a code bug. A lot of the time the pipeline completed fine and the problem lived entirely in the semantics.

A few things I tell teams building these systems:

Map every agent in your pipeline and write down what each one is explicitly told to refuse or defer on. Then compare those lists across agent boundaries. Conflicts you can see before deployment are free to fix.

If any of your agents read external content, treat indirect prompt injection as a real threat. Review what content your agents retrieve, validate it before acting on it, and design for the case where an agent's context has been tampered with.

Build for the case where a downstream agent refuses your request. Not because it happens constantly, but because a system that handles refusal gracefully is much easier to design before you deploy it than after three days of debugging a queue that silently stopped processing.

When you connect agents across teams or organisations, create shared definitions for trust levels. "Operator-level trust" should mean the same thing to both sides of the interface.

Instrument your pipelines to log refusals and deferrals explicitly, not just task completion. Silent deferrals are the hardest failures to find.

The companies doing multi-agent coordination well are doing it through discipline, monitoring, and deliberate negotiation about rules across teams. The infrastructure did not make it easy. Their habits did.

## The failures that look like success

The rule wars are already happening. They happen every time two agents interact under different instructions and nobody checked whether those instructions were compatible. That is happening at scale, right now, mostly quietly.

The failures look like success because the pipeline completed. An answer went out. A task got queued. No exception was thrown. The problem surfaces four days later, or it never surfaces, and you are making decisions on outputs that were quietly wrong the whole time.

The breakage is invisible by default. Visibility requires work you have to do on purpose.

The tooling will catch up. Standards will get written. Someone will build the cross-agent audit trail that everyone currently has to build by hand. Until then, the teams not getting surprised by this are the ones that wrote down their assumptions before they deployed, and kept checking them after.
