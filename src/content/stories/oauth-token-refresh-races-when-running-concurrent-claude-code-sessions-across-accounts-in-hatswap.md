---
title: "Claude Code OAuth Token Refresh Races Across Multiple Sessions"
description: "Claude Code OAuth token refresh fails when several sessions share one login: rotating tokens, a stale overwrite, and a 1996 TOCTOU parallel."
pubDate: 2026-10-20
category: "building"
author: "Orvi"
readingTime: 9
tags: ["claude code", "oauth", "token refresh", "concurrency", "race conditions", "hatswap", "ai agents", "developer tools"]
featured: false
---

When several Claude Code sessions share one login, each refreshes the OAuth token on its own timer; because refresh tokens rotate, the first successful refresh logs every other session out.

On a Windows 11 workstation, one developer counted eighteen `claude` processes running at once. When they went to work, every OAuth connector wanted to be signed in again. The credentials file told the rest of the story: the access-token expiry fields had been written as zero, the Unix epoch, even though the refresh token was still good for about two weeks. That's the scene in [GitHub #91009](https://github.com/anthropics/claude-code/issues/91009), opened on 2026-08-31 against Claude Code v2.1.251. It isn't exotic. It's what an OAuth token refresh looks like when several sessions are alive and nothing coordinates the writes.

I build [hatswap](https://github.com/orvi2014/hatswap), which keeps several Claude Code accounts signed in at once. I work across several Claude Code accounts at once, which is why I built it. So this sits close to my own work. I want to be careful about what I can actually document. The failures I can point to are other people's reports, not something I reproduced from hatswap's logs. This post is about the design question those reports raise, and what I think the answer has to be. (I've written separately about [the systems I use to run three products as one person](https://www.robatdasorvi.com/chapters/building/the-systems-i-use-to-run-three-products-as-one-person).)

## Why does a refresh token race happen when every session is healthy?

Each process holds its own copy of the token and refreshes it on its own timer. Refresh tokens rotate, so the first successful refresh invalidates every other copy.

Both reports describe the same mechanism from different sides. The #91009 reporter says each `claude` process caches OAuth tokens in memory and refreshes them independently when its own expiry fires. The reporter of [#24317](https://github.com/anthropics/claude-code/issues/24317), opened on 2026-02-09 against v2.1.37, put it more bluntly: when one process refreshes, the old refresh token dies, and the others still hold it in memory, fail their refresh, and prompt for a browser login.

The usual assumption is that the token expired. It didn't. It was used successfully, which is the whole job of a refresh token, and that success is what broke everyone else. Each process followed its own rules correctly. The state was shared, but every process treated its copy as private. Put N processes around one file and you get N private copies of a secret that only works once.

## Why does re-login fail while old Claude Code sessions are still running?

Not at the server. The refresh succeeds. The fault is in the local write. A process refreshes, then writes the result to the shared file based on what it read at startup, not on what is on disk now.

The #91009 reporter says a stale process can overwrite the shared credentials file with its own state, clobbering the newer token. Re-login then fails to stick while stale processes are still alive. Their requirement is the cleanest sentence in either thread: "A stale process should never be able to overwrite newer credentials."

The threads also show that someone had already tried locking. Commenters on #24317 cite a lockfile retry budget of five retries, about 7.5 seconds total, in v2.1.81, and say that's too short for ten or more processes. The commenters' reading is that a lock with a time limit loses under load, and the losing process writes anyway. Commenters also cite a 5-second Keychain cache window as a stale-token window on macOS. I can't verify those internals from outside the product, so treat this as the reporters' claim.

The macOS storage question is also unsettled in public sources. GitHub issue [#70697](https://github.com/anthropics/claude-code/issues/70697) reports that `CLAUDE_CONFIG_DIR` does not isolate macOS Keychain credentials per config directory: processes using different config directories read and write the same Keychain entry. That matters for any multi-account tool, and I wouldn't design around it without testing it on the machine in question.

## Is this a problem nobody has solved before?

No. The shape has a name, and the name is older than most of the people hitting it. Matt Bishop and Michael Dilger described time-of-check-to-time-of-use (TOCTOU) binding flaws in UNIX file access: the name a program checked and the object it later uses can change between the two steps. Their technical report is dated September 1995 (CSE-95-10). The paper appeared in *Computing Systems* volume 9, issue 2, in 1996, pages 131–152.

The mechanics line up. In their case the check is "may I write this file," the use is "open and write it," and something swaps the file in between. In Claude Code's case the check is implicit ("my token is still good, my timer says so"), the use is "write the refreshed token," and another process has replaced the file in the gap. The adversary differs. Bishop and Dilger were thinking about attackers, and these reports are about ordinary concurrent processes. The structure doesn't care who's in the gap.

The lesson from that literature isn't "stop sharing files." It's to make the check and the use a single step, or to re-verify between them. That's what the "lock and re-read" proposal in #91009 is reaching for.

## Can you just turn refresh-token rotation off?

Not if you want the security property the standards ask for. [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), the OAuth 2.0 Security Best Current Practice published in January 2025 as BCP 240, says refresh tokens for public clients "MUST be sender-constrained or use refresh token rotation" (Section 2.2.2). A command-line tool can't keep a secret, so it counts as a public client under the definition in [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749) (Section 2.1). The alternative is sender-constrained tokens (for example DPoP, RFC 9449). The reports show Claude Code uses rotation, so as long as it does, the fix has to live on the client side.

The strongest counterargument is that the bug is already fixed. At the time of writing, #24317 shows as closed as "completed" on 2026-05-07, with no maintainer explanation in the thread. Commenters after the close said it persisted and asked for it to be reopened. Reports kept coming anyway: a Windows variant was filed as [#91708](https://github.com/anthropics/claude-code/issues/91708) on 2026-09-03, and #91009 arrived in August with eighteen live processes. A closed ticket with no explanation, followed by a more specific report, is weaker evidence than the reports themselves. Issue states are as of publication and may have changed since.

## Doesn't running one session per account avoid it?

Mostly, yes. With one live process per login there is nothing to race against. The cost is giving up concurrent sessions on that account, and on macOS the shared-Keychain report in #70697 means separate config directories may not be enough on their own.

The #24317 reporter ran seven to twelve processes at once, and other commenters reported between two and eight. In hatswap, each account has its own login and only the login differs between accounts, so two sessions on two different accounts are meant to hold different refresh tokens. On macOS, #70697 suggests the Keychain may not respect that separation, which is a reason to test rather than assume. The race lives inside one account: two terminals in the same pinned folder, or a long-running bot that, through `hatswap exec`, starts `claude -p` per job on the default account. Those processes all share one rotating refresh token. Hatswap also has a live-session guard that refuses to resume a conversation still open in another window. As the README describes it, that guard protects the conversation, not the credentials file. The README doesn't say it covers token writes, and I wouldn't assume it does.

## Why does a clobbered token look like a successful refresh?

Because the process that overwrote the newer token did exactly what it was coded to do, and logged success. My X bot's failures make the same point this race does: a step that reports success while the underlying state is wrong is more dangerous than one that fails loudly.

My approval-gated X bot had four hardcoded target accounts that no longer existed. For about six weeks they soaked up 88% of the daily comment attempts, and every run logged success. Nothing raised an error. When X suspended the account on 2026-07-21, the lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days.

A refresh that writes a new token over a newer one, then logs "refreshed," has the same shape. From inside the process, nothing looks wrong. The failure only shows from outside, as eighteen processes that all need to log in again.

## How should a multi-session tool write a refreshed OAuth token?

Refuse to write the credentials file unless the file on disk still holds the refresh token the process read. That's a compare-and-swap, done under a lock that waits instead of giving up, with stale-lock detection so a crashed holder can't block everyone. On conflict, the process re-reads the file instead of writing.

That rule is the reporter's own requirement made mechanical. A stale process would find a newer token on disk, adopt it and skip its own write, so the newer token survives for the other seventeen processes. Without it, #91009 plays out in order: the file gets the stale state, every later refresh is judged against a token that was already spent, and the sessions log out together.

This post doesn't cover hatswap's own credential handling; the rule above is the requirement any multi-session tool on one login has to meet. Building with AI tools has a version of this problem too. I wrote about [keeping track of what you're actually building](https://www.robatdasorvi.com/chapters/building/how-to-build-with-ai-without-losing-track-of-what-you-are-actually-building) when the tooling moves faster than your model of it.

The token didn't expire. Something still holding an old copy of it wrote that copy back.

## What can you do today if Claude Code keeps asking you to log in again?

Re-login doesn't stick while stale processes are still alive (#91009), so close every `claude` process on that login before signing in again. Avoid running many long-lived sessions on one login, since each process caches its own copy of the token and refreshes it on its own timer.