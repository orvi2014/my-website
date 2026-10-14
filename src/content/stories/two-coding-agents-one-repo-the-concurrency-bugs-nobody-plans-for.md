---
title: "Multiple AI Coding Agents, Same Repository: The Bugs Git Won't Catch"
description: "Running multiple AI coding agents in the same repository breaks in ways git never reports. Shared ports, databases and lockfiles, and how to guard them."
pubDate: 2026-10-14
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["ai-agents", "coding-agents", "multi-agent-systems", "concurrency", "agent-reliability", "git-worktrees", "devtools"]
featured: false
---

Running multiple AI coding agents in the same repository breaks in ways git never reports: shared databases, ports, lockfiles and decisions, not text conflicts. I haven't run two coding agents on one checkout in production. What I have run is an approval-gated agent whose most expensive failures logged success or didn't log at all, and parallel agents multiply exactly that pattern. I also work across several Claude Code accounts at once, enough that I built a tool, hatswap, to manage it.

## Is running multiple AI coding agents on one repo worth it?

Only when the work splits into pieces that don't need to agree with each other, and most coding work doesn't. In June 2025, Anthropic's engineering team wrote that its multi-agent research system did well on breadth-first, read-heavy tasks, and that coding offers fewer truly parallel pieces than research does. The same post said multi-agent systems use roughly 15 times the tokens of a chat interaction. That cost only makes sense when the task is valuable enough to justify it ([Anthropic, "How we built our multi-agent research system," 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Anthropic measured that cost on research tasks; two coding agents add a merge problem on top of whatever token overhead they carry.

A simple test: If both agents have to make the same decision, like the shape of a database table or the name of a config key, they aren't parallel. They're a disagreement waiting to be scheduled.

## Why doesn't git catch two agents overwriting each other?

Git finds collisions in text at merge time, and most of the damage happens before any merge. Two agents sharing one working tree will overwrite each other's half-written files without leaving a conflict marker. Two agents sharing one dev database run migrations against each other. Two agents that each start a dev server grab the same port, and the second one either crashes with a port-in-use error or quietly moves to the next free port, so your browser tab or test runner keeps hitting the first agent's server. Then both run the test suite against state the other one changed, so a green run tells you nothing about either agent's work.

A branch per agent fixes the file layer. It does nothing for the database, the port, the `.env`, the lockfile, or the decision two agents made differently in two places. Git merges what people wrote. It can't tell that two agents put incompatible assumptions into code that merges cleanly.

## Why do multi-agent coding failures go unnoticed?

Because agents are judged on runs completed, not work done, and a run that changed nothing reports the same success as one that did. Nothing in the loop distinguishes a run that did real work from one that did nothing and reported success.

I've watched this happen with a single agent. For about six weeks, four hardcoded target accounts in my X growth bot no longer existed. They soaked up 88% of the bot's daily comment attempts. Every run logged success and none raised an error, so the cycle looked busy while most of its effort went nowhere. The Skip button in my Telegram approval flow did nothing for months, which meant every skipped item was counted as a timeout, and the approval statistics were wrong. My article lane lost 8 of 20 generations to JSON parse errors, and each failure quietly burned a 48-hour slot.

Add a second agent and the same structure takes over. The metrics come from the pipe the agents share, so a corrupted pipe corrupts the verdict on whether the agents are working at all. The metric also hides the cost. In METR's randomized trial, run from February to June 2025 and published in July 2025, 16 experienced open-source developers worked on 246 real issues. With AI allowed, they were 19% slower. They had expected a 24% speedup, and even after the study they believed AI had sped them up by about 20% ([METR, July 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)). METR studied single developers using AI tools, not parallel agents, so it doesn't measure coordination cost directly. What it does show is that developers misjudged their own speed by about 40 percentage points, and nothing suggests that judgment gets better when there are more agents to watch.

That's the feedback loop. Parallel agents look productive, the productivity story gets reinforced, and nobody is in a position to notice the shared state being destroyed.

## Doesn't parallelism just need better locking?

Locks handle contention over one resource; they don't handle disagreement about intent. Engineers who've run agents in parallel can fairly say that worktrees, per-agent ports, and a lock around the migration step take care of the mechanical problems, so the problem is solved.

The mechanical problems are solved. The decision problem isn't. In June 2025, Walden Yan at Cognition, the company behind Devin, argued in ["Don't Build Multi-Agents"](https://cognition.ai/blog/dont-build-multi-agents) that running multiple agents in collaboration produces fragile systems, since decision-making gets spread out and context doesn't fully transfer between agents. A lock makes two writes take turns. It doesn't make them consistent with each other.

The bigger risk isn't the number of agents. It's the boundary. In July 2025, Replit's AI agent deleted a live production database during a code freeze, on a project where the user had said not to make changes without approval. Reporting says the agent then fabricated over 4,000 user profiles and misstated whether a rollback was possible ([eWeek](https://www.eweek.com/news/replit-ai-coding-assistant-failure/); [AI Incident Database](https://incidentdatabase.ai/entities/replit-ai-agent/)). That was one agent. Replit's response was to separate development and production databases and add a planning-only mode. The failure came from an agent holding write access to a shared environment with no hard line between the two. Two agents make that worse, but one agent already exposes it.

Software has been here before. On August 1, 2012, Knight Capital lost about $440 million in roughly 45 minutes. A deployment had reached only some of its servers, and dormant code came back to life on one of them. The SEC's order against the firm, Release No. 34-70694, is dated October 16, 2013 ([SEC](https://www.sec.gov/litigation/admin/2013/34-70694.pdf)). The takeaway was about state. A system whose components disagree about the current state will act on that disagreement, and it will do it faster than a person can read the logs. The lesson wasn't to run fewer machines.

## How do you run multiple AI coding agents in the same repository safely?

Give every agent its own working copy, its own database or schema, and its own port. Then assign one owner to each shared resource that's left. After that, make the system report whether work actually happened, not just whether a run ended. A run that touched zero rows should fail loudly, and a count of zero should trip an alarm.

Start with a setup you can check. For each agent, run `git worktree add ../repo-agentB -b agent-b`, so every agent gets its own directory and branch. In each worktree, keep a `.env` with distinct values, such as `PORT=3001` and `DATABASE_URL=postgres://localhost:5432/app_agentB`. If you only have one database server, give each agent its own Postgres schema instead, and set the schema name in that worktree's `.env`. Anthropic's Claude Code documentation describes the same approach, running parallel sessions in separate git worktrees so their edits don't collide ([Anthropic, Claude Code docs: common workflows](https://code.claude.com/docs/en/common-workflows)).

Then name one owner for each shared file that can't be split. The lockfile is the usual case: if two agents run an install, the last one to write wins, so make the lockfile owner the only agent that changes dependencies and have the others ask for changes. Do the same for the migrations directory. Only one agent runs migrations, and it runs them against its own database or schema, never one another worktree is using.

Before any worktree merges, rebase it on main. A rebase surfaces the disagreements that leave a trace, such as textual conflicts and failing tests, so run the suite again after the rebase, not before it.

Finally, add a post-run check that fails the run when the diff is empty or when the job changed zero rows. A run that reports success with an empty diff is exactly the failure this setup is meant to catch, so the check belongs inside the run, not on a dashboard someone reads later.

Halts have to be hard. When my bot detected a suspension in July 2026, the check returned True, but the caller skipped one action and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file that only a human can clear. A plain exit wasn't enough, because launchd's KeepAlive respawned the process. Then X suspended the account again on 2026-09-22, a week after I raised the reply cap from 16 to 150. This time the lockout check matched none of its known selectors and never fired, so I stopped the bot by hand. A check that fires only when it recognizes a known failure signature isn't a safety system. The [circuit breaker pattern for agent loops](https://www.robatdasorvi.com/chapters/ai-agents/why-every-agentic-loop-needs-a-circuit-breaker-and-how-i-built-one) is the structure I should have had before I needed it.

Before you add a second agent, ask whether the work can actually be separated. If it can't, the [case for not using an agent at all](https://www.robatdasorvi.com/chapters/ai-agents/the-architecture-decision-nobody-talks-about-when-not-to-use-an-ai-agent) is stronger than the case for a faster one. And measure the result yourself. The [what the METR study found about perceived vs. measured speed](https://www.robatdasorvi.com/chapters/ai-agents/what-the-new-reasoning-models-actually-changed-about-how-i-build) is the reason: how fast something feels is not evidence.

If you have two agents writing to one checkout right now, stop one of them today. Then go find the run from this week that did nothing and logged success anyway. The system won't surface it on its own. It will keep reporting green, cheerfully, until someone goes looking.