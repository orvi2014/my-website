---
title: "Per-Tenant Rate Limiting in a Multi-Tenant Client Portal"
description: "Per-tenant rate limiting in a multi-tenant SaaS keys a token bucket on the tenant and weights it by cost. Counting requests alone misses the expensive work."
pubDate: 2026-11-01
category: "building"
author: "Orvi"
readingTime: 8
tags: ["per-tenant rate limiting", "multi-tenant SaaS", "token bucket", "noisy neighbor", "API rate limiting", "client portal", "Redis", "SaaS architecture"]
featured: false
---

A design for per-tenant rate limiting in a multi-tenant SaaS app is a token bucket keyed on the tenant and stored in something shared, such as Redis. The algorithm is the easy part. The hard part is choosing the unit: the tenant, the user, the credential, or the expensive operation. It's easy to pick one without noticing you picked.

A per-tenant limit can serve two different jobs: protecting the platform's shared database, or guaranteeing each tenant a fair share. Those jobs lead to different numbers, and it's worth deciding which one you're building before you ask who gets the 429 when the number is wrong.

## What counts as a tenant?

A tenant is the customer organisation, but the requests come from people, scripts and integrations inside it. A limit keyed on `tenant_id` treats all of them as one caller, so one enthusiastic user can spend the budget for everyone else in the same organisation.

I've seen this failure shape somewhere that isn't a SaaS app at all. For about six weeks, the approval-gated X growth agent I run aimed its comment attempts at four hardcoded target accounts that no longer existed. Those four took 88% of daily attempts, and every run logged success. Nothing raised an error. A limit keyed on the wrong identity fails the same way. It counts correctly against the wrong thing, and the dashboard looks healthy.

## Is a token bucket per tenant enough?

For the algorithm, yes. A token bucket tolerates bursts while holding a steady average rate. [Stripe (2017)](https://stripe.com/blog/rate-limiters) describes a request rate limiter that restricts each user to a set number of requests per second, and reports rejecting millions of requests in a single month. The algorithm is well understood. Keys and costs are where designs go wrong.

The obvious first sketch counts requests, and for a portal that's the wrong unit. A 2 KB status read and a 40 MB file upload cost the same single token. [OWASP's API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) files this under API4:2023 Unrestricted Resource Consumption. Its worked example describes a GraphQL upload endpoint with a request-rate limit in place, where an attacker batched many picture uploads into one request and the resulting thumbnail generation exhausted server memory.

So the bucket needs a cost parameter and a lane per class of work. This is the shape I'd start from, in Python with a Lua script for the atomic refill. Refill is computed from the timestamp stored with the bucket.

```python
import time

BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])   -- tokens per second
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1]) or capacity
local ts = tonumber(data[2]) or now
tokens = math.min(capacity, tokens + math.max(0, now - ts) * refill)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill) + 1)
return {allowed, tostring(tokens)}
"""

LANES = {
    "reads":   (5000, 80.0),   # capacity, tokens/sec
    "uploads": (200, 2.0),
    "exports": (20, 0.05),     # e.g. bulk PDF generation
    "all": (6000, 100.0),  # every request, cost 1
}

def take(r, tenant_id: str, lane: str, cost: int) -> bool:
    cap, rate = LANES[lane]
    key = f"rl:{lane}:{tenant_id}"
    allowed, _ = r.eval(BUCKET_LUA, 1, key, cap, rate, time.time(), cost)
    return bool(allowed)
```

The `now` value comes from the calling server, and I haven't settled that. If one server's clock lags another's, `now - ts` can go negative and drain tokens, and a timestamp written in the past makes the next caller over-refill. The sketch clamps elapsed time to zero, which stops the drain. It doesn't stop a lagging server from writing an old timestamp. The full fix is to read the time inside the script with `redis.call('TIME')`.

## Which identity should the bucket key on?

Each candidate protects something different and fails in its own way. Treat this table as a starting position, not a settled answer.

| Key | What it protects | How it fails |
|---|---|---|
| `tenant_id` | Shared database and file store | One tenant's bulk import starves its own users |
| `user_id` | A single login being abused | A tenant with 200 seats gets 200 times the budget |
| API key / integration | A runaway integration | A script that rotates keys sidesteps the limit |
| Operation class (cost) | Expensive work such as exports and uploads | Costs are guesses until you measure them |

In practice you want at least two layers. A tenant bucket stops any one organisation from taking the whole platform. A cost-weighted lane stops heavy work from hiding inside cheap request counts. In the sketch, that means every request first calls `take(r, tenant_id, "all", 1)` and then takes from its own lane at its real cost. A request that passes the first check and fails the second has still spent one tenant token, which is acceptable for a fuse. The two layers disagree often, and that disagreement is useful. When the tenant bucket trips but the cost lane doesn't, the load is many cheap requests; when the cost lane trips first, one class of heavy work is the problem. Adding a per-user bucket underneath tells you whether a single login is responsible.

## Isn't an approximate counter good enough?

The counterargument is to stop agonising and use an approximate counter, such as a fixed window or a sliding-window estimate, since approximations are fine for a fuse. That deserves a measured answer, and the best measurement I found is [Cloudflare's](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/). Across 400 million requests from 270,000 distinct sources, Cloudflare (2017) reports that 0.003% of requests were wrongly allowed or rate limited by its sliding-window approximation, with an average difference of 6% between the real rate and the approximate one. That figure is for the sliding-window approximation; a plain fixed window is worse, because it can admit up to twice the limit across a window boundary.

So the objection holds for a fuse, with a measured error bound. A 6% average error is fine for a fuse and unacceptable for a contract you've promised a customer in writing. So decide which of the two your limit is, and only then pick the algorithm.

## Shouldn't the gateway handle this?

A gateway with per-key limits is a sensible first layer, and I'd put the cheap check there. The problem is that a gateway sees requests, not work. It can't know that a bulk PDF export costs more than a thousand status reads. That's the same gap OWASP's thumbnail example describes: the limit is applied to the wrong quantity.

So the design is layered. The edge rejects obvious floods, and the service applies the cost-weighted tenant bucket, because only the service knows what the request will do.

## Who gets the 429, and who sets the number?

The failure I'd expect is that per-tenant limits end up as account settings, and the largest accounts get their numbers raised by hand after a support ticket. At that point the limit stops being a fairness control and becomes a commercial lever that happens to return HTTP 429. I don't have data on how common this is.

The requirement that follows is plain. Every override needs a reason and an expiry date, and the tenant should be able to see its own limit and current usage. A limit a customer can't see looks, from their side, like the product is broken.

Silent counters make it worse. The Telegram Skip button in my bot did nothing for months, so every skipped item was counted as a timeout and the approval statistics were wrong. A tenant limit with wrong counters produces the same confident, incorrect dashboard, and the people reading it have no reason to doubt it.

## Does anyone test the noisy neighbour?

In my reading, testing for noisy neighbours is the step most portals skip, because it needs a staging environment with more than one tenant misbehaving at once. The test is to check whether the system can identify and respond when a subset of tenants places a disproportionate load.

My X agent taught me the other half. A check that returns the right answer and then gets ignored by its caller is worse than no check, because it produces a log line that looks like protection. In the bot's account lockout, the check fired and returned True, but the caller skipped the action and the loop kept running for 3.5 more days. The check was correct. The enforcement wasn't. A per-tenant limit has the same two halves, and a test that only checks the counter misses the half that matters.

So the test I'd require before trusting a per-tenant limit is simple. One tenant floods the lane. The assertions are that other tenants' p95 latency and error rate stay within budget, and the flooding tenant gets 429s. I haven't written that test for a client portal, and I wouldn't trust a limiter I hadn't seen refuse a noisy tenant in staging.

## What is still unresolved?

Three things, and I don't have measured answers to any of them. First, the clock. The sketch uses the caller's time, and the right fix is reading time from Redis, which I haven't benchmarked. Second, the cost weights. The numbers in the `LANES` table are guesses until someone measures what an export costs against a read, and I don't know how much that varies across tenants. Third, webhooks and payment callbacks. They arrive from third parties whose traffic you don't control, and I don't yet know whether they belong in the tenant bucket, in their own lane, or outside rate limiting entirely.

The question I'd most like answered is whether cost weighting is worth its complexity for a small portal, or whether a plain per-tenant request bucket plus a hard ceiling on exports would catch nearly every real incident. That's a measurement, and until it exists, this design is a hypothesis. The same logic runs through the [spend caps I wrote about for LLM calls](https://www.robatdasorvi.com/chapters/building/cap-llm-spend-per-end-user-in-a-multi-tenant-saas-app), where the expensive unit was never the request either. Tenant isolation at the data layer has its own failure modes, covered in the [Postgres row-level security notes](https://www.robatdasorvi.com/chapters/building/postgres-row-level-security-for-a-multi-tenant-agency-client-portal-design-and-pitfalls), and the two problems meet wherever one tenant's workload can degrade another's.

The portal I have in mind is [AgencyHandy](https://agencyhandy.com), the client portal I build, where services, projects, files, invoices and payments live in one place. The design here is my working model for that kind of system, not a description of what the product does today. I don't yet know whether the cost-weighted lanes are necessary, and I'd rather find out from a staging run than from a tenant's support ticket.