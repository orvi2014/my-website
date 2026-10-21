---
title: "Claude Code Usage Limit Reset Time: Tracking the 5-Hour Window"
description: "Claude Code usage limit reset time in the 5 hour window: Anthropic publishes no start time, so here is how to track it for each account."
pubDate: 2026-10-21
category: "building"
author: "Orvi"
readingTime: 8
tags: ["claude code", "usage limits", "rate limits", "5 hour window", "multiple accounts", "agent engineering", "hatswap", "developer tools"]
featured: false
---

In July 2025, Anthropic told TechCrunch that most Pro subscribers could expect 40 to 80 hours of Sonnet 4 through Claude Code each week. That's a generous-sounding number, and it skips the question people actually type when they hit a wall: when does the Claude Code 5-hour limit reset? Anthropic's help article confirms that Pro and Max plans have a five-hour session limit. It doesn't say when that window opens. Anthropic doesn't document when that window opens, and Claude Code only tells you the reset time for the account you're currently signed into.

I work across several Claude Code accounts at once, which is why I built hatswap. Below is the reasoning, the sources I could verify, and the parts I couldn't.

## When Does the Claude Code 5-Hour Limit Reset?

The window is rolling, and it most likely opens with your first prompt rather than at a fixed clock hour. Third-party guides agree on this. Anthropic's own documentation doesn't say it.

The official article, "Using Claude Code with your Pro or Max plan," says that "both Pro and Max plans have a five-hour session limit and a weekly limit." Past that, it's silent on when the window starts or resets. The most common model in third-party guides, such as [Usagebar's explainer on Claude's 5-hour limit](https://usagebar.com/blog/what-is-claudes-5-hour-limit), is that the clock starts on your first request and the limit clears five hours later. Under that model, a first prompt at 9 AM means a reset at 2 PM.

Treat that as a working assumption, and label it that way. The honest answer is that the reset falls five hours after a window Anthropic doesn't describe publicly.

## Does /usage Show When the 5-Hour Limit Resets?

Yes. `/usage` shows the reset time for the account you're signed into, alongside the 5-hour and weekly bars.

Anthropic's article tells you to "monitor your remaining allocation using the /status command," and says that you'll see warning messages as you approach any limit. That's what `/status` is for: remaining allocation. The `/usage` command is where Claude Code shows the 5-hour and weekly numbers, along with when each one resets. A remaining-percentage readout tells you how much room is left. A reset time tells you when the room comes back. Anthropic's documentation doesn't say in advance when the window opens.

So the workflow that holds up is to check `/usage` before a long task, use `/status` for the remaining allocation, and read the limit message when it appears, instead of building a schedule around a time you worked out yourself.

## Why Not Just Wait for the Window to Clear?

Waiting on one account is the conventional move, and it isn't free. You pay in idle time, in the middle of work you'd already started.

The $100 Max tier was quoted at 140 to 280 hours of Sonnet 4 a week, against 40 to 80 for Pro. Those hours measure usage, not wall-clock time, so they don't convert neatly into five-hour windows. What they do tell you is that the weekly ceiling and the five-hour ceiling are separate, and you can hit the short one long before the long one.

The official article also points to a second cost. Anthropic's article notes that Claude Code may keep working briefly after the limit is reached so it can finish the step in progress. The session doesn't stop at a boundary you picked. It stops at the one the limit chose, which is usually in the middle of a refactor, a migration, or a debugging chain.

This is where [hatswap](https://github.com/orvi2014/hatswap) comes in. It keeps each Claude Code account signed in at once and moves a conversation to another account with `switch`, keeping the history. In tmux, Terminal.app, and iTerm2, the same tab restarts on the new login. What it removes is the stall, not the limit itself.

## Isn't the Reset Too Unreliable to Track?

Yes, and that's the strongest argument against building a timer at all. Limits have reportedly been reset outside the normal schedule, so a timer you calculated can be wrong.

Anthropic has reportedly changed usage counters off-schedule before. A personal blog post on [Claude's rate-limit reset on May 15, 2026](https://pasqualepillitteri.it/en/news/2614/claude-resets-rate-limits-5-hour-weekly-may-15-2026) reports that Anthropic flushed both the 5-hour and weekly counters, which Anthropic hasn't confirmed; I couldn't find an Anthropic announcement confirming it. A reset like that makes any stored timestamp stale. A tool that trusts its own arithmetic will show a wait time that's no longer true.

So treat the reset estimate as a hint and the account's own readout as the truth. That's also why per-account tracking matters more than per-clock tracking. Each login has its own state, so the number you need is the one for the account you're about to use.

## Isn't Running Several Accounts Against the Rules?

This is the objection I take most seriously, and the answer depends on what the accounts are for. Anthropic's stated reason for the weekly limits points at a specific behavior.

When the weekly limits were announced on July 28, 2025, Anthropic framed them as a response to people running Claude Code "continuously in the background, 24/7," and to stop "account sharing and reselling of access." It also estimated the limits would hit "less than 5% of subscribers based on current usage." Those are the stated targets, as [TechCrunch](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/) reported them. The weekly limits took effect on August 28, 2025.

The distinction matters. Holding several accounts you own and moving your own work between them is not the same as reselling access or running unattended loops across shared logins. Where the line sits in practice is set by the terms, and I'm not a lawyer. Read them before you build anything that touches more than one login.

## How hatswap Shows Every Account's Limits at Once

`hatswap usage` prints every account's 5-hour and weekly limits in one table, the same numbers `/usage` shows inside Claude. That turns the question "which account has room?" into a single comparison instead of a sign-in per account.

Typing `hatswap` on its own opens the account picker, which lists each account with its email, limits, default and pin. From there you can start Claude on an account, set the default, or pin the current folder to one account.

Moving work is a separate step. `switch` moves the current conversation to another account, and in tmux, Terminal.app and iTerm2 the same tab restarts on the new login with its history intact. `default` and `pin` decide which account a plain `claude` starts on: the default applies everywhere, and a pin applies to the folder it was set in. `exec`, and the `claude` and `codex` shims, look the account up on every call, so a script that starts `claude -p` for each job picks up a new default without a restart.

hatswap shares settings, agents, skills, memory and conversation history across accounts so that only the login differs, and that's what lets `switch` carry a conversation to an account with room. The trade-off is that hatswap reports each account's readout instead of computing a forecast, which is why the forecast question stays open below.

What is still unsolved is the forecast. The table shows each account's current readout, but hatswap doesn't claim to know when a window will open. The reset question stays with the account's own readout.

## What Should a Reset Timer Change in Practice?

If the argument holds, the reset belongs to each login, not to the machine. So the useful question is which account has room right now.

Two things follow. First, the readout matters more than the clock. Check `/usage` on the account you're about to use, and treat the limit message as the source of truth. Second, the shared pool matters. The official article says "these limits are shared across Claude and Claude Code, meaning all activity in both tools counts against the same limits." Browser chats draw from the same budget, so an afternoon in claude.ai can end a coding session.

I didn't build a reset predictor into hatswap. The `usage` table shows the same numbers `/usage` shows inside Claude, for every account at once. The math is simple enough to do by hand: take the timestamp of your first prompt, add five hours, and treat the result as a hypothesis until the account confirms it. The related problem of several sessions refreshing tokens against the same login is covered in [the post on OAuth token refresh races](https://www.robatdasorvi.com/chapters/building/oauth-token-refresh-races-when-running-concurrent-claude-code-sessions-across-accounts-in-hatswap), and the broader question of hard ceilings on paid API use is in [why spending alerts don't stop an LLM API bill](https://www.robatdasorvi.com/chapters/building/why-i-built-hard-spending-caps-for-llm-apis).

What this means in practice is modest. A developer on a single Claude Code plan should expect the five-hour window to be an inferred clock, not a published one, and plan around the account's own readout. A developer running several accounts should stop asking when one account resets and start asking which one has the most room, because that answer changes faster than any timer can track. Anyone building tooling on top of these limits should write it to survive a reset that arrives early, since at least one off-schedule reset has been reported, though not confirmed by Anthropic.

Sources:
- [Using Claude Code with your Pro or Max plan, Anthropic Help Center](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Anthropic unveils new rate limits to curb Claude Code power users, TechCrunch, July 28, 2025](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/)
- [What Is Claude's 5-Hour Limit? (And How to Track It), Usagebar](https://usagebar.com/blog/what-is-claudes-5-hour-limit)
- [Claude Resets Rate Limits, May 15, 2026](https://pasqualepillitteri.it/en/news/2614/claude-resets-rate-limits-5-hour-weekly-may-15-2026)
- [hatswap on GitHub](https://github.com/orvi2014/hatswap)

---

Note (outside the requested output): I could not run a live Claude Code session here, so the `/usage` reset-time behavior in the rewritten section is not checked against a live session. It follows your change 1 and the Usagebar page, which is third-party. Check it before publishing. Your change 7 paraphrase was applied without the verbatim check, since the fetched Anthropic article didn't clearly confirm the exact string.