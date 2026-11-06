---
title: "Accept an Intended API Schema Change Without Losing History"
description: "Accept an intended API schema change by saving a new baseline with its reviewed diff, and keeping every earlier baseline so drift history survives."
pubDate: 2026-11-06
category: "building"
author: "Orvi"
readingTime: 8
tags: ["API schema drift", "API baseline", "breaking changes", "contract testing", "OpenAPI diff", "snapshot testing", "API versioning", "drift detection"]
featured: false
---

To accept an intended API schema change and keep your history, save the new schema as a dated baseline next to the old one. Attach the reviewed diff and a reason, then commit both. Don't overwrite the old file, because later drift checks need it.

I build [APIDiffGuard](https://apidiffguard.com), an open-source monitor for API schema drift, so "what is the before?" is the question every one of its comparisons depends on.

Picture a Thursday afternoon with a red pipeline. The failure is a snapshot mismatch, and the diff is four lines long: one field is gone, one is renamed, and everything else looks the same. Someone has already typed "looks right" in the pull request. The fastest route to green is one flag, such as Jest's [`--updateSnapshot`](https://jestjs.io/docs/snapshot-testing), that regenerates the snapshot file in place. A coding agent told to make CI pass can reach for the same flag, with nobody in the loop typing "looks right". I've seen that shape in my own agent. When X suspended my bot's account on 2026-07-21, the lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. A check that gives the right answer protects nothing if the code around it is allowed to move on. The moment you commit that, the previous contract is gone from the repository.

The awkward part is that the person who made the change is usually the one who accepts it. Regenerating a snapshot runs the same command whether you removed a field a consumer depends on or fixed a typo in a description. The reviewer sees a green check and a changed file. Nothing in that view says who reads the removed field, and nobody in the room is paid to ask.

## Is Overwriting the Baseline Actually the Problem?

Yes, and here's why. An overwritten baseline erases the only record of what the API promised before the change. Every later drift check depends on that comparison point.

A baseline is the "before" in a before-and-after comparison. Once the old copy is gone, the next run can only report what changed since the last acceptance, not what changed since the last version your consumers were actually tested against. An overwritten baseline isn't really a baseline. It's a rumor about what the API used to look like.

Golden-master practitioners have argued this for years. Regenerating a baseline should be a deliberate act, not a side effect of an ordinary test run. J. B. Rainsberger's [How Not To Write Golden Master Tests](https://blog.thecodewhisperer.com/permalink/how-not-to-write-golden-master-tests) covers the wider failure modes. That makes the review step the real control, not the tool. The trade-off between regenerating snapshots and diffing schemas is covered in [API snapshot testing vs schema diffing](https://www.robatdasorvi.com/chapters/building/api-snapshot-testing-vs-schema-diffing-for-drift).

## What Does a Safe Accept Look Like?

A safe accept adds a new dated baseline, the diff from the previous one, and a written reason in a single commit. The decision stays recoverable without checking out old code.

Here's a minimal sketch for your own repository, run as `accept-api-change.sh <live-spec> "<reason>"`. It never overwrites an existing baseline and isn't a feature of any product:

```bash
#!/usr/bin/env bash
set -euo pipefail

LIVE="$1"
REASON="$2"
PREV=$(ls -1d baselines/*/ 2>/dev/null | sort | tail -n 1 || true)
DIR="baselines/$(date -u +%Y%m%dT%H%M%SZ)"

if [ -e "$DIR" ]; then echo "baseline $DIR already exists" >&2; exit 1; fi
mkdir "$DIR"
cp "$LIVE" "$DIR/openapi.yaml"

if [ -n "$PREV" ]; then
  oasdiff changelog "${PREV}openapi.yaml" "$DIR/openapi.yaml" > "$DIR/diff.txt"
fi

printf '%s\n' "$REASON" > "$DIR/reason.txt"
[ -f "$DIR/diff.txt" ] && cat "$DIR/diff.txt"
read -r -p "Accept this diff? [y/N] " ok; [ "$ok" = y ] || { rm -rf "$DIR"; exit 1; }
git add "$DIR"
git commit -m "api-baseline: $REASON"
```

The script depends on the timestamp folder names sorting lexically, which this format guarantees. The script prints the diff and stops unless you type y, so a human reviews every accept. The commit message carries the reason, so `git log baselines/` becomes your drift history.

[oasdiff](https://github.com/tufin/oasdiff) covers the check itself: an ignore file keyed by method and path, a `--severity-levels` file to change a rule's severity, and `--fail-on ERR` for CI. I didn't find a built-in store of accepted changes, so the history has to live in your repository. The folder above is that store. APIDiffGuard's diff engine is MIT-licensed as `@apidiffguard/diff`. Its README doesn't describe an accept-and-rebaseline step, so the workflow here is a practice you can run with any diff tool, mine included.

## Which Changes Need More Than a Baseline Update?

Breaking changes need a consumer check and a deprecation path. Additive changes can be accepted with a logged diff. The table follows how Google and Stripe classify changes.

| Change | Classification | How to accept it |
| --- | --- | --- |
| Add an optional request parameter | Compatible; Stripe lists it as backward-compatible | Routine baseline with logged diff |
| Add a new endpoint or resource | Compatible; Stripe lists it as backward-compatible | Routine baseline with logged diff |
| Remove or rename a field | Breaking within a major version ([AIP-180](https://google.aip.dev/180)) | Deprecate first; accept only after consumer checks pass |
| Change a field's type | Breaking within a major version ([AIP-180](https://google.aip.dev/180)) | New field or new major version |
| Change a field's default value | Breaking per [AIP-180](https://google.aip.dev/180) | Treat as breaking until proven otherwise |

Since the 2024-09-30.acacia release, [Stripe](https://docs.stripe.com/api-versions) puts breaking changes only in named major releases, and the monthly releases between them contain only backward-compatible changes.

The schema file records only the part of the contract you wrote down. [Hyrum's Law](https://www.hyrumslaw.com/) covers the rest: "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." In practice that includes the order of items in a list. Inferring a schema from live responses, as described in [inferring JSON Schema from API responses](https://www.robatdasorvi.com/chapters/building/inferring-json-schema-from-live-api-responses-optional-fields-nullables-and-union-types-in-apidiffguard), catches some of that, but not ordering. A list that starts returning in a different order can be a contract change even when the schema file doesn't move, if consumers depend on that order. Stripe calls reordering the properties inside a response backward-compatible. Reordering the elements of an array is a different change, and a schema diff won't see it. That isn't a reason to alert on every reordering. For arrays whose order carries no meaning, sorting them before the diff is the right call, as the [JSON API response diff essay](https://www.robatdasorvi.com/chapters/building/cutting-noise-in-api-drift-alerts-how-apidiffguard-ignores-timestamps-ids-and-reordered-arrays) explains. The risk sits in the lists where consumers depend on order, and only a person can say which lists those are. A schema diff on its own, from any tool, can't tell you which consumers read a removed field. In [Pact](https://docs.pact.io/getting_started/how_pact_works), each consumer records the interactions it needs, so a field the consumer never reads can be removed without failing that consumer's check. That only answers the question for consumers who write contracts.

## Doesn't Ignoring the Diff Solve It?

Ignoring a diff is an accepted change that leaves no trace in the baseline. It's the silent accept again, now with a config file. Noise like timestamps and generated IDs should be handled by a normalizer that rewrites those specific fields before the diff, not by an ignore rule that suppresses a whole path. The normalization essay linked above covers that in detail.

The closest failure I've lived through wasn't an API diff, but it had the same shape. I run an approval-gated X growth agent, where every post, reply, follow and like goes through a Telegram approval I press by hand. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of that bot's daily comment attempts. Every run logged success, and nothing raised an error. A record that says success, with nothing checking it against the outcome, looks exactly like a healthy system. A blanket ignore rule produces the same kind of record.

The approval pipeline had its own version of this. The Telegram Skip button did nothing for months, so skipped items were counted as timeouts and the approval statistics were wrong. A wrong record doesn't announce itself. It just sits there looking like data.

## Isn't Git History Already Enough?

Git keeps the bytes, but a plain snapshot commit doesn't keep the decision. The reason and the diff have to travel in the same commit as the new baseline. Git is the right audit trail, and the dated folder is the artifact your drift check compares against.

## What Should You Do Before Pressing the Flag?

Copy the current spec into a dated baseline folder, write one line of reason, and run the consumer check before accepting anything breaking.

Write one sentence in `reason.txt` that names the field you removed and the consumer you checked. If you can't name that consumer, the change isn't accepted yet. It's deprecated, and the old field stays in the spec until someone who reads it signs off. Commit both files together, so the next drift check compares against the folder you just made instead of against nothing.