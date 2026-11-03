---
title: "Route LLM Requests by Model Capability: Tools, Vision"
description: "Route LLM requests by model capability first: drop models lacking tool calling or vision, then choose by cost. Filter hard requirements before price."
pubDate: 2026-11-03
category: "building"
author: "Orvi"
readingTime: 9
tags: ["LLM routing", "model capability", "tool calling", "function calling", "vision models", "LLM cost optimization", "AI agents"]
featured: false
---

To route LLM requests by capability, filter candidate models on the hard requirements first: tool calling, image input, context size. Then pick the cheapest model that survives the filter. Cost-based routing only makes sense after that filter, because a model that can't accept an image doesn't give you a worse answer. It gives you an error.

FrugalGPT (Chen, Zaharia and Zou, 2023) reported matching GPT-4's accuracy on the tasks it tested at up to 98% lower cost, by cascading each query through cheaper APIs first ([arXiv:2305.05176](https://arxiv.org/abs/2305.05176)). On the benchmarks FrugalGPT tested, cost routing works. The bigger risk is that cost-first routing sends requests to models that can't take them at all.

## Doesn't One Frontier Model Already Handle Everything?

It can, at the top price on every request. As soon as you add a cheaper model to cut that bill, you have a router, and the cheaper model may not accept the same inputs.

Cost routing is well-studied. RouteLLM (Ong et al., ICLR 2025) trains routers on human preference data to pick between a strong and a weak model for each query. The paper's abstract claims over 2x cost savings with minimal quality loss ([arXiv:2406.18665](https://arxiv.org/abs/2406.18665)). Berkeley Sky Lab's project page reports cost reductions above 85% on MT-Bench, 45% on MMLU and 35% on GSM8K, against a baseline that sends everything to the strong model, while keeping about 95% of GPT-4's performance ([sky.cs.berkeley.edu/project/routellm](https://sky.cs.berkeley.edu/project/routellm/)). Those are quality-and-cost results. RouteLLM doesn't address a request the weak model can't accept, and it doesn't address one the strong model can't accept either.

The routing decision therefore has two stages with different semantics. Capability is a boolean: the model can or can't process the request. Quality is a score. Mix them in one ranking and a cheap, high-scoring model can win a request it will reject.

## Don't Model Registries Already Say What Each Model Supports?

Registries say what their maintainers wrote down. Treat each flag as a claim to verify, not a fact to read off the page.

LiteLLM's pricing and capability file, `model_prices_and_context_window.json`, has boolean keys like `supports_function_calling` and `supports_vision`, and changes go through pull requests ([LiteLLM docs](https://docs.litellm.ai/docs/provider_registration/add_model_pricing)). That's a useful pre-filter. It's also a yes-or-no answer.

A boolean doesn't tell you whether a specific request will be accepted. Anthropic's vision documentation sets the limits that decide that: images up to 8000×8000 px, reduced to 2000×2000 px when a request contains more than 20 images, and a token cost of roughly width × height ÷ 750 per image ([Anthropic vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)). A 9000×9000 image fails on a model the flag says accepts images. The flag passes it through, and the per-request limit rejects it. For the token math on images specifically, see [Estimate Image Tokens Before an LLM Call to Enforce a Budget](https://www.robatdasorvi.com/chapters/building/estimate-image-tokens-before-an-llm-call-to-enforce-a-budget).

Here's the filter-then-score router in minimal form:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Model:
    name: str
    supports_function_calling: bool
    supports_vision: bool
    usd_per_mtok_in: float
    max_image_px: int
    context_window: int

class NoCapableModel(Exception):
    pass

def route(req, models):
    eligible = [
        m for m in models
        if (not req.tools or m.supports_function_calling)
        and (not req.images or (m.supports_vision and req.max_image_px <= m.max_image_px))
        and req.est_tokens <= m.context_window
    ]
    if not eligible:
        raise NoCapableModel(req.required_capabilities())
    return min(eligible, key=lambda m: m.usd_per_mtok_in)
```

The sketch is a shape, not a library. What matters is that `NoCapableModel` gets raised instead of falling through to a default model. One simplification to fix before using it: image limits depend on the request, not just the model. For Claude, the 8000 px cap drops to 2000 px once a request carries more than 20 images, so compute the limit from the request rather than storing one number per model.

| Request property | Hard filter (boolean or limit) | Score after filter |
|---|---|---|
| Contains image | `supports_vision`, image px limit | Input cost |
| Declares tools | `supports_function_calling` | Input cost, then tool-eval results |
| Any request | Context window ≥ estimated request tokens | Input cost |
| Plain text, no tools | None | Input cost |

## Isn't a Complexity Score Enough?

No. A complexity score ranks how hard a question is. It can't tell you whether the model can see the image in the request.

Semantic routers are built to answer the difficulty question. Baar-Core, the router I built, works this way: a cheap model (gpt-4o-mini) scores task complexity from 0.0 to 1.0, simple tasks go to the cheap model, and hard tasks go to the capable model unless the budget is too close, in which case they fall back to the cheap model ([Baar-Core](https://github.com/orvi2014/Baar-Core)). That design balances cost against difficulty. The README describes complexity scoring and a budget check; the capability check isn't among the features it describes. A difficulty score has no field for "accepts image." That gap is still open in my own router.

General quality doesn't predict tool-call reliability either. The Berkeley Function Calling Leaderboard (Patil et al., ICML 2025) evaluates function calling as its own capability, using abstract-syntax-tree checks that the authors say can scale to thousands of functions. Its authors report that current models handle single-turn calls well, while memory, dynamic decision-making and long-horizon reasoning remain open problems ([PMLR v267](https://proceedings.mlr.press/v267/patil25a.html)). A model that ranks high on general quality can still be the wrong pick for a request that needs a tool call. Tool calling needs its own gate.

## Won't a Fallback Chain Catch the Failed Calls?

Only when the failure is loud. Capability mismatches from providers are usually loud. The dangerous failures are the quiet ones.

Provider errors on unsupported input are often vague. A community thread on OpenAI's forum describes reasoning models returning "Invalid image URL: 'messages[1].content[1].image_url.url'. Expected a base64-encoded data URL with an image MIME type" for image requests, when the real cause was the model ([OpenAI community](https://community.openai.com/t/api-reasoning-models-without-image-support-returning-bad-validation-error-message/1110985)). A retry chain that treats every 400 as "try the next model" will handle that case. A chain that strips the image and answers from text will return a success.

I've already lived through silent success. In the Twitter growth agent I built, four hardcoded target accounts that no longer existed absorbed 88% of the bot's daily comment attempts for about six weeks. Every run logged success, and nothing raised an error. The article lane had a similar problem: JSON parse errors killed 8 of 20 generations, and each failure silently burned a 48-hour slot. A routing fallback can fail the same way: if the fallback strips the image and retries as text, the request still produces a green log line.

So the fallback rule is narrow. Retry on a capability mismatch only when the filter has already said another model qualifies. When nothing qualifies, raise `NoCapableModel` and stop. [Fall Back to a Local LLM When the API Budget Runs Out](https://www.robatdasorvi.com/chapters/building/fall-back-to-a-local-llm-when-the-api-budget-runs-out) covers the other direction: what to do when the capable model is also unaffordable.

## What Changes If Capability Is a Filter?

If capability is a hard filter before any score, three things change. A request no configured model can serve becomes a typed error someone sees, not a degraded answer nobody notices. Registry flags become tests: each model gets a sample image and a sample tool call in CI, so a wrong flag fails a build instead of a customer request. And the cost optimizer stops being the first thing the router consults. A cheaper model that can't see the image isn't cheaper for that request, and the router's job is to say so.

The same logic applies to budget guards. Baar-Core stops a request before the network call when the estimated cost exceeds the remaining budget. A capability filter does the same job for a request's shape: it stops a request before it reaches a model that can't process it. Both checks run locally, before the provider, and both turn a silent cost or a silent wrong answer into a failure you can count.