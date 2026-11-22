---
title: "AI Agent Reads Stale Data From a Read Replica After a Write"
description: "An AI agent reads stale data from a read replica after a write due to lag. Pin post-write reads to the primary, or wait until the replica has the write."
pubDate: 2026-11-21
category: "ai-agents"
author: "Orvi"
readingTime: 6
tags: ["ai agents", "read replicas", "replication lag", "read-your-writes", "database consistency", "agent tools", "distributed systems"]
featured: false
---

An AI agent reads stale data from a read replica after a write because the replica applies changes asynchronously and may not have them yet. The fix is to send that session's reads to the primary until the write is visible, or to wait until the replica has passed the write's log position.

For months, my approval-gated X bot counted every skipped item as a timeout, because the Telegram Skip button silently did nothing. Nothing raised an error, and the numbers looked plausible. A stale replica read fails the same way: the answer is wrong and looks right. I have not run a read replica behind an agent in production, so this is not a replica postmortem.

## Why does an agent read stale data right after it writes?

Because a replica is a copy that trails the primary, and the agent's next read can land on the copy before the change arrives. The [PostgreSQL streaming replication docs](https://www.postgresql.org/docs/current/warm-standby.html) and the [MySQL replication docs](https://dev.mysql.com/doc/refman/8.0/en/replication.html) describe replication as a stream of changes applied in order, so by default the replica can be behind the commit.

Vogels named the guarantee that breaks here. In "Eventually Consistent" (ACM Queue, 2008), he defines read-your-writes as a model where a process that updated a data item can always read the updated value afterward, never an older one ([ACM Queue, 2008](https://queue.acm.org/detail.cfm?id=1466448)). A replica doesn't promise that by default. It promises the copy will catch up eventually.

The lag isn't a fixed number. Amazon's Aurora documentation says heavy workload on the writer can cause temporary replica lag, and long-running transactions cause it too ([AWS Aurora MySQL replication docs, current](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/AuroraMySQL.Replication.html)). An agent that writes during a busy period is exactly the workload that widens the gap. Aurora's replicas read from a cluster volume shared with the primary, so no separate copy of the data is replicated. A replica can still serve a stale page from its cache until the writer's changes reach it, and AWS tracks that gap with the `AuroraReplicaLag` metric. On classic binlog or WAL streaming replicas, which copy the changes to a separate store, lag has no built-in ceiling and grows with write load; the MySQL and PostgreSQL docs linked above set no upper bound on it.

## Why do experienced people still get this wrong?

Because the lag they measure is usually small, and the failure lives in the tail nobody looks at. A dashboard shows an average, the average is under a second, and the team decides the problem is handled. The read that matters for an agent is the one that follows its own write inside that second.

The surrounding system rewards the mistake. A replica gets bought to take read load off the primary, and its success is measured in primary CPU saved, not in whether any single read was correct. The agent framework treats a tool result as truth, so a stale row arrives looking identical to a fresh one. It's the same failure as a kill switch read from a cache: the agent obeys a value that was true a moment ago ([kill switch: cached flags and leases](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-kill-switch-not-working-cached-flags-and-leases)). Nothing in the trace marks it as old.

Percona (2018) put the root cause plainly: MySQL replication is asynchronous by default, and that is what produces the stale read ([Percona, 2018](https://www.percona.com/blog/2018/11/29/mysql-high-availability-stale-reads-and-how-to-fix-them/)). The post also reports that customers who enabled semi-synchronous replication hoped the problem would go away. It did not.

## Which fix actually stops the stale read?

Only fixes that tie the read to a position the write has already reached. Routing everything to the primary works, but it throws away the replica. The smallest correct version records the write's position on the session and refuses any replica that hasn't reached it.

```python
def read_for_session(session, query):
    pos = session.last_write_position  # Postgres LSN, set on commit via pg_current_wal_lsn()
    if pos is None:
        return replica_pool.run(query)
    for replica in replica_pool.replicas():
        if replica.applied_position() >= pos:
            return replica.run(query)
    return primary.run(query)  # nobody has caught up: pay for correctness
```

On MySQL, GTIDs are sets, not ordered numbers, so swap the comparison for [WAIT_FOR_EXECUTED_GTID_SET(gtid, timeout)](https://dev.mysql.com/doc/refman/8.0/en/gtid-functions.html) on the replica, or GTID_SUBSET(gtid, @@gtid_executed). ProxySQL 2.x can do this routing for you with GTID-consistent reads, provided each replica runs `proxysql_binlog_reader` and has GTID enabled.

The trade-offs are concrete enough to decide from:

| Approach | Stops stale reads for the writer? | Cost |
|---|---|---|
| Read everything from primary | Yes | Replica is unused, primary carries all load |
| Pin session to primary for a time window | Mostly | Window guesses at lag; a slow replica still breaks it |
| Route by log position (LSN/GTID) | Yes | Needs position tracking through the router and failover |
| Semi-synchronous replication | Not reliably | Write latency, and Percona reports stale reads persist |

The time-window version is tempting because it needs no new plumbing. It fails on the day the replica is slow, which is the day it matters.

## Isn't the lag so small that a retry is enough?

No. Retrying doesn't help an agent, because the agent often has no reason to retry. It got a row, found it plausible, and acted on it. A retry only helps code that checks for absence, and a stale read usually returns a present but old value.

The other objection is that synchronous replication removes the problem. Only some modes do. In PostgreSQL, replication is asynchronous unless `synchronous_standby_names` is set. Even then, the default `synchronous_commit=on` waits for the standby to flush the WAL, not to replay it, so a standby read can still be stale. Only `remote_apply` waits for replay ([PostgreSQL docs](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)). MySQL semi-sync acknowledges receipt into the relay log, not apply, which is why Percona's customers still saw stale reads. Any mode that does guarantee it makes every write wait for the replica. Percona's 2018 post notes that each fix comes with pros and cons. For an agent that writes once and reads many times, that trade may be right. For an agent that writes in bursts, it moves the stall from the read path to the write path.

## What do documented replication incidents show?

I haven't found a public postmortem of an AI agent acting on stale replica data. The closest documented cases are database incidents, not agent incidents.

GitHub's October 21, 2018 outage began with a 43-second network partition, which triggered a MySQL cross-region failover. Both data centers ended up holding writes that the other lacked, so the team could not safely fail back. The result was about 24 hours of degraded service while the diverged data was reconciled ([GitHub, 2018](https://github.blog/2018-10-30-oct21-post-incident-analysis/)).

The other is GitLab's, on January 31, 2017. Under load, its PostgreSQL secondary fell behind, and during recovery an operator removed data on the primary by mistake. Of roughly 300 GB, about 4.5 GB remained, and recovery used a snapshot about six hours old ([GitLab, 2017](https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/)). GitLab's incident was a lag-and-recovery failure, not a stale read, but it shows that replica lag is an operational failure, not a theoretical one: the engineers were fixing lag when the real damage happened.

## Where agents make this worse than web apps

Each point below is an inference, not something a source measured.

1. Each tool call often takes a fresh connection from a pool or runs in a different worker, so session stickiness from a web framework doesn't carry over. The write position has to travel in the agent's own state or the tool's return value.
2. Agents often run a "verify my work" read straight after a write. If that read hits a stale replica, the agent concludes the write failed and [repeats it](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-repeats-actions-after-a-kubernetes-pod-restart).
3. The stale row comes back as a normal tool result, so it [needs to be logged with the position it was read at](https://www.robatdasorvi.com/chapters/ai-agents/audit-trails-for-ai-agent-actions-tamper-evident-logs-that-hold-up-in-a-compliance-review).

## What will happen next?

Agent tool contracts will carry a log position before any agent framework ships a replica-lag alarm. My prediction is that within two years, the first serious agent SDK will return a write token from every mutating tool and require it on the next read. The change will look like a small schema addition, and it will fix more stale reads than any amount of replica tuning.