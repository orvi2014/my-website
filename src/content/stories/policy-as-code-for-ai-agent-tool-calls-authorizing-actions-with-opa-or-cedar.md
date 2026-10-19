---
title: "Policy as Code for AI Agent Tool Authorization: OPA or Cedar"
description: "Policy as code for AI agent tool authorization: why OPA or Cedar should decide every tool call, not the prompt. Real incidents, one hard lesson."
pubDate: 2026-10-19
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["policy as code", "AI agent authorization", "OPA", "Cedar", "tool calls", "agent security", "least privilege", "Open Policy Agent"]
featured: false
---

In July 2025, Replit's AI coding agent deleted a live production database holding records on 1,206 executives during a code freeze, according to [eWeek](https://www.eweek.com/news/replit-ai-coding-assistant-failure/). The agent had been told not to make changes. That instruction lived in a prompt, and a prompt is a request the model may decline to honor. It is not a control the system enforces. That gap is why policy as code for AI agent tool authorization, with an engine like OPA or Cedar, exists.

If your agent's limits live in a system prompt, a tool description, or an `if tool == "delete"` branch in your dispatcher, you are in the position that database owner was in. The fix is to move the decision out of the model and out of your application code, and into a policy engine that answers allow or deny for every call.

## Why Should AI Agent Tool Calls Go Through a Policy Engine?

Every AI agent tool call that changes state should be authorized by a policy engine such as OPA or Cedar, not by the prompt. A policy decision point outside the agent returns allow or deny for each call, along with a reason you can log. The tool runtime refuses to proceed without that answer. A prompt only asks.

The stakes are rising faster than the controls. [Gartner's 25 June 2025 press release](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027) predicts that more than 40% of agentic AI projects will be canceled by the end of 2027, because of escalating costs, unclear business value, or inadequate risk controls. Risk controls are the third item on that list, and they are the one this article is about. In July 2025, a destructive instruction was injected into version 1.84.0 of Amazon Q Developer's VS Code extension, which has more than 950,000 installations, per [CyberInsider's report](https://cyberinsider.com/amazons-ai-coding-assistant-for-vsc-infected-with-data-wiper/). Amazon said formatting errors kept the payload from running. Some researchers disputed that. Either way, an agent with a broad tool surface and no independent check on each action has no defense when an instruction arrives from the wrong source.

## An Agent Breaks a Prompt Rule Because Nothing Enforces It Where the Action Runs

An agent breaks a prompt rule because nothing enforces that rule where the action actually runs. The model decides whether to follow the rule, and the tool runs whatever the model emits.

The Replit case shows the shape. Per [eWeek's reporting](https://www.eweek.com/news/replit-ai-coding-assistant-failure/), the agent ran destructive commands during a code freeze. According to founder Jason Lemkin's public account, it then misreported what it had done. Replit's CEO called it "unacceptable and should never be possible." The safeguards Replit announced afterward are the useful part: separate development and production databases, a planning-only mode, and one-click restore from backups. Each one sits on the execution path. None of them is a sentence in a prompt.

I run an approval-gated X growth agent: every post, reply, follow and like went through a Telegram approval I pressed by hand. On 21 July 2026, X suspended the account. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. A correct answer from a check does nothing if the code that acts treats it as advice: the caller got True, skipped one action, and carried on. The fix was a process exit plus a sentinel file that only a human can clear, because launchd's KeepAlive respawned a plain exit. The problem was the enforcement point, not the detection logic.

The second suspension, on 22 September 2026, failed the other way. The lockout check matched none of its known selectors and never fired. A gate that works only when a pattern matches the world is a detector, and detectors [fail silently in production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it). Authorization needs a default of deny that still holds when the detector is blind.

## Where Does the Policy Decision Point Pattern Come From?

Splitting the decision point from the enforcement point predates agents by more than a decade. XACML, the OASIS access-control standard, defined a Policy Decision Point that evaluates a request against policy, and a Policy Enforcement Point that acts on the answer. OASIS approved XACML 3.0 in a vote that closed on 22 January 2013. It followed XACML 2.0 from 1 February 2005 and 1.0 from 2003 ([OASIS XACML 3.0 standard](https://www.oasis-open.org/standard/xacml3-0-core)).

NIST formalized the same idea in January 2014. [NIST SP 800-162](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-162.pdf) describes attribute-based access control as a permission decision. It weighs attributes of the requester, the target resource, the requested action, and sometimes environmental conditions against policy. Map that onto a tool call and the pieces line up. The agent is the subject. The tool and its arguments are the resource and the action. The environment is production or staging. None of this is new. What is new is that the subject is a language model that composes its own actions.

XACML showed the model was sound, but the standard never made it into everyday engineering. The idea reached ordinary infrastructure through Open Policy Agent. The CNCF announced OPA's graduation on 4 February 2021 ([CNCF announcement](https://www.cncf.io/announcements/2021/02/04/cloud-native-computing-foundation-announces-open-policy-agent-graduation/)). AWS open-sourced Cedar in May 2023. Agent tool calls are the third wave. They are also the first where the subject is an unpredictable generator, not a human or a service with a fixed call graph.

## OPA or Cedar: Which Should You Pick?

Pick Cedar if you are on AWS or want authorization decisions that are easy to analyze. Pick OPA if your organization already runs it and you need policy beyond authorization. Either one works, as long as the enforcement point is mandatory.

OPA uses Rego, a general-purpose policy language. It is the broader tool, and it already sits in many Kubernetes and CI stacks. Cedar was built for authorization. The [Cedar paper](https://arxiv.org/pdf/2403.04651) (OOPSLA 2024, DOI 10.1145/3649835) compares Cedar with OpenFGA and Rego. Its authors, the Cedar team at AWS, report that Cedar policies are as readable as or more readable than the alternatives, and that Cedar evaluated faster than both in their benchmarks.

Amazon Bedrock AgentCore Policy shows what an enforcement point for agents looks like in practice. It intercepts requests at the AgentCore Gateway, checks each one against a Cedar policy engine before the tool is reached, and logs every decision to CloudWatch. It has two modes: LOG_ONLY and ENFORCE. The [AgentCore policy documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html) covers the mode settings. Start in LOG_ONLY, read the denials for a week, then switch to ENFORCE.

Here is a Cedar policy for a refund tool:

```
permit (
  principal,
  action == Action::"invoke",
  resource == Tool::"issue_refund"
) when { context.amount < 50 };

forbid (
  principal,
  action == Action::"invoke",
  resource == Tool::"issue_refund"
) when { context.amount >= 50 };
```

Cedar denies by default, so the permit alone already blocks amounts of 50 or more. The forbid is a guardrail: in Cedar an explicit forbid overrides every permit, so it still holds if someone later adds a broader permit. Pair it with [least privilege for AI agents](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice). A policy engine can only deny what the tool surface exposes.

Here is the same refund limit in Rego, the language OPA uses:

```
package agent.tools

default allow := false

allow if {
  input.tool == "issue_refund"
  input.arguments.amount < 50
}
```

(This uses OPA 1.0 syntax; on older versions add `import rego.v1`.)

The `default allow := false` line is the important part. Rego has no `forbid` keyword, so the usual pattern is a default-deny rule with allow rules beside it. If no rule matches, the answer is deny, so a new tool with no rule is blocked automatically. The dispatcher sends one JSON input document per call, containing the principal (the agent id), the tool name, the arguments, and the environment, such as production or staging. Fill the principal and environment from the runtime session, never from the model's output. An agent that can write its own agent id or environment into the input can authorize itself. Both engines evaluate that document and return a decision the tool runtime must check before it runs.

## Doesn't a Policy Engine Add Latency and Another Point of Failure?

Run in-process, an OPA or Cedar evaluation adds very little time. Called over the network, it costs a round-trip. The real risk is the default when the engine is unavailable, not the latency. [AWS describes Verified Permissions as evaluating access requests in milliseconds](https://aws.amazon.com/verified-permissions/faqs/). A tool call already waits on a model round-trip that takes seconds. The check is not the bottleneck.

The failure mode is what matters. If the policy service is unreachable, the tool runtime must deny. A fail-open default turns the policy engine into an optional check, the same shape as the 21 July bug, where a correct answer existed and the code that acted didn't obey it. Write the code so the tool function cannot run without a decision object, and treat a missing decision as a hard error.

```python
import logging

log = logging.getLogger("agent.tools")

def call_tool(name, args, session):
    doc = {
        "principal": session.agent_id,       # set by the runtime, never by the model
        "environment": session.environment,
        "tool": name,
        "arguments": args,
    }
    try:
        decision = policy_engine.evaluate(doc)
    except Exception as exc:
        raise PermissionError(f"policy engine failed, denying {name}") from exc
    if decision is None:
        raise PermissionError(f"no decision for {name}, denying")
    log.info("tool=%s allow=%s reason=%s", name, decision.allow, decision.reason)
    if not decision.allow:
        raise PermissionError(f"{name} denied: {decision.reason}")
    return TOOLS[name](**args)
```

Writing a policy is not the same as enforcing one. Put the check in the single function every tool call passes through, not in each tool. Then test it by calling each tool with the decision stubbed to deny. If any tool still runs, the gate is optional, and you have the same bug as before.

## Should You Start With the Policy or the Enforcement Point?

Start with the enforcement point. A policy behind an optional gate is just documentation. Once every side-effecting call needs a decision, the policy language becomes a choice you can revisit later.

Sometimes a denial is not enough, and you need to undo what already happened. [Rollback for tool calls fails in its own ways](https://www.robatdasorvi.com/chapters/ai-agents/rolling-back-an-ai-agent-s-actions-compensating-transactions-and-the-saga-pattern-for-tool-calls), so design for it before the first incident. And before you give an agent write access anywhere, ask whether it should be an agent at all. [Some tools need no agent](https://www.robatdasorvi.com/chapters/ai-agents/the-architecture-decision-nobody-talks-about-when-not-to-use-an-ai-agent).

Today, find the one function your agent uses to call tools that change state. Make it refuse to run without a decision from a policy engine. Ship that in LOG_ONLY, and tomorrow read every denial it logged.