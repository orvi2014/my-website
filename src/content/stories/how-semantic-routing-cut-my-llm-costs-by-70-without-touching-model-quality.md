---
title: "Semantic Routing: How I Cut LLM Costs 70% in Production"
description: "Semantic routing cut my LLM costs 70% without hurting quality. Most teams still send every request to the expensive model. Here is what actually breaks."
pubDate: 2026-07-14
category: "ai-agents"
author: "Orvi"
readingTime: 10
tags: ["semantic routing", "llm cost optimization", "cut llm costs", "ai agents", "model routing", "prompt caching", "production ai", "llm engineering", "cost reduction", "frugalgpt"]
featured: false
faq:
  - q: "What is semantic routing for LLMs?"
    a: "A classifier in front of the model call that sends different requests to different models based on what the request needs, not a load balancer that spreads identical traffic. Easy classification goes to a cheap model. Hard reasoning goes to an expensive one. Quality is the risk you take in exchange for the cost savings, which is why it needs a confidence threshold, not an unsupervised classifier."
  - q: "How much money does semantic routing actually save?"
    a: "In production I cut LLM costs about 70% without a measurable quality drop on the tasks we routed. The saving only holds if you monitor misclassification. Treat the router like a fraud model, not a routing table."
  - q: "Does semantic routing hurt output quality?"
    a: "It can, if the classifier is wrong. That is the new failure mode you did not have when every request hit the same model. A confidence threshold that falls back to the expensive model is the safety net. Most teams ship the classifier and skip the net."
  - q: "Is semantic routing just load balancing?"
    a: "No. Load balancing distributes identical requests across identical capacity. Semantic routing sends different requests to genuinely different models. Conflating them is how teams ship a router with load-balancer-level monitoring and only notice quality drift when a customer does."
---

I spent the better part of a year defending a decision I now think was wrong: routing every single request to the biggest model available because I was scared of the alternative looking cheap. Semantic routing for LLM cost reduction isn't a research curiosity anymore. It's the difference between an agent stack that survives its own success and one that gets killed in a budget review the first time usage 10x's. I found that out by almost getting killed in a budget review.

Here's the part nobody wants to say in public: most of us aren't routing based on task difficulty. We're routing based on vibes, and then writing blog posts that make the vibes sound like architecture.

## What Is Semantic Routing, Actually?

Semantic routing is a classifier that sits in front of your model calls and sends each request to the cheapest model that can handle it, based on what the query means and how hard it is. It's a traffic cop, not a genius.

The classifier is usually a small embedding model or a lightweight LLM, and it decides from the meaning and difficulty of the query, not its length or source. The reason this gets dressed up in fancier language is that "traffic cop" doesn't sound fundable. But that's what it is. You embed the incoming prompt, compare it against clusters of past queries labeled by which model handled them well, and route accordingly. Stanford's FrugalGPT paper from 2023 formalized the idea of cascading through cheaper models before escalating to expensive ones. It reported that a cascade could match GPT-4's performance with up to 98% lower cost, or beat GPT-4's accuracy by 4% at the same cost, by escalating only the queries that actually needed it ([Chen, Zaharia & Zou, arXiv:2305.05176, 2023](https://arxiv.org/abs/2305.05176)). That number sounds absurd until you sit with your own logs and realize how many of your "important" queries are actually "what's your refund policy" restated eleven different ways.

The uncomfortable truth is that the router isn't discovering hidden complexity in your traffic. It's discovering that you never needed the expensive model for most of it in the first place. You just didn't know that until something measured it.

## How Much Money Does Semantic Routing Actually Save?

Published results range from about 35% to 98% in cost reduction, depending on how much of your traffic is simple queries. In my own production stack it was 70%. Most production agent stacks have a lot more simple traffic than the team building them wants to admit. My number comes from three months of a Twitter reply-and-outreach agent handling a mix of intent classification, short replies, and longer strategic drafting.

The research backs this up, but the size of the saving depends heavily on the workload. RouteLLM, from LMSYS and UC Berkeley in 2024, trained routers on human preference data from Chatbot Arena. Compared with sending everything to GPT-4, it reported **over 85% cost reduction on MT-Bench, about 45% on MMLU, and about 35% on GSM8K**, while keeping 95% of GPT-4's quality ([Ong et al., arXiv:2406.18665, 2024](https://arxiv.org/abs/2406.18665)). That spread is the most useful number in the paper. On a conversational benchmark full of easy prompts, routing saves almost everything. On a knowledge benchmark where most questions are hard, it saves less than half. Microsoft's Hybrid LLM work (ICLR 2024) took a more conservative approach and still made **up to 40% fewer calls to the large model with no drop in response quality** ([Ding et al., arXiv:2404.14618, 2024](https://arxiv.org/abs/2404.14618)).

**Routing doesn't save a fixed percentage. It saves whatever share of your traffic never needed the big model, so you can only know your number after you measure your own traffic.**

Here's where my 70% came from. These are list prices per million input/output tokens from [Anthropic's pricing page](https://www.anthropic.com/pricing):

| Tier | Task type | Model | List price (in / out per 1M) | Share of requests | Monthly cost before (all Opus) | Monthly cost after routing |
|---|---|---|---|---|---|---|
| Cheap | Intent classification, spam/irrelevance filtering | Claude Haiku 4.5 | $1 / $5 | [TODO]% | $[TODO] | $[TODO] |
| Mid | Short replies under 280 characters | Claude Sonnet 4.6 | $3 / $15 | [TODO]% | $[TODO] | $[TODO] |
| Expensive | Long-form strategic drafting, low-confidence escalations | Claude Opus 4.8 | $5 / $25 | [TODO]% | $[TODO] | $[TODO] |
| **Total** | | | | **100%** | **$[TODO]** | **$[TODO] (−70%)** |

The arithmetic is simple. The cheapest tier costs a fifth as much per token as the top tier, so most of the saving comes from how much volume you can move off Opus, not from any single clever routing decision. The expensive tier stays the same size, or grows slightly, because the confidence-threshold escalations land there.

None of these numbers are about the model getting smarter. They're about admitting the large model was doing a lot of unnecessary work. That's a hard thing to admit when the large model's invoice is the thing justifying your budget request to leadership.

## Why Do Experienced Teams Still Route Everything to the Expensive Model?

Because nobody gets blamed for the bill when the eval scores look perfect, and everybody gets blamed for the one embarrassing output that a cheap model produces in front of a client. That asymmetry, not technical ignorance, is the actual reason so many teams with real routing infrastructure sitting unused still send 100% of traffic to Opus or GPT-4-class models by default.

I've sat in the planning meeting. Someone proposes routing simple intent-classification calls to a cheaper model. Someone else says "what if it gets one wrong in front of the CEO," and the conversation ends there, because nobody in the room can quantify the actual risk on the spot, and everybody can vividly imagine the specific bad outcome. Fear with a face beats a percentage on a slide every time. So the safe move, expensive-model-for-everything, survives quarter after quarter, dressed up as "quality first," when it's really just "I don't want to be the one explaining a mistake."

This is the unsaid part. Most senior engineers I know privately think their production traffic is over-provisioned by 2-3x on model tier. Almost none of them will say that in a public design doc, because the design doc becomes the artifact someone points to later.

## Does Semantic Routing Actually Hurt Output Quality?

A well-designed router barely hurts quality. On correctly routed queries the quality difference is close to zero, and the failures cluster near the difficulty boundary instead of spreading randomly across your traffic. That predictability is the whole point; it's the thing that turns "quality risk" from a vague fear into a measurable, patchable surface.

The honest counterargument is that routers misclassify edge cases, and when they do, a query that needed the expensive model gets stuck with a weak one and the output is visibly worse. This happens. RouteLLM's own evaluation shows that quality rises with the share of calls sent to the strong model. That means the queries the router gets wrong sit near the difficulty boundary, where the classifier is least confident ([arXiv:2406.18665](https://arxiv.org/abs/2406.18665)). But the fix isn't to abandon routing. It's to route on confidence, not just classification. When the router's confidence score falls below a threshold, you escalate to the expensive model automatically. That single guardrail closes most of the gap, because it converts "the router might be wrong" into "the router knows when it might be wrong," which is a solvable problem instead of an existential one. **A router without a confidence threshold is a coin flip with a cost-savings slide attached.**

What actually degrades quality in the field isn't the router being wrong occasionally. It's teams building a router once, shipping it, and never re-training it as their traffic mix shifts. A router trained on last year's query distribution silently drifts into misclassifying this year's traffic, and because nobody's watching the classifier's confidence scores in production, the degradation looks like "the model got worse" instead of "our router is stale." I've watched this happen to my own system after adding a new content pillar. The classifier had never seen that shape of query and quietly misrouted it for two weeks before anyone noticed the reply quality had dropped.

## What Breaks When You Add an LLM Router to Production?

Three things break, in this order: your evals, your cost attribution, and your prompt cache. Most eval suites assume one model handled every response, and a router breaks that assumption on day one. The second thing that breaks is cost attribution. Someone in finance asks "why did the average cost per request drop 70% but the total token count barely moved," and you realize you now need per-tier cost tracking you never built.

The third thing, and the one nobody warns you about, is caching. Anthropic's prompt caching reuses previously processed prompt prefixes. Cache reads are billed at 10% of the base input-token price, which is where the "up to 90% cheaper, up to 85% faster" figures for long repeated prompts come from ([Anthropic, Prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). A naive router that shuffles requests between models on every call destroys your cache hit rate, because caches are scoped to a single model and an exact prompt prefix. **Every time your router switches models mid-conversation, you pay full price to rebuild a cache you already paid for.** I lost most of a week's savings this way before realizing my router was alternating models on near-identical consecutive requests instead of holding a sticky classification per conversation thread. The fix was embarrassingly simple: cache the routing decision alongside the conversation, not just the prompt. But I only found the bug because the savings number stopped moving and I went looking for why, not because anything alerted me.

## Is Semantic Routing Just Load Balancing With a New Name?

No, load balancing distributes identical requests across identical or near-identical capacity to manage throughput, while semantic routing sends different requests to genuinely different models based on what the request needs. The distinction matters because load balancing never risks quality; semantic routing always does, in exchange for the cost savings, which is exactly why it needs the confidence-threshold safety net and not just a classifier running unsupervised in production.

The two get conflated because both sit in the same place in your stack, in front of the model call, making a routing decision before the request goes out. But conflating them is how teams end up shipping a router with load-balancer-level monitoring, which means nobody notices quality drift until a customer does.

## Is Semantic Routing a Reliability Risk?

Yes. A router adds a new failure mode, misclassification, that didn't exist when every request went to one model. Most teams ship it with less monitoring than they'd put on a database migration.

Every team I've talked to that adopted semantic routing treated it as a cost project. Almost none of them treated it as a reliability project, and that's backward. The savings are real and the papers back it up. But running a router safely in production takes the discipline you'd apply to a fraud-detection model, not a routing table. That means logging confidence scores, sampling misroutes for review, and retraining when the traffic mix shifts. Almost nobody is building it that way yet. So when the first wave of embarrassing "the AI said something dumb" incidents gets publicly traced to a root cause, the cause will be a stale, unmonitored router, not a bad base model.

My prediction, and it's a narrow one: within the next two years, the routing layer itself becomes the thing vendors charge for and audit, the same way API gateways became a paid, monitored layer instead of a bit of glue code teams wrote themselves. The teams still running an unmonitored classifier they built in an afternoon are the ones who'll be explaining an incident report to someone who asks "wait, what actually decided to use the cheap model here?", and won't have a good answer.

## Related reading

The reason dumping everything into one giant model is a bad substitute for routing is [Lost in the Middle: why your context window still feels too small](/chapters/ai-automation/why-context-window-size-is-the-thing-every-developer-should-care-about). Retrieval has the same cost-versus-trust problem: [RAG hallucination rate, 17-33%](/chapters/ai-agents/rag-is-not-enough-what-retrieval-still-gets-wrong-in-2026).

---

**I left blanks in the cost table on purpose. You need to fill them in before publishing.** There's no per-tier cost or usage data in the repo (`core/claude.js` has no model routing or usage logging). Any request shares or dollar amounts I wrote would have been made up and presented as your production numbers. The model prices and table structure are real. The `[TODO]` cells need numbers from your Anthropic usage dashboard or billing.

One thing to check when you do: Haiku costs a fifth of what Opus costs per token. For the after column to total −70%, roughly 85-90% of your token spend has to move off Opus. If your real numbers come out well below 70%, change the headline figure rather than the table.

A few other changes:
- **Microsoft paper corrected:** the original line about "pushing the easy 60-70% of traffic" isn't what Ding et al. say. The paper's claim is "up to 40% fewer calls to the large model with no drop in response quality."
- **RouteLLM corrected:** it now says over 85% on MT-Bench and about 45% on MMLU, and I added the paper's about 35% on GSM8K.
- **Headings:** the last H2 is now a question ("Is Semantic Routing a Reliability Risk?"), and I reworded "What Actually Breaks…" into a search-style question.