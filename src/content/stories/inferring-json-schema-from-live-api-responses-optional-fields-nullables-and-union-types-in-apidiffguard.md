---
title: "Infer JSON Schema From API Responses: Optional, Nullable, Union"
description: "Infer JSON schema from API responses and you learn the sample, not the contract. Why optional fields, nullables and unions mislead drift checks."
pubDate: 2026-10-20
category: "building"
author: "Orvi"
readingTime: 8
tags: ["JSON Schema", "schema inference", "API monitoring", "API drift", "nullable fields", "union types", "APIDiffGuard"]
featured: false
---

A field present in 199 of 200 responses and a field present in all 200 are different facts. A presence-only inference rule turns both into a yes or no. That gap is the problem with the common advice to infer JSON schema from API responses. The algorithm isn't really the weak point. A schema inferred from responses records what the API happened to send, and every later check compares new traffic against that record.

## Is inferring JSON schema from API responses a solved problem?

The consensus says yes. Collect samples, merge them, mark any field missing from some sample as optional, widen mixed types into unions, and let the schema describe reality. That's a sensible starting point and a risky place to stop. A 2022 comparative analysis of JSON schema inference algorithms, published at ENASE, puts them side by side ([A Comparative Analysis of JSON Schema Inference Algorithms, ENASE 2022](https://www.scitepress.org/Papers/2022/110460/)). A 2024 BENEVOL paper by Stijn Brian Broekhuis and Vadim Zaytsev added user input to inference because sample data is sometimes inconclusive, and it tested the approach on five real-world JSON datasets ([Broekhuis and Zaytsev, BENEVOL 2024](https://ceur-ws.org/Vol-3941/BENEVOL2024_TECH_paper14.pdf)). When researchers send ambiguity back to a human, that tells you something about the algorithm.

## How do schema inference tools decide a field is optional?

The optional rule turns a count into a yes or no. A field present in 199 of 200 responses and a field present in 1 of 200 both end up looking like "sometimes," and a field present in all 200 gets promoted to required. The rule throws away the one number that mattered.

It's a simple rule, and plenty of tools ship it. The cljdoc `json-schema` library treats keys present in every document as required and keys present in only some as optional ([cljdoc, json-schema 0.3.1](https://cljdoc.org/d/luposlip/json-schema/0.3.1/api/json-schema.infer)). genson's merging works the same way, detecting which fields are always present and which show up only sometimes ([genson-rs](https://github.com/junyu-w/genson-rs)). Those are accurate descriptions of the sample. They say nothing about the contract.

Take a hypothetical endpoint. A sample of 200 responses includes `refund_status` in 199 of them. The inferred schema marks it optional, so when the field disappears, the drift check shrugs. The contract may well say the field is required, and that one missing response is the first visible sign of a regression. Absence in a sample is evidence about the sample. It is not evidence about what the API promised.

I have a case of this shape, though it isn't in schema code. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of my bot's daily comment attempts, and every run logged success. The logs were accurate about what they counted. They counted the wrong population, which is exactly what a schema inferred from a skewed sample does.

## Does a null value make a field nullable?

No. A null is a present value with a null type, and inference often merges it with absence in both directions.

In JSON Schema 2020-12, `null` is one of the primitive types, and a field accepts it only if the schema says so, usually by listing it in a type array ([JSON Schema Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)). An inferred schema that sees `null` once in 50 responses writes `["string", "null"]` and then allows null forever, including in the 49 responses where it never showed up. A one-off event has become a permanent allowance.

The consumer side is worse. To most clients, a key set to `null` and a key that is absent are different things, but `required` only tracks presence. A useful inferred schema has to record presence and nullity as separate counts. Most don't.

Here is a small example. Three responses from the same endpoint:

```text
GET /v1/orders/42   (response 1)  {"id": 42, "coupon": "X1"}
GET /v1/orders/42   (response 2)  {"id": 42, "coupon": null}
GET /v1/orders/42   (response 3)  {"id": 42}
```

A genson-style merge produces:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "coupon": { "type": ["string", "null"] }
  },
  "required": ["id"]
}
```

`coupon` is not in `required`, because one response lacks it, and its type list allows null, because one response sent it. The merged schema can no longer distinguish these pairs:

| Pair | Merged schema | What is lost |
| --- | --- | --- |
| `"X1"` vs `null` | both valid | that the field was ever null |
| `null` vs absent | both valid | whether the key was sent at all |
| `"X1"` vs absent | both valid | that the field is usually present |

## Should mixed types become a union or an error?

A union should be an alert, not a fix. When the same key holds an integer in some responses and a string in others, merging them into one type list gives you a schema that validates both futures.

Consider three responses from the same endpoint:

```text
GET /v1/items/1   (response 1)  {"id": 42}
GET /v1/items/1   (response 2)  {"id": 43}
GET /v1/items/1   (response 3)  {"id": "44"}
```

A type-merging inference rule produces:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": ["integer", "string"] }
  }
}
```

The merged result is `{ "type": ["integer", "string"] }` for `id`. In JSON Schema 2020-12, a type array means a value is valid if it matches any one of the listed types. So `42`, `43` and `"44"` all validate, and so would the next response, whether it sends an integer or a string ([JSON Schema Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)). The validator accepts the first response and the third equally, even though the third is a real change in what the API sends. The schema has lost the information that a string appeared at all.

A union is a schema that has agreed in advance to accept the drift. Automated merging makes that agreement silently, and the validator then passes every response, so nothing ever asks a human whether the change was intended.

## Isn't more sampling the fix?

This is the strongest counterargument, and it breaks for a specific reason. The argument goes that more samples converge on the true schema, and faster inference lets you collect more of them. genson-rs says in its README that it runs 25x to 75x faster than the Python GenSON library ([genson-rs](https://github.com/junyu-w/genson-rs)), so sampling keeps getting cheaper.

Convergence assumes the API holds still, and drift is change over time. A 10,000-response baseline from January can be perfectly consistent and still be wrong by October. More samples of the old API give you a more confident wrong schema, and a faster observer just reaches the wrong answer sooner.

Often the gap is the contract itself. Postman's 2024 State of the API report found that 58% of developers rely on internal documentation, and 39% say inconsistent documentation is their biggest roadblock ([Postman State of the API 2024](https://www.postman.com/state-of-api/2024/)). When no trustworthy contract exists, inference fills the gap with observation, and observation is the very thing that drifted.

## What should an inferred baseline record instead?

Don't let inference write the baseline. Let it propose changes, and make a person or a declared contract accept them.

Concretely: record presence frequency and nullity counts for each field on every run, and diff those counts over time instead of diffing the derived schema. In the hypothetical, if `refund_status` had been present in 200 of 200 baseline responses and then appeared in 199 of the next 200, a presence-frequency diff would raise a finding. Under the required/optional rule, the field only flips from required to optional on the next merge, and nothing alerts.

Where a declared contract exists, it should be the baseline. [APIDiffGuard](https://apidiffguard.com) monitors API responses, detects schema drift and compares versions; it can also import an OpenAPI spec. Ignoring timestamps and IDs is a separate problem, covered in the [JSON API response diff essay](https://www.robatdasorvi.com/chapters/building/cutting-noise-in-api-drift-alerts-how-apidiffguard-ignores-timestamps-ids-and-reordered-arrays). Deciding what counts as optional is the harder one, and it is the one this essay argues no inference rule settles on its own.

## Why this matters more when agents consume the API

Agents and LLM tool calls consume JSON whose shape no human rechecks, so a silently widened schema passes bad shapes straight through. A dashboard user who sees a blank field can ask what happened. A model reading the same response has no built-in reason to stop and ask.

The bot's long-form article lane lost 8 of 20 generations to JSON parse errors, and each failure silently burned a 48-hour slot. That failure came from the model's own output, not from an API response, so it is a different problem from drift. It shows the same pattern, though: a malformed payload that nothing flagged until the cost was already paid.

Structured-output features address the generation side by constraining the model to a JSON Schema you supply ([OpenAI, Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)). They do not check whether the schema still matches the API your tool calls, and that is the drift question this essay is about.

## What APIDiffGuard does today, and what is still unsolved

APIDiffGuard monitors API responses, detects schema drift, compares versions and can import an OpenAPI spec. It is open core under the MIT license, with a hosted Cloud as the paid path, and it offers three free tools that need no login: json-diff, json-formatter and json-validator.

Its diff engine, `@apidiffguard/diff`, lives in the repo as an MIT-licensed reusable JSON/API diff engine. A separate essay covers [why nobody used my open source project for three months](https://www.robatdasorvi.com/chapters/building/i-shipped-an-open-source-library-and-got-zero-users-for-three-months-here-is-what-i-learned).

Presence-frequency tracking, separate null counts and union-as-alert are the design argument of this essay, not shipped features. They are open questions for the project:

- Should presence frequency be tracked per field on every run, so that a drop from 100% to 99.5% raises a finding?
- Should null and absent be counted separately, so that a null is never folded into absence?
- Should a type union raise an alert for a person to accept, rather than merging silently?