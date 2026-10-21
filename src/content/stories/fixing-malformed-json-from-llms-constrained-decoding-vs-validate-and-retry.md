---
title: "LLM Structured Output: Validation, Retry or Constrained Decoding?"
description: "Constrained decoding fixes JSON syntax, not silent failure. Why validate-and-retry loops for LLM structured output still lose work, and how to stop it."
pubDate: 2026-10-20
category: "ai-automation"
author: "Orvi"
readingTime: 8
tags: ["LLM structured output", "JSON validation", "constrained decoding", "retry logic", "LLM reliability", "AI agents", "production pipelines"]
featured: false
---

Most advice on LLM structured output comes down to validation and retry: ask for JSON, parse it, and retry when it breaks. If that's your whole plan, your pipeline is probably throwing away work right now. Constrained decoding is real and useful, but it solves a narrower problem than the one that actually costs you output. Validate-and-retry is the other common answer, and it fails in its own way. Getting reliable structured output from an LLM is a failure-handling problem before it is a parsing one. Which one you pick matters less than what your code does when the output is wrong.

The case here is mine, and it's small. The long-form article lane in the X growth agent I run asks a model for a structured article payload. The lane lost 8 of 20 generations to JSON parse errors. Each failure quietly burned a full 48-hour publishing slot. Nothing raised an error a human would notice, and the pipeline treated the lost slots as ordinary outcomes. The malformed JSON was the trigger. The damage came from the failure branch, which burned the slot instead of releasing it.

## Does Constrained Decoding Fix Malformed JSON From LLMs?

Partly. It fixes the syntax and shape of JSON when your framework supports your schema. It doesn't fix truncated, refused, or wrong-valued output. The mechanism is simple: at each step, the decoder masks out any token that couldn't continue a schema-valid answer, so the model can only produce something the schema allows.

The strongest evidence came from the vendors. In August 2024, OpenAI reported that gpt-4o-2024-08-06 with Structured Outputs scored 100% on its complex JSON schema-following evals, against under 40% for gpt-4-0613 ([OpenAI, 2024](https://openai.com/index/introducing-structured-outputs-in-the-api/)). That's a big jump, and it's real. OpenAI's Structured Outputs documentation notes that a response cut off at the token limit can come back incomplete, and the API can return a refusal instead of schema-shaped data ([OpenAI docs](https://platform.openai.com/docs/guides/structured-outputs)). A schema-valid guarantee doesn't protect you from an answer that got cut off.

The research is less tidy than the vendor numbers. The 2023 paper "Efficient Guided Generation for Large Language Models" by Willard and Louf showed that regex and grammar constraints can be enforced with a vocabulary index and little per-token overhead. It shipped as the Outlines library ([arXiv:2307.09702](https://arxiv.org/abs/2307.09702)). In January 2025, Geng and colleagues published JSONSchemaBench, which runs 10,000 real-world JSON schemas through six constrained decoding frameworks: Guidance, Outlines, Llamacpp, XGrammar, OpenAI, and Gemini. They found that coverage and compliance vary widely across frameworks, and that no framework handled every schema construct ([arXiv:2501.10868](https://arxiv.org/abs/2501.10868)).

So the guarantee belongs to a specific framework and a specific schema. If your decoder doesn't support some construct in your schema, you're back to validation, whether you planned for it or not.

## Does Forcing JSON Output Hurt LLM Reasoning?

Yes, it can. The 2024 EMNLP Industry paper "Let Me Speak Freely?" by Tam and colleagues found a significant drop in reasoning performance under format restrictions, and stricter constraints produced bigger drops on reasoning tasks ([arXiv:2408.02442](https://arxiv.org/abs/2408.02442)). Results on classification tasks were mixed. The paper also found that key order in a structured output can interfere with the model's reasoning.

What that means in practice: don't make the model reason inside the constrained field. Let it think freely, then convert the answer into the schema in a second step. The paper tested a version of this two-step approach, which it called NL-to-Format. If your schema has a field where the model has to think and then answer, the constraint is what's degrading the thinking. Retry-with-error-feedback adds tokens on every attempt, and [why long prompts lose accuracy](https://www.robatdasorvi.com/chapters/ai-automation/why-context-window-size-is-the-thing-every-developer-should-care-about) is a reason to keep the feedback short.

## Is Retrying Malformed LLM Output Wasteful?

No. A retry is cheap when it's bounded, carries the validator's error message back to the model, and has a hard budget. The unbounded retry is the bug.

Baar-Core started after an agent loop left running overnight produced a $47 bill. That wasn't a JSON retry, but any loop without a hard stop has the same shape. One more attempt costs very little. An attempt that never stops is another matter.

A bounded validate-and-retry loop looks like this in practice. Parse, validate against the schema, and on failure send the model the exact validation error along with the original output. Allow two or three attempts. If they all fail, return a typed failure to the caller, not a partial result. The retry budget is what keeps validation from becoming a second source of runaway spend.

```python
import json
from jsonschema import validate, ValidationError

def generate(prompt, schema, call_model, max_attempts=3) -> tuple[str, object]:
    messages = [{"role": "user", "content": prompt}]
    error = None
    for _ in range(max_attempts):
        reply = call_model(messages)  # assumed to expose .text, .finish_reason, .refusal
        if reply.refusal:
            return ("refused", reply.refusal)
        if reply.finish_reason == "length":
            return ("truncated", None)
        try:
            data = json.loads(reply.text)
            validate(data, schema)
            return ("valid", data)
        except (json.JSONDecodeError, ValidationError) as e:
            error = str(e)
            messages += [{"role": "assistant", "content": reply.text},
                         {"role": "user", "content": f"Invalid: {error}. Return JSON only."}]
    return ("invalid", error)
```

## Does Schema Validation Stop Silent LLM Failures?

Not by itself. A validator only protects you if its failure result changes what the caller does. A check that returns the right answer and then gets ignored is the same as no check at all.

My own suspension history is the clearest example. These weren't LLM output checks, but the failure shape is identical. On 2026-07-21, X suspended the account. The lockout check fired and returned True, but the caller skipped one action, and the loop kept running for 3.5 more days. The fix was a hard process exit and a sentinel file that only a human could clear, because launchd KeepAlive respawned a plain exit. On 2026-09-22, X suspended the account again. This time the lockout check matched none of its known selectors and never fired at all, and I stopped the bot by hand. The first check fired and was ignored. The second never fired. Either way, nothing stopped the loop.

The pattern shows up well outside my projects. In July 2025, during a code and action freeze, Replit's AI agent deleted a live production database belonging to SaaStr founder Jason Lemkin, and the agent later told him a rollback was not possible. The rollback in fact worked, according to [Heise's report on the incident](https://heise.de/-10499597), which also says the agent admitted it ran a database command without permission after it "panicked." The failure wasn't the model's inability to produce JSON. It was an agent that ignored an explicit freeze, then gave a confident and wrong account of what could be recovered.

A second case is the Air Canada chatbot. In February 2024, the British Columbia Civil Resolution Tribunal ruled against the airline in *Moffatt v. Air Canada* (2024 BCCRT 149). The support chatbot had told passenger Jake Moffatt he could claim a bereavement discount up to 90 days after his flight, but the airline's policy required approval before travel. The tribunal rejected the argument that the chatbot was a separate legal entity and ordered Air Canada to pay C$650.88 in damages plus interest and tribunal fees ([Canadian Press via Yahoo News](https://ca.news.yahoo.com/air-canada-must-pay-refund-040527669.html)). Neither case was a JSON failure. Both were a system acting on an answer nobody checked.

That's why I think structured output belongs next to agent safety, not next to parsing. The same silent-failure pattern is covered in [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars), and any automated checker needs its own verification, as in [LLM-as-a-Judge Reliability: Check Your Grader Against Human Labels](https://www.robatdasorvi.com/chapters/ai-automation/llm-as-a-judge-reliability-how-to-check-your-grader-against-human-labels).

## When Should You Use Constrained Decoding vs Validate-and-Retry?

Use constrained decoding when the provider or framework supports every construct in your schema and the field needs no reasoning. Use validate-and-retry when the schema has unsupported constructs, when you need semantic checks (ranges, enums tied to business rules, cross-field consistency), or when the provider has no constrained mode. Use both in production.

The table shows what each approach covers and where it still fails.

| Approach | What it guarantees | What it misses |
|---|---|---|
| Constrained decoding | Output matches the supported schema's syntax and shape | Truncation at the token limit, refusals, wrong values, schema features the decoder doesn't support |
| Validate-and-retry | Output that reaches the caller passes your validator | Truncated or refused output unless you check for them, semantic errors your validator doesn't test, and retries that can't fix a schema feature the model can't produce |
| Both, with a bounded budget | Schema-valid output that passes your semantic checks, or a typed failure | Wrong values your checks don't cover, and the cost of retries |

## How to Make LLM Structured Output Failures Visible

If constrained decoding is your only control, you'll still lose work whenever output is truncated, refused, or semantically wrong, and you won't know when it happens. If validate-and-retry is your only control, a missing retry budget turns one bad output into unbounded spend. Neither is enough alone.

So make every structured output call return a typed result: valid, invalid, truncated, or refused. Use constrained decoding where your framework supports the schema, and validate every response regardless. Retry invalid results within a fixed budget, feeding the validator's error back. When the budget runs out, raise an error and count it. A batch of 20 with 8 failures should show up as 8 failures, not 12 successes with a hole in them. Release the publishing slot instead of burning it. Alert on the count, not the logs.

Constrained decoding, validation, and bounded retry are three layers, and each one can fail. The only way to know they work is to count the failures. If your pipeline can't say how many structured outputs it lost last week, you don't have a fallback. You have a hope with a cron job.