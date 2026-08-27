---
title: "LLM Function Calling in Production: Reliability, Failure Modes, and Design Patterns"
description: "Honeycomb shipped LLM function calling to production before the API existed. What they found — plus τ-bench and BFCL numbers, real failure modes, and the validation layer nobody ships until it burns them."
pubDate: 2026-06-14
category: "ai-agents"
author: "Orvi"
readingTime: 12
tags: ["llm function calling", "tool use", "ai agents", "honeycomb", "production llm", "reliability", "prompt injection", "llmops", "tau-bench", "bfcl"]
featured: false
---

On a Tuesday in March 2023, a small team at Honeycomb — the observability company in San Francisco — gave itself six weeks to ship something nobody had shipped before: a feature that turned a sentence like "slow endpoints for Android users yesterday" into a real, executable query against production telemetry. There was no playbook. The thing they needed did not have a name yet. What they were building was, in retrospect, **LLM function calling in production** — getting a language model to emit a structured call that a real system would execute — except OpenAI would not announce "function calling" as an API feature for another three months. Honeycomb's principal PM, Phillip Carter, and his team had to hand-roll the whole thing and find out, the hard way, what the abstraction hides.

This is the story of what they found. It is less flattering than the demos, and more useful.

## What is LLM function calling, really?

LLM function calling is the technique of having a model output a structured, machine-readable call — a function name and typed arguments — instead of free text, so that surrounding code can execute it against a real API or database. It is the mechanism underneath every "AI agent" that books a flight, queries a database, or issues a refund.

The framing most teams inherit from a quickstart tutorial is that the function call *is* the feature. You define a JSON schema, the model fills it in, you run the function. Honeycomb's experience is the clearest published evidence that this framing is backwards. The call itself was the easy 10%. Everything that made it shippable lived in the other 90% — the part the API surface quietly leaves to you.

## Why did Honeycomb ship before OpenAI's function calling API existed?

Because they couldn't wait. Honeycomb announced Query Assistant on May 3, 2023, after a six-week build ([Honeycomb press release](https://www.honeycomb.io/blog/honeycomb-natural-language-querying-query-assistant)). OpenAI's function calling API did not arrive until June 13, 2023 ([OpenAI](https://openai.com/index/function-calling-and-other-api-updates/)) — more than a month later.

So Honeycomb did what you do when the convenient abstraction doesn't exist yet: they wrote the prompt by hand. They described their query specification to GPT-3.5, fed it the user's question, and parsed the JSON that came back. There was no `tools` parameter, no enforced schema, no guardrails. Carter's team learned the shape of the problem before the industry papered over it with a tidy API parameter — which is exactly why their write-up is so revealing. They saw the raw machinery.

What they discovered first was that the model was the least of their problems. Their Honeycomb query schema was large, and large schemas eat context windows. The latency was real: queries took anywhere from two to over fifteen seconds. And the prompt engineering had no established best practices to copy — they reported that few-shot prompting, stuffing the prompt with worked examples, gave the best results, but they found that out by trial. None of this is in a function calling tutorial. All of it is in production.

## What actually breaks when you put function calling in production?

The thing that breaks is your assumption that a valid function call is a correct one. A model will happily produce a syntactically perfect, schema-valid call that is semantically wrong — the right shape, the wrong answer — and your code has no way to tell the difference at the moment of execution.

This is the gap between *correctness* and *usefulness* that Carter wrote about in Honeycomb's now-widely-cited post, "[All the Hard Stuff Nobody Talks About when Building Products with LLMs](https://www.honeycomb.io/blog/hard-stuff-nobody-talks-about-llm)" — a piece Simon Willison called the single most useful article he'd read on the topic at the time ([simonwillison.net, May 2023](https://simonwillison.net/2023/May/27/hard-stuff-llms/)). A query that returns *something* feels successful. Whether it returns the *right* something is a separate question your validation layer has to answer, and most teams don't build that layer until it burns them.

A schema validator checks that the model spoke grammatically. It does not check that the model said something true. That single distinction is the whole discipline.

Then there is prompt injection. Honeycomb's Query Assistant took untrusted user input and fed it straight into a prompt that produced executable output. That is the textbook attack surface. Their answer is the part of the story most worth stealing. Carter described the core defense not as a clever filter but as a design constraint: the output of the LLM call is **non-destructive and undoable**, and **no human gets paged** based on it. A bad query just shows you a bad chart. You look at it, you fix the sentence, you try again. Nothing irreversible happens downstream of an unreliable component.

Read that twice, because it inverts the usual instinct. They did not make the model reliable enough to trust. They built a system where the model did not *need* to be reliable, because every action it could take was cheap to undo. That is the real lesson of function calling in production, and it is architectural, not prompt-level.

## How do you build a validation layer for LLM function calls?

You build it in layers, because "invalid" means four different things and only the first one is free. Shape validation comes from your JSON schema; the other three — reference, semantics, and blast radius — are code you have to write yourself, and they are where the actual failures live.

Here is the shape of it, using Honeycomb's own problem as the example:

```python
def execute_tool_call(call, schema, catalog):
    # Layer 1 — shape. Free: your JSON schema already does this.
    args = validate_schema(call.arguments, schema)   # raises on type/required errors

    # Layer 2 — reference. Do the things it named actually exist?
    unknown = [c for c in args["breakdowns"] if c not in catalog.columns]
    if unknown:
        return Repair(f"unknown columns {unknown}; closest matches: {catalog.suggest(unknown)}")

    # Layer 3 — semantics. Is the call coherent for this domain?
    for op in args["calculations"]:
        if op["op"] == "AVG" and catalog.type_of(op["column"]) == "string":
            return Repair(f"AVG requires a numeric column; {op['column']} is a string")
    if args["time_range"] > SEVEN_DAYS and args["granularity"] == "1m":
        return Repair("1-minute granularity over >7d yields 10k+ buckets; widen granularity")

    # Layer 4 — blast radius. Unattended execution is for read-only, undoable calls only.
    if call.name not in READ_ONLY_TOOLS:
        return RequiresConfirmation(call)

    return run(args)
```

Two details matter more than the code. First, `Repair` is not an error — it is a message you feed back to the model as a new turn, with the specific violation named. Honeycomb found that a model handed *"unknown column `user_agent`, did you mean `request.user_agent`?"* usually fixes itself on the second attempt, where a bare "invalid query" does not. Cap the loop at two repairs, then fall back to a human-authored default; an uncapped repair loop is how a 3-second feature becomes a 40-second one.

Second, layer 4 is the load-bearing one. Layers 1 through 3 reduce the failure rate. Only layer 4 bounds the cost of the failures that get through — and some always will, because a query that filters on the wrong-but-real column passes every check above it. This is the same constraint Carter described, expressed as a routing rule instead of a design principle: any call that is destructive, external-facing, or pageable does not execute on the model's say-so. It queues for a human. Everything else runs, and if it's wrong, the user sees a bad chart and rephrases.

The ordering is deliberate. Cheap checks first, so the expensive ones — catalog lookups, type resolution — only run on calls that already parse.

## How reliable is LLM function calling, measured honestly?

Not as reliable as a single demo suggests — and the gap is widest exactly where production lives, in multi-step conversations. The most honest public measurement comes from τ-bench, a 2024 benchmark from Sierra (the company co-founded by former Salesforce co-CEO Bret Taylor) that tests agents on realistic, multi-turn tool-use tasks ([arXiv:2406.12045](https://arxiv.org/abs/2406.12045)).

τ-bench introduced a metric called pass^k: not "can the agent do this task once," but "can it do it consistently across k attempts." The results are sobering:

| Measurement | Benchmark | Top score reported | Source (year) |
|---|---|---|---|
| Single-turn call accuracy (overall) | BFCL v2 | ~90% (Claude 3.5 Sonnet) | Berkeley, 2024 |
| Single-turn, GPT-4 class | BFCL v2 | mid-80s | Berkeley, 2024 |
| Multi-turn tool use | BFCL v3 | no model above 60% at launch; several strong models in the 40s | Berkeley, 2024 |
| Multi-turn task, 1 attempt (pass^1) | τ-bench *retail* | 61.2% (GPT-4o) | Sierra, 2024 |
| Same task, 8 for 8 (pass^8) | τ-bench *retail* | ~25% | Sierra, 2024 |
| Multi-turn task, 1 attempt (pass^1) | τ-bench *airline* | ~35% (GPT-4o) | Sierra, 2024 |
| Same task, 8 for 8 (pass^8) | τ-bench *airline* | ~14% | Sierra, 2024 |

A state-of-the-art GPT-4o function-calling agent passed a retail task on the first try about 61% of the time — but its pass^8 score, the rate at which it succeeded on the same task eight times running, fell to roughly 25%. That is close to a 60% collapse in reliability simply from asking the model to be consistent rather than lucky once. In the airline domain, where the policy rules are stricter, it is worse: roughly 35% falling to roughly 14%.

The benchmark's own conclusion is blunt and worth quoting: state-of-the-art function calling agents "succeed on less than 50% of the tasks, and are quite inconsistent." This is the uncomfortable place the evidence leads. The single-call accuracy that vendor demos showcase is not the number that governs a production agent, because production is rarely one call. It is a chain, and reliability compounds downward at every link.

That compounding is arithmetic, not vibes. Reliability across a tool chain doesn't degrade linearly — it multiplies. Ten sequential steps at 95% each land at 60%. Twenty steps at 95% land at 36%. At 90% per step, ten steps is 35%. Your per-call accuracy can look excellent and your agent can still fail more often than it works.

## But haven't the models gotten good enough by now?

No — not at the thing production actually asks of them. Single-turn function calling is close to solved at roughly 90% accuracy; multi-turn tool use, which is what an agent does all day, still sits far lower on the very same leaderboard.

The Berkeley Function Calling Leaderboard — the most-cited public scoreboard for this capability — shows top models scoring around 90% overall (Claude 3.5 Sonnet) and the mid-80s for GPT-4 class models ([Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html)). Ninety percent sounds like a solved problem.

It isn't, and the leaderboard itself shows why. Break the score apart and the single-turn, expert-curated categories sit in the high 80s and 90s, while multi-turn accuracy — sustained tool use across a conversation — drops dramatically. When Berkeley added multi-turn categories in BFCL v3, no model cleared 60% on them at launch, and several otherwise-strong models landed in the 40s ([BFCL v3: Multi-Turn & Multi-Step, Berkeley, 2024](https://gorilla.cs.berkeley.edu/blogs/13_bfcl_v3_multi_turn.html)). Single calls are nearly solved. Sequences are not. A 90% headline and a sub-60% multi-turn reality describe the same model, and your production agent lives in the second number.

Klarna is the cautionary counterweight here. In February 2024 the company announced its OpenAI-powered assistant had handled 2.3 million conversations in one month — two-thirds of its customer service chats — doing the work of 700 full-time agents and resolving issues in under 2 minutes instead of 11 ([OpenAI](https://openai.com/index/klarna/)). A genuine triumph for tool use at scale. But by May 2025 Klarna was publicly walking some of it back and rehiring humans for the cases the system handled badly, with the company conceding that cost-driven automation had degraded service quality (reported by Bloomberg, May 2025). The 90% that works is spectacular. The 10% that doesn't is where the company learned, again, that valid is not the same as correct.

## So what does tool use actually mean for a production system?

It means the function call is the easy part, and your job is everything around it: validation that catches semantically-wrong-but-schema-valid output, an architecture where the model's actions are reversible, and an honest reliability number measured across sequences instead of single shots. That is the conclusion the evidence forces, and Honeycomb reached it before most of the industry started.

Return, now, to that six-week sprint in 2023. The team shipped Query Assistant on time, and then did the rarest thing in this field: they published what happened next. The retrospective was not a victory lap. Free-tier adoption came in around 39%, below what they'd hoped, hurt by discoverability. Usage of the assistant dropped sharply after a user's first week — people tried it, learned the query language it had taught them, and graduated to writing queries by hand. The feature's deepest success was, quietly, to make itself less necessary. Honeycomb reported all of this openly, including where it underperformed, and kept the feature in production at an API cost of roughly $100k a year — trivial against the value, but only because the system around the model absorbed the model's failures.

The engineer who sat down in March 2023 thought the hard problem was getting the model to emit the right function call. That was never the hard problem. The hard problem — the one that separates a demo from a system people trust with real money and real telemetry — is designing for a component that will be confidently, validly, schema-perfectly wrong a meaningful fraction of the time, and making sure that when it is, nothing breaks that you can't undo. The function call is where the work appears to be. It is not where the work is.