---
title: "Detect a Renamed API Field Instead of Remove Plus Add"
description: "To detect a renamed field in an API schema diff, pair removed and added keys by type, shape and similarity, then flag them as a rename candidate to confirm."
pubDate: 2026-11-20
category: "building"
author: "Orvi"
readingTime: 9
tags: ["api-design", "schema-diff", "breaking-changes", "openapi", "json-schema", "api-versioning", "drift-detection", "rename-detection"]
featured: false
---

To detect a renamed field in an API schema diff, pair each removed property with an added one of the same type and a similar shape, then report the pair as a rename candidate. A plain diff only emits the two raw edits. Pairing is a separate step, and someone has to write it.

Git will call a deleted file and an added file one renamed file even when up to half of their content has changed. The Git documentation for [`gitdiffcore`](https://git-scm.com/docs/gitdiffcore) sets the default similarity threshold at 50% and treats any pair above that line as a rename. The threshold is a tunable number, not a fact about files. API diff tools face the same decision for JSON keys, and the threshold deserves to be just as visible.

## Why Does a Diff Show a Rename as Two Edits?

A schema diff compares two snapshots key by key, so a rename shows up as a removal and an insertion with no link between them.

Consider a user endpoint. Version 1 returns `"name": "Ada Lovelace"`. Version 2 returns `"full_name": "Ada Lovelace"`. The value is the same, the type is the same, and in this example the key sits in the same position, although JSON objects are formally unordered (RFC 8259), so position is a hint, not a guarantee. A human reviewer spots the rename at a glance. A path-based comparison sees one path disappear and another appear, with no idea they are the same field. JSON has no field identity beyond the key, so the key is the only thing the diff can follow, and the key changed.

Git has the same problem with files. It has to decide that a deleted path and an added path are one file, and it answers with a similarity score, not a proof. The score is the whole mechanism.

## What Breaks When Removed and Added Fields Are Reported Separately?

The consumer gets two findings for what is really one migration, and neither one says how the data moved.

A removal of `name` looks like a breaking change. An addition of `full_name` looks like a harmless new field. Read separately, the report implies that a value was deleted and an unrelated value was introduced. A strict consumer that requires `name` fails. A lenient consumer that treats missing fields as optional quietly gets `null` or nothing and keeps running. The report doesn't say which of those will happen.

Protobuf shows what a diff can do when a field has identity beyond its name. Every field has a number, so a rename is visible as one field whose name changed, not a delete plus an add. Buf's [breaking rules](https://buf.build/docs/breaking/rules/) still treat that rename as breaking under the FILE, PACKAGE and WIRE_JSON categories, through FIELD_SAME_NAME, because "JSON uses field names for serialization." Only the lenient WIRE category lets it through. JSON has no field number, so a JSON diff has to guess the identity Protobuf gets for free.

RFC 6902, published in April 2013, defines a `move` operation with a `from` and a `path`. The RFC itself says a move is "functionally identical" to a remove on the `from` location followed immediately by an add ([RFC 6902, section 4.4](https://www.rfc-editor.org/rfc/rfc6902#section-4.4)). That holds for the document. It doesn't hold for the migration plan, because the consumer needs to know the value survived.

## Can a Diff Pair Removed and Added Fields Automatically?

Yes. Score each candidate pair on type, shape and name similarity, then keep the pairs that clear a threshold and haven't already been claimed.

```python
from difflib import SequenceMatcher

def rename_candidates(removed, added, threshold=0.75):
    """removed, added: lists of (key, schema) under the same parent object."""
    pairs, used = [], set()
    for old_key, old in removed:
        best = None
        for new_key, new in added:
            if new_key in used or new.get("type") != old.get("type"):
                continue
            name = SequenceMatcher(None, old_key, new_key).ratio()
            shape = 1.0 if (old.get("format"), old.get("enum")) == (new.get("format"), new.get("enum")) else 0.0
            score = 0.6 * name + 0.4 * shape
            if score >= threshold and (best is None or score > best[0]):
                best = (score, new_key)
        if best:
            used.add(best[1])
            pairs.append({"from": old_key, "to": best[1], "confidence": round(best[0], 2)})
    return pairs
```

The 0.75 threshold and the 60/40 weighting are my choices, not a standard. The sketch is greedy. If two removed fields share a type and shape, the one scored first can take a match that belongs to the other. For small objects, an assignment solver over the full score matrix fixes that.

The signals don't carry equal weight. This table shows which ones matter most.

| Signal | Points toward rename | Points toward remove plus add |
|---|---|---|
| Same parent object | Yes | Different parent |
| Same JSON type and format | Match | Mismatch |
| [Same enum or sampled value shape](https://www.robatdasorvi.com/chapters/building/inferring-json-schema-from-live-api-responses-optional-fields-nullables-and-union-types-in-apidiffguard) | Match | Mismatch |
| Name similarity | High (`name` → `full_name`) | Unrelated (`email` → `plan_tier`) |
| Position among sibling keys | Adjacent | Far apart |

Name similarity is the noisiest of the five, even though the sketch weights it most heavily. `start_date` and `end_date` share most of their characters and are both strings, yet they are different fields. With no format or enum on either field, the sketch's shape check can't separate them. Only the 0.75 threshold keeps them apart (their composite score is about 0.73, not their name similarity alone), which is why sampled values and the position of sibling keys are worth adding as signals. Position is the weakest of these. Many serializers reorder keys, so treat adjacency as a tiebreaker only.

## Isn't Automatic Pairing Just Noise?

The strongest objection is that a false rename is worse than no rename. Teams should declare renames themselves and keep the diff literal.

That position has merit. A wrong pair tells a consumer that data moved when it didn't, and a reviewer who trusts the pair might skip the check. But declaration depends on the author remembering to declare, and the diff runs in CI against specs the author may not have touched in that commit. [Postman's 2024 State of the API report](https://www.postman.com/state-of-api/2024/), based on more than 5,600 developers and API professionals, found that 74% of respondents followed an API-first approach, up from 66% the year before (Postman, 2024). My inference, not Postman's finding: when the spec is the contract, the person reading a diff in CI is often not the person who made the change, and a rename declaration they never saw can't help them.

A better answer is to keep pairing out of the pass/fail verdict. Report a pair as `possible_rename` with a confidence score, and leave the breaking-change count to the literal diff. A false positive then costs a reviewer a moment of attention, not a failed build.

```json
{"type": "possible_rename", "from": "user.name", "to": "user.full_name", "confidence": 0.77, "action": "confirm; emit both keys until consumers migrate"}
```

## What Can a Diff Never See?

A diff sees paths, types and values in two documents. It can't see what the fields mean, who reads them, or what happens at runtime.

Back to the example. The diff can establish that `full_name` matches `name` in type and value. It can't establish that `name` used to be a username and now holds a display name, which would make the rename a semantic change wearing a cosmetic costume. It can't see whether a consumer still reads `name` from a cached response, whether the producer still writes both keys, or whether a client library maps the old key into a private model. None of those facts appear in either snapshot, so no comparison of the two snapshots can recover them.

I've seen a related failure in my own automation, though not in an API: numbers that looked right and weren't. The Telegram Skip button in my approval bot did nothing for months. Every skipped item got counted as a timeout, so the approval statistics were wrong. Separately, four hardcoded target accounts that no longer existed soaked up 88% of daily comment attempts for about six weeks, and every run logged success. In both cases a number was present and the number was wrong, and nothing in the data said so. A rename pair scoring 0.9 is the same kind of object: a measure of similarity that reads like a statement about meaning.

That limit changes the conclusion. A diff can see similarity but not intent, so a detected rename is a hypothesis, not a finding. The only way to settle it is a consumer-side check that the diff can't run.

## How Should a Detected Rename Be Reported?

Report it as a candidate pair with a confidence and a concrete next step, and leave the literal breaking-change list alone.

The next step matters more than the score. For a confirmed rename, the usual path is a deprecation window where the producer emits both keys, followed by a check of consumer reads before the old key goes. Two existing essays on this site cover the neighboring problems. [Accepting an intended API schema change without losing drift history](https://www.robatdasorvi.com/chapters/building/accept-an-intended-api-change-without-losing-drift-history) covers how to record a planned change so it stops alerting. [API snapshot testing versus schema diffing for drift](https://www.robatdasorvi.com/chapters/building/api-snapshot-testing-vs-schema-diffing-for-drift) explains why a snapshot and a diff answer different questions. Noise from fields that change on every call is a separate problem, covered in [JSON API response diff: how to ignore dynamic fields safely](https://www.robatdasorvi.com/chapters/building/cutting-noise-in-api-drift-alerts-how-apidiffguard-ignores-timestamps-ids-and-reordered-arrays). It matters here because a noisy diff teaches reviewers to dismiss the very candidate pairs you want them to read.

[APIDiffGuard](https://apidiffguard.com) is the schema-drift monitor I built. It monitors API responses, detects schema drift, compares versions and alerts before integrations break. Its diff engine, `@apidiffguard/diff`, is MIT-licensed in the [public repo](https://github.com/orvi2014/apidiffguard). I'm not describing rename pairing here as a shipped feature. Whether the engine should pair removed and added keys, and how it should report a pair, is the open design question this piece works through.

## Why Should a Rename Stay a Candidate, Not a Verdict?

Git's 50% threshold is a decision about where "same" begins, and the tool makes that decision on the reader's behalf. The number was never a fact about files. It marks the point where the tool stops claiming to know.

The same goes for the renamed field. A diff can tell you that `name` and `full_name` look alike, and that the consumer's response changed shape. It can't tell you whether the consumer still needs `name`. The honest output is a pair labeled as a candidate, a confidence the reader can argue with, and a question a test or a consumer has to answer. The removal and addition the diff reported at first were never the whole picture. The rename was the part the tool was least placed to know.