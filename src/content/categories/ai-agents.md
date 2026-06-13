---
title: "AI Agents"
description: "How autonomous AI systems actually behave when deployed, coordinated, and left to run — what works and what breaks silently."
order: 3
icon: "🤖"
---

An AI agent is not a chatbot that does more. It is a system that takes actions, not just outputs. That distinction changes everything about how you build with it, how you trust it, and how you find out when it has gone wrong.

## What Makes Agent Systems Different

Most AI applications are stateless. You send a prompt, you get a response. The interaction ends there. Agent systems are different: they maintain state across steps, take actions that have consequences in the real world, and often operate faster than any human can monitor them.

This creates failure modes that language model benchmarks do not capture. A model that scores well on reasoning tasks can still fail systematically when embedded in a multi-step pipeline — not because its reasoning is bad, but because its reasoning is local. It optimizes for the step in front of it without understanding the broader context it is operating in.

## The Coordination Problem

When multiple agents work together — each responsible for a different part of a pipeline — the question of who is responsible for correctness becomes complicated. Each agent passes output to the next. Each agent trusts the output it receives. If one agent produces something subtly wrong, the downstream agents typically do not catch it. They incorporate it. By the time the error is visible, it has been processed through several layers of confident-sounding output.

The essays in this chapter examine these failure modes directly: the structural reasons they occur, the conditions that make them more or less likely, and the approaches that actually help — not in theory but in deployed systems.

## Economics and Trust

Using AI agents at scale is also an economic question. The cost per action, the latency per step, and the reliability threshold required before removing a human reviewer from the loop — these are not engineering parameters. They are business decisions that require understanding what autonomous systems are actually good at versus where human judgment remains necessary.

These essays look at where the lines are, based on what the current systems can and cannot do, and how those lines are likely to move.
