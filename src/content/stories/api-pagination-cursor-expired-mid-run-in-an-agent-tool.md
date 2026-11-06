---
title: "API Pagination Cursor Expired Mid-Run in an Agent Tool"
description: "When an API pagination cursor expires mid-run, an agent tool should resume from its last saved page key, not restart at page one or skip ahead."
pubDate: 2026-11-06
category: "ai-automation"
author: "Orvi"
readingTime: 8
tags: ["API pagination", "cursor expiry", "AI agent tools", "idempotency", "checkpointing", "Oracle ORA-01555", "deep pagination"]
featured: false
---

An API pagination cursor expires mid-run either because the server discarded the snapshot it pointed into, or because the cursor token itself carried a lifetime that ran out. For an agent tool, the fix is to checkpoint each finished page, resume from that checkpoint with a fresh cursor, and make writes idempotent so a replay doesn't duplicate anything.

It's easy to treat a pagination cursor like a bookmark that stays valid until you come back to it. It isn't. A cursor is a pointer into state the server still owns, and the server can discard that state on a schedule you don't control. Some cursors are stateless encoded keys that still expire through a TTL or key rotation; the fix below works for both.

## What does a pagination cursor actually promise?

A cursor promises continuity only as long as the server keeps the state it points into. Databases dealt with this decades before APIs did, and they called the failure "snapshot too old."

Oracle's read consistency rebuilds older versions of rows from undo data. A long query needs undo old enough to reconstruct the state it started with. If that undo has been overwritten, the query fails with ORA-01555, because other transactions changed those rows after the query began and the undo needed to rebuild the original version is gone. The Oracle 10g Release 2 reference (2005) gives the UNDO_RETENTION default as 900 seconds and calls it a low threshold, not a guarantee ([Oracle reference](https://docs.oracle.com/cd/B19306_01/server.102/b14237/initparams222.htm)).

Fivetran's connector docs still list ORA-01555 as a common failure when replicating large Oracle tables, so the problem has outlasted several database versions ([Fivetran](https://fivetran.com/docs/connectors/databases/oracle/troubleshooting/ora01555-snapshot-too-old)). Snapshot-backed API cursors, such as Elasticsearch scroll contexts, inherit the same constraint. The server still holds a snapshot for a window, and the client still has to finish inside it.

## Why does the same failure show up in an agent tool?

Because the tool treats a multi-page listing as one atomic read. Here's an illustrative walkthrough, not a logged incident. An agent is asked to reconcile 40,000 invoices through a paginated endpoint. It processes pages 1 through 211, writing each record to a CRM. Page 212 returns an expired-cursor error. The loop has no checkpoint, so the retry starts at page one.

Now the agent rewrites 211 pages of records. Some CRM writes are upserts and survive the replay. Others are inserts and duplicate. The first pass raised one error that the retry swallowed, and the second pass reports success.

The error code isn't standardized. Glean returns HTTP 400 with `expired_cursor` and tells callers to restart from a fresh first page ([Glean](https://developers.glean.com/errors/expired-cursor)). Other vendors use different codes for the same state. A tool that matches one code and retries generically will miss the rest.

Two public incidents this summer show the two halves of the problem: cursor paging that ends short with no error, and work that replays and duplicates side effects. Crossref's status page reports that from 2 to 6 July 2026, requests that used cursors to page through results finished early and did not return all requested records. The page doesn't state a root cause ([Crossref status](https://status.crossref.org/incidents/vnvdywk5bg2c)). In a Vercel Workflow GitHub issue opened on 6 July 2026, a reporter described an unrelated hook wake re-dispatching an in-flight step, so the step body ran twice concurrently. By the reporter's account, side effects duplicated, including a billed model call. The issue was closed on 10 July 2026 via PR #2848 ([vercel/workflow#2780](https://github.com/vercel/workflow/issues/2780)).

## What did teams do when snapshots expired before?

The database answers were restartable steps, key-range reads, and bigger undo. Dbplus's ORA-01555 guide lists the same options: run long queries in quiet periods, enlarge undo, make the query faster, and write long processes as a series of restartable steps ([dbplus](https://www.dbplus.tech/en/blog/ora-01555-how-to-preserve-undo-data-and-keep-queries-consistent)). Each one makes the unit of work small enough to finish inside the snapshot.

Elasticsearch went through the same change in its own tooling. Its docs say the scroll API is no longer recommended for deep pagination, and that paging past the default cap should use `search_after` with a point in time ([Elastic scroll API](https://www.elastic.co/guide/en/elasticsearch/reference/8.15/scroll-api.html)). The point in time is itself server-side state with a keep_alive, so it can expire too. What survives is the last sort value, which the caller holds and can resume from. The default cap is 10,000 hits, set by `index.max_result_window` ([Elastic pagination](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html)). The modern answer is keyset pagination: resume from a sort key the caller already holds, not from a server-side position alone.

Offset pagination is what most agent tools reach for first, and it fails differently. Knit's guide on pagination errors notes that offset pagination can skip or duplicate records when inserts land between pages ([Knit](https://getknit.dev/blog/how-to-handle-common-errors-and-invalid-requests-in-api-pagination)). You get wrong data and no error at all, which is worse.

## Isn't extending the cursor lifetime enough?

No. Asking the server to keep the snapshot longer is the most common counterargument, and the evidence cuts against it. Oracle's 12.2 reference says that in fixed-size undo tablespaces the parameter is ignored unless retention guarantee is enabled ([Oracle 12.2 reference](https://docs.oracle.com/en/database/oracle/oracle-database/12.2/refrn/UNDO_RETENTION.html)). Raising retention moves the cost onto storage. It doesn't remove the window.

The strongest counterargument is that most listings finish well inside any window, so the failure is rare. That's true, and it's exactly why the failure hides. Long runs make it likelier: a 40,000-record run that takes hours gives every slow page, retry, or rate-limit pause a chance to outlast the cursor's window, which on Elasticsearch is whatever keep_alive the caller set, often a minute in the docs' examples ([Elastic pagination](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html)). Without checkpoints, each of those runs replays from the start.

## How do you build a resumable pagination loop?

Persist a checkpoint after every item, resume with a key when the cursor is gone, and make the handler idempotent on the item's ID. The sketch assumes the API can filter by key (`after=`) and returns items sorted ascending by a unique, comparable ID. If the API has no key filter, restart the listing with a stable sort and skip any item whose ID is already in your store, using a set lookup rather than `<=`.

```python
class ExpiredCursorError(Exception):
    pass

def run_pagination(client, store, run_id, handle):
    ckpt = store.load(run_id) or {"cursor": None, "last_id": None}
    while True:
        try:
            page = client.list_page(cursor=ckpt["cursor"])
        except ExpiredCursorError:
            if ckpt["last_id"] is None:
                # Nothing stored yet: restart the listing from the beginning.
                ckpt = {"cursor": None, "last_id": None}
                page = client.list_page(cursor=None)
            else:
                # Snapshot aged out: resume by key, never by page number.
                page = client.list_page(after=ckpt["last_id"])
        for item in page.items:
            if store.seen(run_id, item.id):
                continue  # already handled before the restart
            handle(item)  # must be idempotent, keyed on item.id
            store.mark_seen(run_id, item.id)
            ckpt = {"cursor": ckpt["cursor"], "last_id": item.id}
            store.save(run_id, ckpt)  # durable, per item
        # Current page fully handled: only now advance the cursor.
        ckpt = {"cursor": page.next_cursor, "last_id": ckpt["last_id"]}
        store.save(run_id, ckpt)
        if not page.next_cursor:
            break
```

The table maps the symptoms you'll actually see to the fix for each one.

| Symptom | Likely cause | Fix |
|---|---|---|
| `expired_cursor` after hours of work | Server snapshot aged out | Resume by last stored key |
| Duplicate records after a restart | Replay with non-idempotent writes | Upsert keyed on item ID |
| Missing records with no error | Offset drift between pages | Keyset pagination on a stable sort |
| Restart always begins at page one | No durable checkpoint | Persist current-page cursor plus last finished ID after each item |

## Why is the silent retry worse than the error?

An expired cursor raises an error; a generic retry is what makes it silent. The X growth agent I built had the same shape somewhere else. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of its daily comment attempts. Every run logged success, and nothing raised an error. The Telegram Skip button also did nothing for months, so skipped items were counted as timeouts and the approval stats were wrong. Neither was a pagination bug. Both were the same failure: the tool reported progress while what it reported no longer matched what had actually happened.

The clearest case was the lockout check. On 2026-07-21 X suspended the account. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit.

A cursor failure is the sharpest version of that problem, since it sits on the boundary between your tool and state the server owns. The tool that holds up keeps its own record of what it finished and treats the server's position as disposable. The same reasoning shows up in [when an upstream API changes, your agent's tools break silently](https://www.robatdasorvi.com/chapters/ai-automation/when-an-upstream-api-changes-your-agent-s-tools-break-silently) and in [an agent that repeats actions after a Kubernetes pod restart](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-repeats-actions-after-a-kubernetes-pod-restart), where a restart replays work the agent had already done.

A cursor isn't a bookmark. It's closer to a lease on a snapshot the server can revoke whenever it likes, after a window set by its retention settings, its keep_alive, and its load. The durable record of progress has to live on your side. Once the tool owns its checkpoint, the expired cursor stops being an emergency and becomes one more page to resume from.