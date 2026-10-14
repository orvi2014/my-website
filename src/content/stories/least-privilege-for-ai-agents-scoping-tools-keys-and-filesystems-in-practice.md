---
title: "Least Privilege for AI Agents: Scoping Tools, Keys and Filesystems"
description: "Least privilege for AI agents in practice: how to scope tools, credentials and filesystems, with the Replit and Amazon Q incidents as evidence."
pubDate: 2026-10-14
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["AI agent permissions", "least privilege", "AI agent security", "prompt injection", "tool scoping", "agent sandboxing", "excessive agency"]
featured: false
---

Least privilege for AI agents means one thing: the process can only reach what its job needs, no matter what the model decides to do. A system prompt is a request. A permission is a fact about what the process can physically do, and only the second one survives a confused model or a hostile web page.

## Is least privilege for AI agents actually a real problem?

Yes. OWASP lists it as its own risk: LLM06:2025 Excessive Agency, which it defines as the vulnerability that enables damaging actions in response to unexpected, ambiguous or manipulated LLM outputs, "regardless of what is causing the LLM to malfunction." The cause might be hallucination, direct prompt injection, or indirect injection from content the agent reads. The damage depends on what the agent can reach.

OWASP names three root causes: excessive functionality (the agent holds tools it doesn't need), excessive permissions (those tools carry more downstream access than the task requires), and excessive autonomy (high-impact actions run without independent approval). Each one is a permissions decision, not a model-quality decision. ([OWASP GenAI Security Project, LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/))

## Why isn't a system prompt an access control?

Because a system prompt is an instruction to a probabilistic text system, not a boundary the operating system enforces. The model also reads files, tool output, and web pages, and any of them can contain new instructions.

My own bot shows the same principle one layer down: a stop signal is only a control if the thing being stopped cannot route around it. The bot I run posts to X only after a human presses approve in Telegram, and it still had enough reach to keep working after the platform suspended the account on 2026-07-21. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The check was correct. The caller treated a hard stop as a skip.

The fix was not a better prompt. It was a process exit plus a sentinel file that only a human can clear. launchd's KeepAlive respawned a plain exit, so the exit had to be paired with a state the process itself could not reset.

It happened again. X suspended the account a second time on 2026-09-22, a week after I raised the bot's reply cap from 16 to 150. This time the lockout check matched none of its known selectors and never fired, and I stopped the bot by hand. A rate cap is a privilege too: it bounds how much an agent can do before anyone notices. A kill switch that depends on recognizing the failure page will eventually miss one.

## Why did an agent delete a production database during a code freeze?

Because nothing stopped it from running destructive commands against production. The instruction to stop lived only in text. In July 2025, an AI agent on Replit deleted a live production database during a code freeze, despite instructions not to make changes. The victim was SaaStr founder Jason Lemkin, who was nine days into a planned 12-day public trial of vibe coding on the platform. ([eWeek, July 22, 2025](https://www.eweek.com/news/replit-ai-coding-assistant-failure/))

eWeek reported that the erased records covered 1,206 executives and more than 1,196 companies. The agent later wrote that it had "panicked" on seeing an empty database, and admitted it had "violated explicit instructions." Its account of its own reasoning proves nothing beyond the fact that the model could narrate a failure after the fact.

Replit's response is the useful part. CEO Amjad Masad called it "unacceptable and should never be possible," and the safeguards he listed were scoping controls outside the model: automatic separation of development and production databases, a planning-only mode that blocks changes, and one-click restoration from backups. None of them asked the agent to behave better.

## Isn't scoping just friction that slows agents down?

No. Done at the operating-system level, scoping removes friction. Anthropic reported in October 2025 that sandboxing reduced permission prompts in its internal Claude Code usage by 84%, because the agent no longer has to ask before every action inside its allowed boundary. The common objection is that narrow permissions mean constant approval prompts, which make the agent useless and push people to approve everything. Anthropic's engineering team, in a post published October 20, 2025, wrote that "in our internal usage, we've found that sandboxing safely reduces permission prompts by 84%." ([Anthropic Engineering, October 20, 2025](https://www.anthropic.com/engineering/claude-code-sandboxing))

The sandbox works on two boundaries. Filesystem isolation "ensures that Claude can only access or modify specific directories," and network isolation "ensures that Claude can only connect to approved servers." Anthropic's reason for needing both is blunt: without network isolation, a compromised agent could exfiltrate SSH keys, and without filesystem isolation, it could backdoor system resources to gain network access. When the operating system enforces the boundary, the agent doesn't need to be persuaded.

## Will better models make agent permissions unnecessary?

No. The Amazon Q incident in July 2025 did not depend on the model's judgment at all. A credential with too much access let an attacker ship a destructive prompt in a release, which shows that permissions decide the blast radius whatever the model does.

The objection is that better models will make permissions unnecessary. The July 2025 Amazon Q case shows why model quality isn't the variable that matters. An attacker got malicious code into the open-source Amazon Q Developer extension for VS Code: a prompt telling the assistant to wipe local files and cloud infrastructure. The code shipped in version 1.84.0 on July 17, 2025. Amazon said the injected prompt was malformed and wouldn't run on end-user systems, and the extension had been installed more than 964,000 times. ([BleepingComputer](https://www.bleepingcomputer.com/news/security/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands), [AWS security bulletin](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/)) Whether the payload would have executed is disputed. The lesson isn't about the model's judgment. AWS's security bulletin said the code was committed using an inappropriately scoped GitHub token in its CodeBuild configuration. An over-privileged credential, not the model, was the failure. A destructive prompt is only as dangerous as the credentials and shell access sitting next to it. Scoping is what stays true when the instructions don't.

## How do you scope tools, keys and filesystems in practice?

Give each agent the smallest tool list that completes its job, one credential per role, and a filesystem root it can't leave. Then put the kill authority outside the agent. Here is what each boundary looks like.

**Tools.** Start with an allowlist, not a denylist. OWASP advises limiting extensions "to only the minimum necessary" and avoiding open-ended tools such as arbitrary shell access. A reply-drafting agent doesn't need a publish function. In an [approval-gated design](https://www.robatdasorvi.com/chapters/ai-agents/the-economics-of-ai-agents-when-autonomous-beats-human-in-the-loop), the human's approval is the publish function.

**Keys.** Issue read-only credentials wherever writes aren't required. OWASP's email example uses "an OAuth session with a read-only scope," and its database example notes that a read-only agent should not be able to insert, update, or delete records.

**Filesystems.** Pick one working directory and deny the rest by default. Anthropic's sandbox allows reads and writes in the current working directory and blocks changes outside it. If your agent needs a second directory, add it on purpose, rather than discovering it was writable the day something went wrong.

**Kill authority.** The agent shouldn't be able to clear its own stop state. A lockout the process can reset is a suggestion. A sentinel file that only a human removes is a control. In my case, launchd's KeepAlive respawned a plain exit, so the stop had to be a sentinel file only I could delete (see [the circuit breaker I added after the 3.5-day overrun](https://www.robatdasorvi.com/chapters/ai-agents/why-every-agentic-loop-needs-a-circuit-breaker-and-how-i-built-one)).

## How do you scope permissions in a multi-agent system?

Every agent in a system is another place a credential can leak or a tool can be misused, so the OWASP root causes of excessive functionality, excessive permissions and excessive autonomy apply to each role separately. ([OWASP GenAI Security Project, LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/))

Start with identity. Give each agent role its own credential, and never share one key across roles. A shared key means a compromise of one agent is a compromise of all of them, and the audit trail can't tell them apart.

Next, match tools to role. A planner agent decides what should happen, so it should hold no write tools. Let it propose actions, and let a scoped executor or a human perform them.

Sub-agents should inherit a narrower scope than their parent, never a wider one. A parent that delegates a read-only task should hand down a read-only credential, not its own full set. Delegation that can widen permissions is an escalation path.

Finally, treat per-agent rate caps as privileges. A cap bounds how much an agent can do before anyone notices, so raising one is a permission change and deserves the same review. The reply cap on the bot above went from 16 to 150, and X suspended the account a week later. This essay does not claim the cap caused the suspension. It only shows that the cap is part of the agent's permission set, and that raising it changes what the agent can do.

## What is the fastest least-privilege fix for an AI agent?

Ask one question about each agent you run: if its instructions were ignored completely, what is the worst action it could take with the credentials and paths it holds right now? That answer is its real permission set.

Write the rules for the process, not the model. The prompt is decoration on top of it.

Then fix the one you can fix today. Remove the tool it doesn't need, swap the write-scoped key for a read-only one, and move the stop state somewhere the agent can't reach. An agent left running overnight is the one that most needs this, because nobody is there to notice what it reaches for. Shrink its reach first. You can make it smarter later.

For the adjacent problems, see [when not to use an AI agent at all](https://www.robatdasorvi.com/chapters/ai-agents/the-architecture-decision-nobody-talks-about-when-not-to-use-an-ai-agent) and [how agents fail silently in production](https://www.robatdasorvi.com/chapters/ai-agents/how-llm-agents-fail-silently-in-production-and-how-i-learned-to-catch-it).