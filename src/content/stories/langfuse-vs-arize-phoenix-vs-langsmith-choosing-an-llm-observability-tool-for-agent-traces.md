---
title: "Langfuse vs Phoenix vs LangSmith for Agent Traces"
description: "Langfuse vs Phoenix vs LangSmith: pick Langfuse to self-host with evals, Phoenix for OpenTelemetry tracing, LangSmith if you already run LangChain."
pubDate: 2026-11-19
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["LLM observability", "AI agents", "Langfuse", "Arize Phoenix", "LangSmith", "OpenTelemetry", "agent tracing"]
featured: false
---

If you're choosing between Langfuse, Arize Phoenix and LangSmith for agent traces, here's the short answer. Pick Langfuse if you want self-hosted tracing with evals built in. Pick Phoenix if you want local, notebook-friendly tracing with an evals library and no external database, under a source-available license. Pick LangSmith if your agents already run on LangChain and a hosted, per-seat product is fine with you. Those choices are real, and the differences between the three matter less than you'd think.

The uncomfortable version: the observability tool you're about to choose will not make your agent more reliable. You're probably reading comparison tables because an agent is misbehaving in a way you can't explain, and you've decided the missing piece is a dashboard.

I haven't run any of these three tools in production. The comparison below comes from each vendor's documentation and pricing pages as of November 2026, and the failure stories come from an agent I did run.

## Do I need an LLM observability tool for my agent at all?

Yes, but the tool is the cheapest part of the answer. Most teams already have some observability. The harder gap is whether anyone checks the agent's behavior against known-good outcomes.

LangChain's State of Agent Engineering survey (2025) found that 89% of organizations have some observability for their agents, rising to 94% among teams already running agents in production. The same survey found only 52.4% run offline evaluations and 37.3% run online ones ([LangChain, 2025](https://langchain.com/state-of-agent-engineering)). So the bottleneck is rarely that nobody can see the trace. It's that nobody has written down what a correct trace looks like.

## When is switching observability tools worth it?

Switching is worth it only if your current traces can't answer a question you already ask. If you can search for failing runs, replay a tool call, and see token cost per run, switching gets you a migration, not a new capability.

I ran an approval-gated X growth agent where every post, reply, follow and like went through a Telegram approval I pressed by hand. Its logs said things were working for weeks at a time, and they were wrong in ways no dashboard flagged:

- For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of the bot's daily comment attempts. Every run logged success. Nothing raised an error. For further reading on silent failures, see [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars).
- The Telegram Skip button silently did nothing for months. Every skipped item got counted as a timeout, so the approval statistics were wrong.
- The article lane lost 8 of 20 generations to JSON parse errors, and each failure quietly burned a 48-hour slot. For catching malformed model output before it costs you a slot, see [Pydantic vs Zod for Validating LLM Tool Call Arguments](https://www.robatdasorvi.com/chapters/ai-automation/pydantic-vs-zod-for-validating-llm-tool-call-arguments).

None of these needed a new vendor. They needed a trace where the failing step was a visible, queryable span, not a success line with no effect behind it. That's a schema decision you make in code, and it applies to every tool on this list.

## How does each tool show a multi-step agent trace?

Each tool records an agent run as a tree of nested steps, but the names and grouping differ.

- **Langfuse** shows nested observations as a tree, so a model call made during a tool step appears under the step that triggered it. Sessions group the turns of one multi-turn conversation ([Langfuse sessions](https://langfuse.com/docs/observability/features/sessions)), and eval scores attach to a trace or a single observation ([Langfuse scores](https://langfuse.com/docs/scores/overview)).
- **Phoenix** records each run as a trace of spans and shows the span tree in its UI. Evals attach to spans as annotations, and runs can be grouped into sessions ([Phoenix docs](https://arize.com/docs/phoenix)).
- **LangSmith** nests runs under a parent run, so tool calls appear beneath the agent step that made them. Threads group a multi-turn conversation ([LangSmith observability docs](https://docs.smith.langchain.com/observability)), and evaluators score runs and traces ([LangSmith evaluation docs](https://docs.smith.langchain.com/evaluation)).

OpenTelemetry is not unique to Phoenix. [Langfuse's SDK is built on OpenTelemetry](https://langfuse.com/docs/opentelemetry/get-started), and [LangSmith accepts OpenTelemetry traces](https://docs.langchain.com/langsmith/trace-with-opentelemetry).

## What differs for agent workloads specifically?

Three things separate these tools once you're tracing agents rather than single model calls.

**Instrumentation.** LangSmith traces LangChain and LangGraph natively, and per its docs, enabling tracing takes a single environment variable ([LangSmith quickstart](https://docs.langchain.com/langsmith/observability-quickstart)). Langfuse offers framework integrations plus an OpenTelemetry-based SDK with decorators for manual spans ([Langfuse integrations](https://langfuse.com/docs/integrations)). Phoenix uses OpenInference auto-instrumentation for agent frameworks, so you can capture agent runs without hand-writing spans ([OpenInference in Phoenix](https://arize.com/docs/phoenix/tracing/concepts-tracing/otel-openinference/overview.md)).

**Free-tier retention.** The numbers differ, and each comes from its vendor's pricing page. LangSmith's pricing FAQ says base traces are kept for 14 days and extended traces for 180 days ([LangChain pricing](https://www.langchain.com/langsmith-pricing)). Langfuse's Hobby tier lists 30 days of historical data access ([Langfuse pricing](https://langfuse.com/pricing)). Arize's pricing page gives a 15-day retention figure for its AX Free plan, which is Arize AX rather than Phoenix, and no Phoenix-specific retention figure appears there ([Arize pricing](https://arize.com/pricing)).

**Scoring a single span.** All three let you score one step, not just the whole run. Phoenix attaches annotations to individual spans ([Phoenix feedback and annotations](https://www.arize.com/docs/phoenix/tracing/how-to-tracing/feedback-and-annotations/capture-feedback)). Langfuse attaches scores to any observation, including a tool call ([Langfuse scores](https://langfuse.com/docs/scores/overview)). LangSmith attaches feedback to any run, and a tool call is a child run ([LangSmith evaluation docs](https://docs.smith.langchain.com/evaluation)). The difference is workflow, not capability.

## Which tool is cheapest to start with?

If your code already uses LangChain, LangSmith is the quickest start: per its docs, tracing turns on with environment variables ([LangSmith tracing quickstart](https://docs.langchain.com/langsmith/observability-quickstart)). Langfuse and Phoenix can both be self-hosted for free, and Langfuse also has a hosted free tier. Langfuse Cloud's [Hobby tier](https://langfuse.com/pricing) is free with no credit card required. The bill just arrives in a different place for each.

| Tool | License | Free starting point | Self-hosting | Best fit |
|---|---|---|---|---|
| Langfuse | MIT for core features | Self-host free, or Cloud Hobby tier | Yes, production scale on ClickHouse | Teams that need data in their own VPC plus evals |
| Arize Phoenix | Elastic License 2.0 | Self-host free | Yes, on your own infrastructure | Local or notebook tracing with evals |
| LangSmith | Proprietary | 1 seat, 5k base traces/month | Enterprise only, custom pricing | Teams already on LangChain or LangGraph |

LangSmith's pricing page lists the Developer plan at up to 5k base traces per month, the Plus plan at $39 per seat per month with 10k base traces, and self-hosting only on Enterprise ([LangChain pricing](https://www.langchain.com/langsmith-pricing)). The table is a starting point, not a verdict. A team of five on Plus pays for seats. A self-hosted Langfuse pays for the database, the cache and the object store you run.

## Can I self-host Langfuse or Phoenix without regret?

You can self-host both, but self-hosting Langfuse means running a small data platform. The Langfuse docs name PostgreSQL for transactional data, Redis or Valkey for queues, ClickHouse for traces and scores, and S3 or blob storage for raw events ([Langfuse self-hosting docs](https://langfuse.com/docs/deployment/self-host)).

That's the second-order effect most comparisons skip. Self-hosting for data-residency reasons is sound, but it turns your observability stack into one more service with backups, upgrades and a storage bill. The first month is cheap. The month you have to restore a ClickHouse table at 2 a.m. is when you learn what you actually signed up for.

Phoenix's license is where people misread things. Arize's license page says self-hosting on your own infrastructure or cloud account "is free and fully permitted" ([Arize Phoenix license](https://arize.com/docs/phoenix/self-hosting/license)). The limit is in the Elastic License 2.0 text itself, which bars providing the software to third parties as a hosted or managed service ([Elastic License 2.0](https://www.elastic.co/licensing/elastic-license)). If you ever plan to expose Phoenix to customers of your own product, read the license text before you build on it.

## Does Langfuse stay open source after the ClickHouse acquisition?

The published commitment is yes, for the core. ClickHouse said Langfuse "remains 100% open-source under its existing MIT license for core features," which allows self-hosting at production scale ([ClickHouse, 2026](https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability)).

Read that sentence closely. It says "core features," not every feature. Langfuse's open-source page lists tracing, evaluations, prompt management and annotation as MIT-licensed, and it says enterprise modules such as SCIM, audit logging and data retention policies require a commercial license ([Langfuse open-source docs](https://langfuse.com/docs/open-source)). So the question worth asking isn't whether Langfuse disappears. It's whether the parts you depend on stay in the MIT core over the next two years. Write your trace export path now, while the data is small, so that moving later is a script and not a rewrite.

## Does a trace catch a failure that looks like success?

A trace catches the failure only if the failing step is recorded as its own span with an explicit error status. A log line that says "comment posted" when the target no longer exists will look fine in any tool.

Here is a sketch of a check aimed at the second suspension, where the lockout detector matched none of its selectors. It treats an unrecognized page as a failure instead of a pass. It is not code from the bot:

```python
from pathlib import Path

SENTINEL = Path("LOCKOUT_HALT")

def guard_lockout(page, healthy_selectors: list[str], lockout_selectors: list[str]) -> None:
    """Halt if the page shows a lockout, or if it shows neither a lockout nor a normal logged-in page.

    Unknown page state means the detector is blind.
    """
    locked = any(page.query_selector(s) for s in lockout_selectors)
    healthy = any(page.query_selector(s) for s in healthy_selectors)
    if locked or not healthy:
        # The sentinel file is needed because launchd KeepAlive restarts a plain exit.
        # Only a human clears it, so the process stays down until someone checks the account.
        SENTINEL.write_text("halted: lockout or unknown page state\n")
        raise SystemExit(1)
```

Both suspensions show why. X suspended the account on 2026-07-21 and the lockout check fired, but the caller skipped the action and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive restarted a plain exit. The second suspension, on 2026-09-22, came a week after the reply cap was raised from 16 to 150. This time the lockout check matched none of its known selectors, so it never fired, and I stopped the bot by hand. A tracing tool would have recorded the zero-match result as a span, but only if the code emitted one. It still wouldn't have made the detector correct.

## Isn't observability just a dashboard I can ignore?

The strongest counterargument is that tracing is decoration. You'll look at a dashboard for a week and then stop. The evidence supports part of that. The 89% observability figure sits right next to 52.4% running offline evals, which means plenty of teams have dashboards they never turn into tests.

The part that survives is narrower. An agent's own account of what it did is not evidence. In July 2025, an AI coding assistant on Replit deleted a live production database during a code freeze, and the company's CEO apologized, calling it "unacceptable and should never be possible" ([eWeek, 2025](https://www.eweek.com/news/replit-ai-coding-assistant-failure/)). SaaStr founder Jason Lemkin, whose project it was, said in posts on X that the agent may have fabricated its responses. Fortune reported that the agent initially told him a rollback function would not work in that scenario ([Fortune, 2025](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)). The point is that the agent's own account wasn't reliable. The only neutral record is the one your system wrote outside the agent's own text. A tool that records tool calls independently of the model's narration is worth paying for on that basis alone.

Liability works the same way. In Moffatt v. Air Canada (2024), a British Columbia tribunal held the airline responsible for what its chatbot told a passenger and ordered it to pay $812.02 ([Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html)). If your agent says something to a customer, you'll need to retrieve exactly what it said. That's a retention requirement, and it means the trace store becomes a record you can't casually delete. A free tier's retention window is a practical limit here: LangSmith keeps base traces for 14 days, and Langfuse's Hobby tier lists 30 days of historical data access.

## What should I do this week?

Pick the tool that matches where your data is allowed to live. Export traces in a format you can read without that tool. Write one check that fails when a step succeeds on paper and does nothing in reality. If none of those constraints applies to you, use whichever one your current framework already exports to, and keep the export path.

The tool matters less than whether your traces record failure as failure. OpenTelemetry's GenAI conventions are still marked Development in the spec, so the attribute names you build dashboards on will move ([OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)). Keep your spans portable, write the zero-match guard before the dashboard, and read your own traces on a schedule. For a related case on why passing checks can hide broken behavior, see [AI Agent Tests Pass Locally but Fail in CI](https://www.robatdasorvi.com/chapters/ai-automation/ai-agent-tests-pass-locally-but-fail-in-ci). For how evals should be built, see [Synthetic vs Real Test Cases for LLM Agent Evals](https://www.robatdasorvi.com/chapters/ai-automation/synthetic-vs-real-test-cases-for-llm-agent-evals).