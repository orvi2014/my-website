---
title: "Share MCP Server Config Across Claude Code Accounts"
description: "Share MCP server config across Claude Code accounts with one project .mcp.json and ${VAR} secrets, instead of copying each account's config by hand."
pubDate: 2026-10-29
category: "building"
author: "Orvi"
readingTime: 8
tags: ["MCP", "Claude Code", "multiple accounts", "MCP server configuration", "developer tools", "secrets management", "AI agents", "configuration drift"]
featured: false
---

To share MCP server config across Claude Code accounts, put the server definitions in a project-scoped `.mcp.json` committed to the repository, and write every secret as `${VAR}` so the file holds no credentials. Each account keeps its own login. Nothing else gets copied.

Copying the server block into each account by hand is the most expensive option over time, and the cheapest one on the day you pick it. A copy is visible, it's quick, and it's under your control. The bill doesn't arrive as an error, though. It arrives as N places you have to edit every time something changes, and N places that can quietly stop agreeing with each other.

## Why does an MCP server config stay behind when you switch accounts?

User-scoped servers live in the `.claude.json` of whichever config directory an account runs from (`~/.claude.json` by default, `$CLAUDE_CONFIG_DIR/.claude.json` when each account has its own directory), so they don't follow you from one login to the next. Only project-scoped servers sit in a file that every account can read from the same repository.

Claude Code has three scopes, and only one of them is meant to be shared:

| Scope | Loads in | Shared with team | Stored in |
|---|---|---|---|
| Local (default) | Current project only | No | `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`), under the project's path |
| Project | Current project only | Yes, via version control | `.mcp.json` in the project root |
| User | All your projects | No | `~/.claude.json` (or `$CLAUDE_CONFIG_DIR/.claude.json`) |

The official documentation describes user scope as "remaining private to your user account." That's the root of the problem. Per-account privacy is the feature. Sharing across accounts is the thing user scope was never built for. [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)

So the instinct "I'll add this at user scope and it'll be everywhere" holds for one account and fails for several. Each login with its own config directory has its own `.claude.json`, and each one needs the server added.

## What does copying the config per account actually cost?

Copying is free on day one and costs a little more with every change after that. The real expense is multiplication. Every new server, token rotation, or version bump gets repeated once per account, and nothing checks that the repeats match.

Take three accounts and six servers. Adding a seventh means three edits, one in each account's file. Rotating one token means three more. Every change costs one edit per account, for as long as you run them. The mistake that matters is the one nobody sees. An account that missed an edit doesn't complain at setup time. It fails later, when a session in that account calls the tool and gets an authentication error. That error looks like an outage in the server, not a stale copy.

The same shape showed up in the growth bot I run. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of the daily comment attempts, and every run logged success. A hardcoded list nobody re-checks doesn't announce that it has gone stale. It keeps producing output that looks normal. A copied config works the same way. It keeps working in the accounts where it was right, and the accounts where it drifted look fine until someone checks what the sessions actually did.

Copies also multiply the vetting work. Li and Gao (2025) scanned 67,057 MCP servers across six public registries. MCPInspect flagged 833 as vulnerable and 18 with suspicious descriptions ([arXiv:2510.16558](https://arxiv.org/abs/2510.16558)). Every server you add needs checking, and every copy is one more place where a server you later remove can stay installed. One shared file gives you one place to review and one place to revoke.

This is the same trap I wrote about in [losing track of what you are actually building with AI](https://www.robatdasorvi.com/chapters/building/how-to-build-with-ai-without-losing-track-of-what-you-are-actually-building). Each added piece looks cheap, and the bill shows up as a total nobody bothered to add up.

| Approach | Where the definition lives | Where the secret lives | Edits for one token rotation (3 accounts) | Drift risk |
|---|---|---|---|---|
| Copy into each account's `.claude.json` | Three files | Inside each copy | 3 | High |
| Project `.mcp.json` with `${VAR}` | One file in the repo | Each account's environment | 1 (environment) | Low |

## Where does the duplicated secret end up?

Every copy of a token is one more place it can leak, and tokens rarely get rotated after someone first pastes them in. GitGuardian (2025) counted 23.8 million secrets leaked on public GitHub repositories in 2024, a 25% increase year over year ([GitGuardian, The State of Secrets Sprawl 2025](https://blog.gitguardian.com/the-state-of-secrets-sprawl-2025/)).

According to the same report, generic secrets, meaning hardcoded passwords, database credentials, and custom tokens, made up 58% of all leaked credentials. `.mcp.json` is meant to be committed, so a bearer token written into it becomes that kind of generic secret in git history, which is why every credential in the file below is a `${VAR}`.

Rotation is the other half. GitGuardian (2025) found that 70% of secrets leaked in 2022 were still active when the report was written. A copy you've forgotten about is a copy that never gets rotated.

An environment variable doesn't remove the risk. It does mean each machine holds the secret in one place, so rotation takes one edit instead of three.

## Isn't a separate config directory enough to share one setup?

No. A separate `CLAUDE_CONFIG_DIR` per account isolates the accounts, and isolation is the opposite of sharing. The strongest case for it goes like this: copy everything once, call it a one-time job, and stop thinking about it. Two things get in the way.

First, the copy isn't really one-time: every server you add or token you rotate after the copy has to be repeated in each directory.

Second, concurrent accounts bring their own failure modes, which I covered in [the OAuth token refresh race write-up](https://www.robatdasorvi.com/chapters/building/oauth-token-refresh-races-when-running-concurrent-claude-code-sessions-across-accounts-in-hatswap). Layering copied MCP config on top of that gives you two sources of drift instead of one.

I built [hatswap](https://github.com/orvi2014/hatswap) to keep several Claude Code logins signed in at once. Its README lists settings, agents, skills, plugins, hooks, rules, output styles, keybindings, memory, and conversation history as shared across accounts, with only the login differing. MCP servers aren't in that list, so this post doesn't claim hatswap shares them. Whether user-scoped MCP servers should travel with the shared environment is a question hatswap doesn't answer yet. Until it does, the project file is the part I can rely on. A project `.mcp.json` works the same whichever account opens the repository, with or without hatswap.

## How do you share one MCP config across every account?

Put the definitions in one project `.mcp.json` and keep the secrets in the environment. Every account that opens the repository reads the same servers, and a rotation becomes a single environment change:

```json
{
  "mcpServers": {
    "example-search": {
      "type": "http",
      "url": "${SEARCH_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${SEARCH_MCP_TOKEN}"
      }
    },
    "example-files": {
      "command": "npx",
      "args": ["-y", "your-mcp-server-package"],
      "env": {
        "FILES_ROOT": "${FILES_ROOT:-/srv/shared-docs}"
      }
    }
  }
}
```

The docs define `${VAR}` and `${VAR:-default}` expansion for `command`, `args`, `env`, `url`, and `headers`, so the file can be committed without a credential in it ([Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)). The trade-off is that server names and URLs become visible to anyone with repository access, which matters if the repo is public. The secret stays out of view, and the secret was the expensive part of the copy in the first place.

## What this doesn't solve

The [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp) sets three limits on this approach:

1. Project-scoped servers load only inside the repository that contains the `.mcp.json`. Servers you want in every project still need user scope in each account.
2. Claude Code prompts for approval in interactive sessions before it uses project-scoped servers from `.mcp.json`. `claude mcp reset-project-choices` clears those choices.
3. Every account that opens the repository reads the same variable names, so by default it gets the same credential. For client work that must stay separate, keep each client in its own repository with its own variable names, or launch each account with a different environment. The `.mcp.json` alone can't tell accounts apart.

Each account should differ only in its login. The copy was cheap to make and expensive to keep true. Keep the definition in one file, read it from every account, and let each secret live in the one environment that rotates it.