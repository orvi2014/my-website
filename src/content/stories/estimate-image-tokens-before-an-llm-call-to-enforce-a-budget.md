---
title: "Estimate Image Tokens Before an LLM Call to Enforce a Budget"
description: "Estimate image tokens before an LLM call with Claude's 28×28 patch formula: ceil(w/28) × ceil(h/28), capped per model tier. Includes a budget gate sketch."
pubDate: 2026-10-29
category: "building"
author: "Orvi"
readingTime: 8
tags: ["LLM cost control", "image tokens", "vision models", "token counting", "pre-flight budget", "Claude API", "agent engineering", "API budget"]
featured: false
---

To estimate image tokens before an LLM call, work out the image's visual tokens from its pixel size and add them to your text tokens. For Claude, the current [vision docs](https://platform.claude.com/docs/en/build-with-claude/vision) count one visual token per 28×28 pixel patch. So an image costs ⌈width ÷ 28⌉ × ⌈height ÷ 28⌉ tokens, after any downscaling its model tier requires.

For months I trusted the approval statistics in my X growth bot, and they were wrong. The Telegram Skip button did nothing, so every skipped item got logged as a timeout. The numbers looked precise and couldn't tell a skip from a timeout. A pre-flight image estimate can fail the same way. It produces a precise-looking number, and unless you log it beside the provider's own usage count, nothing tells you it is wrong.

## Is Estimating Image Tokens Worth the Trouble?

Yes, if one request can carry a large image and your budget is enforced per call. The same picture can cost up to about three times as many tokens, depending on the tier the model applies. At the caps, the standard tier tops out at 1,568 tokens and the high-resolution tier at 4,784.

[Anthropic's vision docs](https://platform.claude.com/docs/en/build-with-claude/vision) (2026) show the spread at ordinary sizes. A 1920×1080 image costs 1,560 visual tokens on standard-tier models and 2,691 on high-resolution-tier models, about 72% more for the same pixels. The model's price matters too. The docs put a 1000×1000 image at 1,296 tokens. That's about $1.30 per thousand images at Haiku 4.5's $1 per million input tokens, and about $5.18 per thousand at Opus 5.5's $4 per million, per [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing). An estimator that ignores the model is pricing a different request than the one that gets sent.

## What Do the Official Numbers Show?

The published rules are what a pre-flight check can actually use, so start there. Each row comes from the provider's own documentation. The last column applies the rule to a 1024×1024 image.

| Provider and model class | Rule as published | 1024×1024 image |
|---|---|---|
| Claude, standard tier (all other models) | 28×28 patches; long edge capped at 1,568 px; 1,568 tokens max | 1,369 tokens (derived) |
| Claude, high-resolution tier (4.7 and later) | Long edge capped at 2,576 px; 4,784 tokens max | 1,369 tokens (derived) |
| OpenAI gpt-4o, high detail | Fit in a 2048 px square, shortest side to 768 px, 512 px tiles, 85 base + 170 per tile | 765 tokens |
| OpenAI gpt-4o, low detail | Flat base cost | 85 tokens |
| Gemini | 258 tokens at or under 384 px; 258 per 768×768 tile above that | Depends on the crop and scale rule |

[Anthropic's token counting docs](https://platform.claude.com/docs/en/build-with-claude/token-counting) (2026) say Claude 4.7 and later models use a newer tokenizer that produces roughly 1.0 to 1.35 times as many tokens for the same text as earlier models. [OpenAI's image-input guide](https://developers.openai.com/api/docs/guides/images-vision) (2026) gives the gpt-4o high-detail rule in the table. [Google's Gemini token docs](https://ai.google.dev/gemini-api/docs/tokens) (2026) say images at or under 384 pixels count as 258 tokens, and larger images are tiled into 768×768 tiles at 258 tokens each.

You'll also see a shortcut: width × height ÷ 750, which gives 1,398 for 1024×1024 ([Roboflow](https://blog.roboflow.com/image-token-cost-vlm/)). It lands within about 2% of the patch count here, but it has no tier logic, so it can't enforce a cap.

## How Do You Estimate Claude Image Tokens in Code?

Apply the tier downscale first, count the patches, then add text tokens with headroom. The sketch follows the Claude rules above. Check the tier limits against the vision docs before you rely on them.

```js
const PATCH = 28;

// Limits from the Claude vision docs: long edge and max visual tokens per tier.
const TIERS = {
  standard: { longEdge: 1568, maxTokens: 1568 },
  highRes: { longEdge: 2576, maxTokens: 4784 },
};

// Models the docs list before 4.7 use the standard tier.
// Anything unlisted gets the larger tier, so an unknown model over-estimates.
const STANDARD_MODELS = new Set([
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
]);
const tierFor = (model) => (STANDARD_MODELS.has(model) ? "standard" : "highRes");

function imageTokens(width, height, tier) {
  const { longEdge, maxTokens } = TIERS[tier];
  const patches = (w, h) => Math.ceil(w / PATCH) * Math.ceil(h / PATCH);
  let scale = Math.min(1, longEdge / Math.max(width, height));
  let w = Math.round(width * scale);
  let h = Math.round(height * scale);
  while (patches(w, h) > maxTokens) {
    scale *= 0.99;
    w = Math.round(width * scale);
    h = Math.round(height * scale);
  }
  return patches(w, h);
}

export async function preflight({ guard, model, width, height, textTokens, maxOutputTokens, endUserId }) {
  const imageIn = imageTokens(width, height, tierFor(model));
  // Headroom only if textTokens came from a pre-4.7 tokenizer and the target is 4.7+ (up to ~1.35x).
  const textIn = tierFor(model) === "highRes" ? Math.ceil(textTokens * 1.35) : textTokens;
  const estimatedTokensIn = textIn + imageIn;
  return guard.check({ model, estimatedTokensIn, estimatedTokensOut: maxOutputTokens, endUserId });
}
```

For a 1000×1000 image on a standard-tier model, `imageTokens` returns 1,296, which matches the docs. The integration in the [noburn](https://noburn.dev) README uses the same fields. `guard.check` takes `model`, `estimatedTokensIn`, and `estimatedTokensOut`, and a blocked result means you skip the request. noburn makes its decision inside the caller's code, with no proxy, so the check only receives the fields you pass it: model, token estimates and end user. It never receives the image. Estimating is therefore the caller's job, and that is the trade-off of keeping a direct provider connection. The reasoning behind a gate like this is in [Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed](https://www.robatdasorvi.com/chapters/building/pre-flight-budget-checks-blocking-an-llm-call-before-it-is-billed).

## What Can an Estimate Not See?

An estimate built from pixel dimensions and a published rule sees only the input side, and only what you send. The output is invisible before the call. You can cap it with `max_tokens`, but you can't measure it in advance.

The tier is invisible too. It's set by the model string, so swapping models changes the image cost while the image and the code stay the same. The tokenizer change is invisible in the same way. The 1.0–1.35× spread depends on the text itself, and the client can't know where in that range a given prompt lands.

Gemini shows what happens when a published rule and an observed count disagree. A [Google developer forum thread](https://discuss.ai.google.dev/t/strange-image-token-counting-with-gemini-2-0-flash/82438) reports gemini-2.0-flash counting a 640×360 image at over 1,800 input tokens, far above what the documented 258-tokens-per-tile rule suggests for an image that size. The thread does not establish whether the documentation or the API count is wrong; either way, the gate cannot know.

That changes the design. A gate is only as good as its mirror of the provider's rule, so an unmapped model should fall to the larger tier, not the smaller one. The Messages API returns a `usage` object with the tokens actually used. Logging it next to every estimate is the only way to show the estimate was wrong. The noburn README's `guard.record` step takes the actual token counts after a successful call, which gives you the estimate-vs-actual pair to compare. The case for a hard cap over an alert, which rests on the same logic, is in [How to Set a Hard LLM API Spend Limit (Alerts Won't)](https://www.robatdasorvi.com/chapters/building/why-i-built-hard-spending-caps-for-llm-apis).

## Why Not Call the Token Counting Endpoint Instead?

Anthropic's token counting endpoint accepts images. The docs say it's free, subject to requests-per-minute limits separate from message creation ([token counting docs](https://platform.claude.com/docs/en/build-with-claude/token-counting), 2026). That's the obvious objection.

It answers a different question, though. It's a second request on the critical path, with its own rate limit. The docs describe its result as an estimate that may differ slightly. A gate that waits on a provider round trip also fails exactly when the provider is slow or down, which is when you most need a bound. Use the endpoint to calibrate the local function instead. Send a set of representative images, compare the counts, and fix the tier table wherever they disagree.

## What Should You Do Before Shipping This?

Before shipping, list every model string you call, note its tier, and default anything you haven't mapped to the high-resolution tier, so it over-estimates. Add up to 35% headroom to text tokens for Claude 4.7 and later if you counted them with an older tokenizer, and log the `usage` object from each response next to the estimate you sent. After a week, compare the two numbers. If they drift apart by more than your margin, the estimate is wrong, and the bill you were trying to control is telling you so.