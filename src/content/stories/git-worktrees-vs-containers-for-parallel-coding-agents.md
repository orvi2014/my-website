---
title: "Git Worktrees vs Containers for Parallel Coding Agents"
description: "Git worktrees separate branches, not processes. For parallel coding agents, pair a worktree per task with a container when the agent runs unreviewed commands."
pubDate: 2026-11-23
category: "ai-agents"
author: "Orvi"
readingTime: 9
tags: ["git worktrees", "containers", "parallel coding agents", "AI agent sandboxing", "Claude Code", "agent isolation", "developer tooling"]
featured: false
---

For parallel coding agents, git worktrees and containers solve different problems. A git worktree gives each agent its own branch and directory so parallel edits don't collide. A container isolates the agent's process, filesystem, network and credentials from your machine. Run every parallel coding agent in its own worktree, and add a container when it runs commands you haven't reviewed. This piece is about which isolation layer to pick; the concurrency bugs that survive isolation are covered in [Multiple AI Coding Agents, Same Repository](https://www.robatdasorvi.com/chapters/ai-agents/two-coding-agents-one-repo-the-concurrency-bugs-nobody-plans-for).

You have three terminals open on the same repository. One Claude Code session is refactoring the auth middleware, another is chasing a flaky test, and a third is writing a migration. The second session runs `git checkout` in a directory the first one is still editing, and if the files they touched don't overlap, git switches branches underneath the first session without complaint. Which of your tools would have caught that, and which would have caught the migration deleting the wrong table?

## Is a Git Worktree Enough for Parallel Coding Agents?

For stopping agents from overwriting each other's files, yes. For stopping them from touching everything else on your machine, no. Each worktree gets its own directory and branch, while all of them share one object store.

Git enforces the rule that matters most here. `git worktree add` refuses to check out a branch that another worktree already holds, unless you pass `--force` ([Git documentation](https://git-scm.com/docs/git-worktree)). That refusal is the coordination guarantee you get for free. It says nothing about what the agent runs once it's inside its directory. It doesn't touch ports, `.env` files, database connections, or the credentials in your home folder.

Claude Code's documentation frames parallel sessions the same way. Its worktrees page describes a `--worktree` flag that gives each session its own git worktree so edits don't collide ([Claude Code docs](https://code.claude.com/docs/en/worktrees)). The page is about edit isolation, and it stays within that scope.

## What Does a Container Isolate That a Worktree Cannot?

A container isolates the process: its own filesystem view, network namespace, and environment variables. A command that deletes a home directory inside a container deletes the container's home. The same command run in a worktree deletes yours.

Two 2025 incidents show the gap. In July 2025, SaaStr founder Jason Lemkin reported that Replit's agent wiped a live database during a code freeze, removing records for more than 1,200 executives and nearly 1,200 companies. The agent later admitted it had ignored the freeze instruction ([Fortune, 2025](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)). Most of those details come from Lemkin's posts and the agent's own statements, not an independent audit. Replit's response was to split development and production databases, which is a container-style boundary applied to data.

The Gemini CLI case, in July 2025, needed no production database. A developer asked the tool to reorganize a folder. A `mkdir` failed without the agent noticing, and the moves that followed overwrote files inside the user's project folder. The AI Incident Database logged it as [Incident 1178](https://incidentdatabase.ai/cite/1178). The agent didn't need a second branch to lose work. Write access to the directory was enough.

Containers aren't the only boundary. Docker Sandboxes, which Docker described in an April 2026 post on its microVM architecture, give each agent session its own kernel and a private Docker daemon. Docker says credentials are injected from outside that boundary ([Docker, 2026](https://www.docker.com/blog/why-microvms-the-architecture-behind-docker-sandboxes/)). Those are vendor claims, so treat them as a design target to verify, not a guarantee.

## Why Do Parallel Agents Keep Colliding Anyway?

Parallel agents collide because they share one machine's mutable resources, and the only thing serializing them is a human clicking approve. The working tree, port 3000, the test database, the `.env` file, and the keychain are all shared by default. Nobody chose that. It's just what a laptop does when one person is typing.

The approval loop is the weakest part. Anthropic reported in 2025 that sandboxing cut Claude Code permission prompts by 84% in internal use ([Anthropic, 2025](https://www.anthropic.com/engineering/claude-code-sandboxing)). That number is self-reported, but it shows how many prompts a boundary can absorb. Trust is thin too. The 2025 Stack Overflow survey found 46% of respondents actively distrust AI tool accuracy, against 33% who trust it ([Stack Overflow, 2025](https://survey.stackoverflow.co/2025/ai)). My inference, not the survey's: a system that asks people who distrust the output to approve every action is betting on attention that won't last.

My own agent wasn't a coding agent, but it taught me where gated systems actually break. My approval-gated X bot routed every post, reply, follow, and like through a Telegram approval I pressed by hand. None of the failures below ever reached the approval gate as a decision, and one of them was a bug in the gate itself. In July 2026, X suspended the account. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. ([AI Agent Kill Switch Not Working: Cached Flags and Leases](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-kill-switch-not-working-cached-flags-and-leases) covers why halt checks fail like this.) For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of comment attempts, and every run logged success. A Telegram Skip button silently did nothing for months, so skipped items were counted as timeouts. None of these needed a bad actor, and none of them raised an error. A human approval step can't catch a failure that never reaches it, and parallel agents writing to a shared port, database or .env fail the same quiet way.

## Isn't Containment Overkill for One Developer?

Containers add startup time, credential plumbing, and a second environment to debug. A solo developer who reads every command could reasonably skip them. But that argument leans on a premise that doesn't hold. Reading every command is exactly what agents make impossible. They chain dozens of commands per task, and the dangerous one rarely looks dangerous in isolation.

The stronger objection says you need a permission system, not a container. Anthropic's sandbox takes that middle path. It uses OS-level features, bubblewrap on Linux and Seatbelt on macOS, so safe commands run without asking while new network domains still prompt ([Claude Code sandboxing docs](https://code.claude.com/docs/en/sandboxing)). That's a real improvement. It still runs on your host kernel with your filesystem, which is not the same as a separate machine. The objection holds for read-only analysis. It fails for any agent that installs packages, runs migrations, or executes scripts nobody has read.

## Which Setup Should You Choose?

Use a worktree for every parallel task. Add a container or microVM for any agent that runs commands you haven't reviewed. The table shows what each layer covers.

| Concern | Worktree only | Worktree + container | Worktree + microVM sandbox |
|---|---|---|---|
| Two worktrees checking out one branch | Refused by git (unless --force) | Refused by git (unless --force) | Refused by git (unless --force) |
| Deleting files outside the repo | Not contained | Contained to mounted path | Contained to VM |
| Shared ports and local databases | Shared unless you configure otherwise | Separate if you set networks and ports | Separate per sandbox; databases still need per-task values |
| Credentials | Whatever is in your home directory | Only what you pass in | Injected from outside (vendor claim) |
| Setup cost | Minutes | Hours the first time | Managed by the vendor |

## What Does the Setup Look Like in Practice?

A minimal version is one worktree per task and one container per worktree. The sketch below is illustrative, not a product configuration. Save it as spawn-agent.sh and run it with `bash spawn-agent.sh <task-name> [base-branch]`. It creates a fresh branch per task, because git allows only one checkout per branch, and the container sees only that task's worktree. Check the image, network, and mount paths against your own repo.

```bash
set -euo pipefail

task="$1"
base="${2:-main}"
repo="$HOME/src/app"
wt="$HOME/src/app-worktrees/$task"

git -C "$repo" worktree add -b "agent/$task" "$wt" "$base"

docker run --rm -it \
  --name "agent-$task" \
  --mount "type=bind,src=$wt,dst=/work" \
  --workdir /work \
  --network agent-egress \
  --cap-drop ALL \
  --tmpfs /home/agent \
  agent-image:latest
```

`agent-egress` is a Docker network you create first. A plain `docker network create agent-egress` allows all outbound traffic. `docker network create --internal agent-egress` blocks outbound traffic entirely. That includes the model API, so a coding agent on an internal network can't run. In practice you need an allowlist proxy that permits at least your model provider's endpoint. The script passes no credentials, so you must inject the agent's API key yourself (for example with `--env-file` pointing to a file that holds only that key), and this key is the one secret the container can see. If you want an allowlist, route traffic through a filtering proxy. Without the network, the script fails as copied.

One catch: inside the container, git commands will fail. A worktree's .git is a file pointing to $repo/.git/worktrees/$task on the host, and that path isn't mounted. You can mount "$repo/.git" at the same absolute path inside the container, but that gives the agent the shared object store and every branch's refs. The alternative is to let the agent edit only and run commits and diffs from the host after it exits. Which is right depends on how far you trust the agent.

The worktree provides the coordination guarantee. The container provides the blast-radius limit. The `--tmpfs` line gives the agent a throwaway home directory, so dotfiles, caches and any credentials it writes vanish with the container instead of landing in yours. Note that the bind-mounted worktree is still writable. A Gemini-CLI-style overwrite inside the repo would still happen, but only to files git can restore. Ports and databases still need per-task values. That's a configuration task, not a tooling one.

## What Should You Do This Week?

Find the one resource your agents share without your noticing. It might be the port, the `.env`, the test database, or the home directory. Give each task its own copy before you start a second agent. Put the agent that runs unreviewed commands in a container, and keep the approval gate for decisions that really need a human. Then write a check that fails loudly whenever a shared resource gets touched. The bot taught me that a silent success log can hide a bug for six weeks.

You don't need to rebuild your whole workflow. You need to stop the one shared thing that's quietly making decisions for you.

Related reading: This piece is about choosing an isolation layer. [Multiple AI Coding Agents, Same Repository: The Bugs Git Won't Catch](https://www.robatdasorvi.com/chapters/ai-agents/two-coding-agents-one-repo-the-concurrency-bugs-nobody-plans-for) covers the concurrency bugs that remain even after every agent has its own worktree. [Prompt Injection in Coding Agents via GitHub Issues](https://www.robatdasorvi.com/chapters/ai-agents/prompt-injection-in-coding-agents-malicious-instructions-hidden-in-issues-readmes-and-dependency-files) explains why an agent reading untrusted text is a reason to contain its commands, not just review them.