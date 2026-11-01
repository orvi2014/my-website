---
title: "Pydantic vs Zod for Validating LLM Tool Call Arguments"
description: "Pydantic and Zod both silently drop unknown keys by default. How to close every schema and count rejections when validating LLM tool call arguments."
pubDate: 2026-11-01
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["pydantic", "zod", "llm tool calling", "structured output", "json schema", "ai agents", "input validation", "typescript"]
featured: false
---

For validating LLM tool call arguments, Pydantic and Zod fail the same way out of the box. They quietly drop any key the model made up and accept the rest. Use Pydantic for Python agents and Zod for TypeScript ones, then close every object. The closing matters more than which library you pick.

## Why does a validator pass a tool call with a made-up field?

Because nobody asked it to reject anything. Pydantic v2's `BaseModel` defaults to `extra="ignore"`, and Zod's `z.object` strips unknown keys. So a call like `{"order_id": 4411, "refund_amount_usd": 50, "reason_code": "damaged"}`, checked against a schema that only declares `order_id` and `refund_amount_usd`, comes back as a success with `reason_code` removed. The check ran, the call passed, and the model's belief that it had given a reason vanishes without a trace in your logs.

What bothers me about this failure is how quiet it is. No exception, no stack trace. The handler runs on a payload shorter than what the model wrote, and everything downstream looks normal. That is exactly why it survives.

## Has this kind of failure happened before?

Yes, and the closest old case is an interface that accepted a number without saying what it meant. Mars Climate Orbiter, lost in September 1999, is the clearest example. The NASA Phase I Mishap Investigation Board report, dated 10 November 1999, found that ground software produced output in pound-force-seconds where newton-seconds were expected, a factor of about 4.45 ([NASA Mishap Investigation Board via LLIS](https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf)). Every value was a plain number. Both were impulse values, and nothing in the interface said which unit system they used.

An LLM tool schema is the same kind of interface. A field typed as `number` accepts whatever the model believes a number is. Closing the object catches keys you never declared. It does not catch this second gap, a declared field whose meaning is ambiguous. For that, put the unit in the field name or description (`refund_amount_usd`) and add range constraints (`Field(gt=0, le=10_000)` in Pydantic, `.positive().max(10000)` in Zod).

## Pydantic or Zod: which one?

Pick the one that matches your agent's language, then configure both the same way. Both can export JSON Schema, which is what the model provider actually sees.

| Concern | Pydantic (Python) | Zod 4 (TypeScript) |
|---|---|---|
| Default for unknown keys | Ignored (`extra="ignore"`) | Stripped |
| Close one object | `model_config = ConfigDict(extra="forbid")` | `z.strictObject({...})` |
| Export to JSON Schema | `Model.model_json_schema()` | `z.toJSONSchema(schema)` |
| Coercion risk | Lax mode accepts `"5"` for `int` | Strict unless you use `z.coerce` |
| Nested objects | Only closed if the nested model is also closed | Same: close each level |

The selection usually comes down to the agent SDK you already use, since that decides what you pass in. Python agent SDKs such as OpenAI's `pydantic_function_tool`, Instructor, and PydanticAI take Pydantic models directly. TypeScript SDKs such as the Vercel AI SDK's `tool({ inputSchema })` (named `parameters` before AI SDK 5) and OpenAI's `zodFunction` and `zodResponseFormat` take Zod schemas directly. Both validate at runtime and both give you static types: Zod through `z.infer`, Pydantic through the model class itself.

A closed Pydantic model for the refund example looks like this:

```python
from pydantic import BaseModel, ConfigDict

class RefundArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    order_id: int
    refund_amount_usd: float

RefundArgs.model_validate({"order_id": 4411, "refund_amount_usd": 50, "reason_code": "damaged"})  # raises ValidationError: reason_code, Extra inputs are not permitted
```

The Zod equivalent is one function name away:

```typescript
import { z } from "zod";

const RefundArgs = z.strictObject({
  order_id: z.number().int(),
  refund_amount_usd: z.number(),
});

const parsed = RefundArgs.safeParse({ order_id: 4411, refund_amount_usd: 50, reason_code: "damaged" });
// parsed.success === false
```

Two details matter more than the syntax. Closing the root object does not close a nested `filters` object, so every level needs the setting. And a closed schema only rejects after the fact. Providers now offer grammar-constrained decoding that stops the extra key from being generated at all. OpenAI's Structured Outputs, announced on 6 August 2024, requires `strict: true` on the schema. The company reported that `gpt-4o-2024-08-06` scored 100% on its complex schema-following evaluations, against under 40% for `gpt-4-0613` ([OpenAI, 2024](https://openai.com/index/introducing-structured-outputs-in-the-api/)). Constrained decoding and a validator on your side do different jobs. Within the JSON Schema subset it supports, the provider guarantees the shape. Refusals, and responses cut off at the token limit, can still come back non-conforming, and your validator is what tells you when the guarantee did not hold. OpenAI strict mode also requires `additionalProperties: false` and every property listed as required. `extra="forbid"` emits the first in `model_json_schema()`, but optional fields need to be expressed as required-but-nullable to pass.

## Doesn't strict validation make the model reason worse?

Sometimes, and this is the strongest objection. Tam and colleagues tested format restrictions on reasoning tasks. They found strict formats hurt performance, and tighter constraints hurt more. They also noted that JSON output could place the answer field before the reasoning ([Tam et al., "Let Me Speak Freely?", arXiv 2408.02442, 2024](https://arxiv.org/abs/2408.02442)). If you force a tool call to fill in a JSON object before the model has reasoned, you may get worse decisions.

But the objection lands on how most teams apply schemas, not on schemas themselves. The paper's own results suggest where the damage comes from. Their natural-language-first variant, which reasons freely and converts the answer afterward, stayed closest to unconstrained performance. So give the model a free-text reasoning field or a separate step, then validate only the final arguments against a closed schema. Closing the object changes what the validator accepts. It does not change how the model thinks.

The paper's methodology was disputed by the Outlines team at dottxt ([“Say What You Mean”, 2024](https://blog.dottxt.co/say-what-you-mean.html)), who argued that the paper's prompts differed between conditions and its free-text answers were parsed leniently, and that structured generation done properly matched or beat unstructured output.

A broader benchmark points the same way. JSONSchemaBench (2025) gathered roughly 10,000 real-world JSON schemas and compared constrained-decoding frameworks on coverage and compliance, including Guidance, Outlines, XGrammar, and the OpenAI and Gemini APIs ([Geng et al., arXiv 2501.10868, 2025](https://arxiv.org/abs/2501.10868)). Real schemas vary a lot in what they can express. A closed schema your provider can't fully enforce still needs your validator as the backstop.

## A rejection nobody counted

My bot's long-form article lane lost 8 of 20 generations to JSON parse errors, and each failure silently burned a 48-hour slot. That is the mirror image of the dropped-key problem. The dropped key is a validator accepting too much. The article lane was real failures that nothing surfaced when they happened. Both are silent.

Earlier, four hardcoded target accounts that no longer existed absorbed 88% of the same bot's daily comment attempts for about six weeks, and every run logged success without raising an error.

The lesson carries over to tool calls: an unreliable output rate is survivable, but a rejection that has no counter, no alert and no reason attached looks exactly like a quiet day.

## What schema validation can't catch

The Replit database deletion in July 2025 is a different kind of failure. An agent acted destructively in production rather than sending a malformed argument. My reading is that it shares a root assumption: nothing between the agent and production treated a destructive action as exceptional ([eWeek, 22 July 2025](https://www.eweek.com/news/replit-ai-coding-assistant-failure/); the CEO's own response is in his public posts on X from July 2025, [@amasad](https://x.com/amasad)). Schema validation would not have caught it, because the commands were valid. The lesson that carries over is narrower: treat a destructive tool as its own tool with its own closed schema and a human approval step, rather than one more optional argument on a general-purpose tool. My X growth agent worked this way: every post, reply, follow and like went through a Telegram approval I pressed by hand.

## What to do when a call is rejected

When a call is rejected, return the validation error to the model as the tool result so it can retry with corrected arguments. Cap the retry count. Log each rejection with the field name, so you can see which keys the model keeps inventing. Alert on a repeat rejection of the same field, since that points to a schema the model is misreading rather than a one-off. For retry strategy in more depth, see the [LLM structured output essay](https://www.robatdasorvi.com/chapters/ai-automation/fixing-malformed-json-from-llms-constrained-decoding-vs-validate-and-retry).

## What should you change in your schemas today?

Close every object at every level, reject unknown keys, and count each rejection as a named failure. A tool call with an undeclared field fails quietly, the same way the article lane's parse errors did. The model believed it was sending something the handler understood, and it wasn't. In the hypothetical refund example above, `extra="forbid"` or `z.strictObject` turns the dropped `reason_code` into a validation error on the first call.

If you're building this now, two related posts go further. [LLM Structured Output: Validation, Retry or Constrained Decoding?](https://www.robatdasorvi.com/chapters/ai-automation/fixing-malformed-json-from-llms-constrained-decoding-vs-validate-and-retry) compares the retry and grammar approaches. [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars) covers silent failure more broadly. The library you pick matters less than the defaults you never changed.