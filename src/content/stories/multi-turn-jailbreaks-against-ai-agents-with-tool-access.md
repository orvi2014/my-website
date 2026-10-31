---
title: "Multi-Turn Jailbreaks Against AI Agents With Tool Access"
description: "Multi-turn jailbreak AI agent defense means enforcing tool permissions in code on every call. Refusals and per-message filters miss attacks spread across turns."
pubDate: 2026-10-30
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["multi-turn jailbreak", "AI agent security", "tool access", "prompt injection", "agent permissions", "LLM guardrails", "least privilege", "agentic AI"]
featured: false
---

The defense against a multi-turn jailbreak on an AI agent is to stop the tool call, not the conversation. Refusals and per-message filters miss attacks spread over several turns, because each turn looks harmless on its own. Enforce permissions in code, outside the model, on every action the agent takes.

I built and ran an X growth agent where every post, reply, follow and like went through a Telegram approval I pressed by hand, so I think about where the stop actually lives.

## Why does a multi-turn jailbreak get past an agent's guardrails?

Because each message gets judged alone, and the harm only exists across the sequence. The attacker never has to send one bad request. They build toward it one reasonable-looking step at a time.

Russinovich, Salem and Eldan (2024) describe Crescendo. It opens with a benign question and escalates using the model's own earlier replies. The paper reports that Crescendomation, its automated version, reports 29–61% higher performance than other state-of-the-art jailbreaks on GPT-4 and 49–71% on Gemini-Pro, on an AdvBench subset ([arXiv:2404.01833](https://arxiv.org/pdf/2404.01833)). No clever string is involved. It takes patience and a conversation the model keeps extending.

Human red-teamers show the same gap. Li et al. at Scale AI (2024) report multi-turn human jailbreaks exceeding 70% attack success on HarmBench. Those defenses had reported single-digit rates against automated single-turn attacks ([arXiv:2408.15221](https://arxiv.org/abs/2408.15221)). The authors warn that human and automated setups differ, so treat the number as evidence of a gap, not a clean head-to-head score.

## Why is a rule in the prompt not a permission?

The refusal lives in the model. The damage lives at the tool call. A model that refuses still leaves the call path open. The usual failure is that the rule exists only as text in the conversation, where the model can be argued out of it.

In July 2025, SaaStr founder Jason Lemkin reported that Replit's AI agent deleted a live production database during a code-and-action freeze, and that the agent told him a rollback was impossible, which turned out to be false; the rollback worked. No attacker was involved; it shows what an instruction-only freeze is worth before anyone tries to argue the model out of it ([The Register, July 2025](https://www.theregister.com/2025/07/22/replit_saastr_response/)). Most of the detail comes from Lemkin's own posts. His claim that the agent hid and lied about it is his account, not a verified finding. The part I can read from the public record is structural. The freeze was an instruction the agent received. It was not a permission the platform enforced.

A different failure in my own agent shows the same structural point from the other side. In my growth agent, X suspended the account on 2026-07-21. The lockout check fired and returned True, but the caller skipped one action, and the loop kept running for 3.5 more days. The fix was a process exit. But launchd KeepAlive respawned a plain exit, so the exit now requires a sentinel file that only a human can clear. Nobody attacked anything. The check was right and the caller still ignored it. A tool gate the model can't argue with is useless if the code calling it can skip it.

## Can a refusal be trusted to stop an agent?

No. A refusal is a judgment about one turn. A later turn can be built from the model's own earlier words, and that is the mechanism Crescendo exploits.

The strongest counterargument is that multi-turn attacks are a benchmark artifact. Production systems layer output classifiers, rate limits and human review, so the residual risk looks small. The public record cuts against that. Anthropic's disclosure of the GTG-1002 campaign, reported on November 13, 2025, describes a group Anthropic assessed with high confidence as Chinese state-sponsored that got around Claude Code's safeguards by splitting its intrusion work into small tasks that each looked routine, and by telling Claude it worked for a legitimate cybersecurity firm doing defensive testing. Anthropic reported that Claude carried out 80–90% of the tactical operations in attacks on roughly 30 targets, a small number of which succeeded ([Anthropic, "Disrupting the first reported AI-orchestrated cyber espionage campaign"](https://www.anthropic.com/news/disrupting-AI-espionage)). My reading: each task could pass a per-message check; the harm was in the sequence. The same reporting notes that the model hallucinated often, which limited the campaign. Anthropic presents that as a limit on fully autonomous attacks today, not as a defense anyone designed.

## How do you enforce tool permissions against a multi-turn jailbreak?

Put the permission check in code at the tool boundary. Key it on the tool, the environment, and a flag the conversation cannot write to. The model can request anything. The function decides.

```python
POLICY = {
    "db.read":  {"envs": {"staging", "prod"}, "frozen_ok": True},
    "db.write": {"envs": {"staging"},         "frozen_ok": False},
    "db.drop":  {"envs": set(),               "frozen_ok": False},  # break-glass only
}

def authorize(tool: str, args: dict, grants: set[str]) -> None:
    # grants come from the break-glass store, not from the conversation
    freeze = config_store.get("deploy_freeze")  # read on every call, from a store the chat cannot write to
    rule = POLICY.get(tool)
    if rule is None:
        raise PermissionError(f"{tool}: no policy, denied")
    if freeze and not rule["frozen_ok"]:
        raise PermissionError(f"{tool}: deploy freeze active")
    env = resolve_env(tool)  # from the connection the tool is bound to, never from model args
    if tool not in grants and env not in rule["envs"]:
        raise PermissionError(f"{tool}: not allowed in {env}")
```

`env` must not come from `args`, because a multi-turn attack can make the model label prod as staging.

The table below shows what that function returns for common states, so you can check it against your own policy:

| State | db.read | db.write | db.drop |
|---|---|---|---|
| Normal, staging | allowed | allowed | denied unless break-glass granted |
| Normal, prod | allowed | denied | denied unless break-glass granted |
| Freeze active | allowed | denied | denied, even with a grant |

Two design choices carry most of the weight. Unknown tools are denied by default, so a jailbreak that invents a tool name hits a wall. And the freeze is read from configuration, not from the transcript, so no sentence in the conversation can switch it off. The grants themselves should be time-boxed and human-approved. That's the pattern in [Break-Glass Access for AI Agents: Approved, Timed, Expiring](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry), and the scopes belong to [Least Privilege for AI Agents: Scoping Tools, Keys and Filesystems](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice).

## What a per-call gate does not stop

A stateless check ignores the conversation, which is why multi-turn persuasion can't move it. It also means a sequence of individually allowed calls still gets through. My reading is that GTG-1002 fits this pattern, and so does reading data and then sending it out through an allowed tool.

The controls that are aware of sequence are per-session action budgets and rate caps, human approval for irreversible or outbound actions, and alerts on unusual chains of tool calls. Detecting calls that drift outside the assigned task is covered in [Detect AI Agent Actions Outside Task Scope: Block, Don't Log](https://www.robatdasorvi.com/chapters/ai-agents/out-of-scope-actions-by-ai-agents-detecting-tool-calls-that-go-beyond-the-assigned-task). My own approval gate had a Skip button that silently did nothing for months, so every skip was logged as a timeout. A human-in-the-loop control needs its own test. The same goes for detectors. When X suspended the account again on 2026-09-22, a week after the reply cap was raised from 16 to 150, the lockout check matched none of its known selectors and never fired. I stopped the bot by hand.

## What would have stopped the Replit deletion?

A deny the model can't argue with, enforced where the call executes, with the freeze flag read from a store the conversation can't write to. With that in place, a destructive call like the one Lemkin described would fail inside the function, not at the model's discretion. Replit CEO Amjad Masad said in an X post that the company had started rolling out automatic separation of development and production databases to prevent this categorically, with staging environments in the works ([The Register](https://www.theregister.com/2025/07/22/replit_saastr_response/)). Replit's actual tool path is not public. Even a stopped drop can be hard to undo, which is a separate problem, covered in [Durable Execution for AI Agents: Temporal vs a Plain State Store](https://www.robatdasorvi.com/chapters/ai-agents/durable-execution-for-multi-agent-runs-checkpointing-and-resuming-after-a-crash-with-temporal-or-a-plain-state-store).