---
title: "API Snapshot Testing vs Schema Diffing for Drift"
description: "API snapshot testing vs schema diffing: schema diffing reads the spec, but live response snapshots catch the drift clients hit in production. Code included."
pubDate: 2026-10-31
category: "building"
author: "Orvi"
readingTime: 8
tags: ["api testing", "snapshot testing", "schema diffing", "openapi", "api drift", "breaking changes", "api monitoring", "contract testing"]
featured: false
---

Snapshot testing and schema diffing both get sold as drift checks, but they look at different things. Schema diffing compares two versions of a spec document. Snapshot testing compares a response against a saved copy, and what it catches depends on whether that response is fetched live or replayed from a committed fixture. Only a live comparison sees the drift your clients actually receive.

Picture a green pull request: a two-line change to `openapi.yaml` passes the spec diff, no error-level breaking change is reported, and the merge goes through. Nothing in that check ever looked at the JSON leaving the server. The document and the wire are different objects, and a pipeline that runs only a spec diff compares only the first one.

## Why does a clean spec diff miss most real drift?

A clean spec diff tells you the document did not change in a breaking way. It does not tell you the server behaves like the document. APIContext (2024) analysed 650 million calls to more than 10,000 endpoints and found that 75% of the production APIs it tested varied from their published OpenAPI specifications, as [Nordic APIs reported](https://nordicapis.com/most-apis-suffer-from-specification-drift/).

Schema diffing tools are good at the job they were built for. The [oasdiff project](https://github.com/oasdiff/oasdiff) separates changes that break existing API clients from other changes, and its `breaking` command lists only those. But every one of those checks reads the document on both sides of the comparison. If the server starts emitting a field the spec never declared, the diff sees two identical files.

Behaviour can change with no schema edit at all. Google's API design guide counts changing a default value, or changing how a field with a default value is serialized, as a backwards-incompatible change ([AIP-180](https://google.aip.dev/180)). Neither touches a declared type, so a diff of declarations won't catch them. The same APIContext white paper, as [Nordic APIs reported](https://nordicapis.com/most-apis-suffer-from-specification-drift/), found that certain banking, fintech and bulk email management APIs showed 0% drift. Drift is unevenly spread. Don't assume your provider, or your own API, is in the clean group.

## Are snapshot tests the safer choice?

Not in its usual committed-fixture form. A snapshot committed to the test suite records your team's copy of a provider's response. It only changes when someone re-records it, usually when the test fails and somebody runs the update command. That makes it a regression test for your parsing code, not a drift detector for the upstream.

The tooling makes this worse. In [Jest issue #7257](https://github.com/jestjs/jest/issues/7257), a reporter said a custom snapshot resolver led Jest to flag all 45 snapshot files as obsolete, and running `jest -u` deleted them. [Issue #6655](https://github.com/jestjs/jest/issues/6655) describes a leftover file snapshot that Jest failed to flag as obsolete when an inline snapshot existed in the same test. Neither issue is about API drift, but both show that what a snapshot suite reports as current depends on bookkeeping that can fail quietly.

I've seen the same shape of failure outside APIs. In my Twitter growth agent, four hardcoded target accounts that no longer existed soaked up 88% of comment attempts for about six weeks, and every run logged success. A check that passes against the wrong target isn't safe, however green it looks.

## How often does a change actually break a client?

Less often than the alarms suggest, which is also why alerting on every diff fails. Xavier and colleagues (SANER 2017) analysed 317 Java libraries and 9,000 releases (library APIs, not web APIs, so treat this as an analogy). They found that 14.78% of API changes broke compatibility, and a median of 2.54% of client applications were affected, per [the UFMG repository record](https://repositorio.ufmg.br/items/fb93320e-9c9a-4f53-87c3-a1120a9c1a7c/full).

Those two numbers are the crux. If web APIs behave anything like those libraries, a tool that alerts on every change buries the roughly one-in-seven breaking changes under noise. A tool that alerts on nothing misses the consequences. Separating them means knowing which fields clients actually read, and neither a spec diff nor a server-side snapshot can tell you that on its own.

| Question | Schema diffing | Committed snapshot tests | Live response capture |
| --- | --- | --- | --- |
| What it reads | Two spec versions | Your fixture of provider output | Responses the server returns now |
| Sees spec-vs-server mismatch | No | No | Only if compared against the spec, not just a baseline |
| Sees undeclared fields | No | Only if re-recorded | Yes |
| Gates a pull request | Yes, `--fail-on ERR` | Yes | Yes, if run in CI against staging |
| Main failure mode | Trusts a wrong spec | Updates accepted without review | Noise from dynamic values |

## What does a drift check look like in code?

Run both. Use the spec diff as a cheap gate, then add a live shape capture that compares what the server returns against a stored baseline. The sketches below are minimal, and they aren't APIDiffGuard's implementation.

The spec gate fails the PR on error-level breaking changes:

```bash
oasdiff breaking base/openapi.yaml head/openapi.yaml --fail-on ERR
```

```python
import json
import requests

IGNORE = {"timestamp", "request_id"}  # dynamic keys that would churn the baseline

def shape(value, path=""):
    """Reduce a JSON value to {path: type}; values are discarded, types kept."""
    out = {}
    if isinstance(value, dict):
        for key, child in value.items():
            if key not in IGNORE:
                out.update(shape(child, f"{path}.{key}"))
    elif isinstance(value, list):
        out[path] = "array"
        for child in value[:1]:  # first element only, to bound output
            out.update(shape(child, f"{path}[]"))
    else:
        out[path] = "null" if value is None else type(value).__name__
    return out

def check(url, baseline_path):
    live = shape(requests.get(url, timeout=10).json())
    baseline = json.load(open(baseline_path))
    removed = [p for p in baseline if p not in live]
    added = [p for p in live if p not in baseline]
    changed = [p for p in live if p in baseline and live[p] != baseline[p]]
    return removed, added, changed
```

The baseline must come from the same `shape()` function, or the two sides won't compare:

```python
json.dump(shape(requests.get(url, timeout=10).json()), open(baseline_path, 'w'))
```

Because the function keeps types and drops values, a changed price usually won't fire (one that flips between an integer and a decimal will, since Python reports int and float separately), but a field that became `null` will. One trap: an empty array produces no `[]` child paths, so a list that comes back empty on one call reports every field inside it as removed. Treat removals under an array path as suspect until they repeat. The `IGNORE` set decides whether the check stays quiet, and choosing it is the hard part. I covered the trade-offs in [the essay on ignoring dynamic fields](https://www.robatdasorvi.com/chapters/building/cutting-noise-in-api-drift-alerts-how-apidiffguard-ignores-timestamps-ids-and-reordered-arrays).

## So why do teams keep trusting the spec?

The strongest argument for schema diffing is that it's deterministic, fast, and free of network flakiness. Live capture hits real endpoints that rate-limit, time out, and return different data on each call. That's right about cost and wrong about the conclusion.

The determinism belongs to a document that, per APIContext (2024), disagreed with production in 75% of the APIs tested. A check that is perfectly repeatable but measures the wrong object isn't safer. Most of the flakiness can be configured away. Normalise dynamic fields, pin the request set, and retry on 5xx. Noise you can tune away is a reason to improve the probe, not a reason to drop the only signal that reaches the client.

## Where does a drift monitor fit?

I built [APIDiffGuard](https://apidiffguard.com), which monitors API responses, detects schema drift, compares versions, and alerts developers before integrations break. It can also import an OpenAPI spec from a URL. Checks and OpenAPI import fetch URLs on a user's behalf; those outbound fetches block private hosts, re-validate redirects, and cap response size. The diff engine lives in the repository as the MIT-licensed `@apidiffguard/diff` package (`packages/diff-engine`). The repository is MIT-licensed and can be self-hosted. Its schema-inference work is covered in [the essay on optional, nullable and union fields](https://www.robatdasorvi.com/chapters/building/inferring-json-schema-from-live-api-responses-optional-fields-nullables-and-union-types-in-apidiffguard), and additive changes such as new enum values are covered in [the essay on enum values breaking agent tools](https://www.robatdasorvi.com/chapters/ai-automation/new-enum-values-break-agent-tools-detecting-additive-api-changes-that-spec-diffs-call-non-breaking).

What's still unsolved is classification. A tool can tell you a field changed. Only the consumer knows whether that field matters, and in the Xavier study even breaking changes reached a median of only 2.54% of client applications. Until a monitor can map a difference to the code that reads it, a human still makes that call.

## What happens to spec-only drift next?

By 2027-01-31, capture live responses for twenty endpoints of an API with a current OpenAPI spec, once a day for seven days, then compare each endpoint's captured field paths (the `shape()` function above gives you the live side) against the properties its OpenAPI response schema declares. I predict at least one endpoint will return a field path its OpenAPI schema does not declare. If none do, your API is closer to the 0% group APIContext found, and this argument is weaker for you. It's the one test in this post that doesn't require trusting anyone else's numbers.