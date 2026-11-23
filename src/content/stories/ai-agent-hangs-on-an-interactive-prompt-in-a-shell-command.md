---
title: "AI Agent Hangs on Interactive Prompt in Shell Command: Fix"
description: "An AI agent hangs on an interactive prompt because the shell command waits for stdin. Fix it with stdin closed, a hard timeout, and non-interactive flags."
pubDate: 2026-11-21
category: "ai-agents"
author: "Orvi"
readingTime: 6
tags: ["AI agents", "shell commands", "subprocess", "stdin", "agent timeouts", "non-interactive CLI", "agent reliability"]
featured: false
---

An agent hangs on an interactive prompt when a shell command reads from the terminal and waits for an answer nobody is going to send. The fix has three parts: close the command's stdin, put a hard timeout on the call, and pass the flag that tells the tool not to ask. Set up that way, the command fails with an error instead of waiting forever.

The Skip button in my Telegram approval flow did nothing for months. Every item I skipped got counted as a timeout, so the approval statistics were wrong. Nothing in the logs said anything was wrong. Hangs are the same kind of failure. The process looks busy, the log looks normal, and the work never happens. My bot never hit a shell prompt; what it taught me is that silent failures are the expensive kind, and a hang is the most silent failure a shell call has.

## Why does the agent hang instead of failing?

The child process is waiting on a read, and the agent is waiting on the child. Neither side raises an error, so the run looks slow when it's really stuck.

Python's subprocess module passes the parent's standard input through unless you tell it otherwise. The [Python subprocess documentation](https://docs.python.org/3/library/subprocess.html) describes `subprocess.DEVNULL` as the way to give the child an empty input stream. Without it, a command that asks "Continue? [y/N]" reads from whatever the parent has open. If that's a terminal the agent is attached to, the question sits there unanswered.

Closing stdin isn't always enough. ssh, sudo, gpg and git's credential prompt open /dev/tty directly, so they bypass stdin and ask the terminal. To stop that, the child needs its own session with no controlling terminal, plus the tool's batch flag: `ssh -o BatchMode=yes`, `sudo -n`, and `GIT_ASKPASS` / `SSH_ASKPASS` set to a command that exits non-zero.

A user on the Cursor forum reports an agent stuck at "Agent is waiting for a command to finish" on a simple Python snippet, a command that completed in under a second when pasted into a terminal ([Cursor forum, user report, April 2026](https://forum.cursor.com/t/cursor-hangs-executing-a-snippet-agent-is-waiting-for-a-command/159147)). The thread doesn't name a cause, and a command that finishes but never gets reported as finished may be a separate bug in how the agent's terminal detects completion. From the outside it looks the same: the agent waits and nothing tells you why. Git has a version of this failure with a clear cause: when it wants a credential, it prompts. Its answer is `GIT_TERMINAL_PROMPT=0`, which makes it exit with an error instead of prompting ([git documentation](https://git-scm.com/docs/git)). I like that the error is the point. A failure you can read beats a wait you can't see.

The same pattern shows up in coding agents themselves. An issue opened on September 19, 2025 in the openai/codex repository, about its VS Code extension, reports that when the agent ran `pnpm test`, Vitest started in its default watch mode, the agent ended up inside the interactive UI, and the session appeared stuck waiting for keyboard input. The issue was closed in a backlog cleanup in January 2026 ([openai/codex#3951](https://github.com/openai/codex/issues/3951)).

## Doesn't a timeout fix it?

It caps the damage, which isn't the same as fixing it. A timeout doesn't remove the prompt, and it doesn't tell you which command asked. Treat it as the last line of defense, set after stdin is closed and the non-interactive flags are in place.

Timeout length matters more than people expect. As an illustration, if 20 commands a day reach a prompt and each burns a two-minute timeout, that's 40 minutes of blocked agent time daily, and doubling the timeout doubles the loss. A longer timeout doesn't cure the hang. It just makes each one more expensive.

## Doesn't a human in the loop catch it?

Usually a person will notice, but noticing comes too late to help. Approval gates check what the agent asks to run. They don't watch what the command does after it starts.

My own approval flow had a person pressing every button, and the Skip button still failed silently for months. Approval proves someone saw the request. It doesn't prove the command finished, and it doesn't prove the button did what its label said. When X suspended the account a second time on 2026-09-22, the lockout check matched none of its known selectors and never fired. I stopped the bot by hand. A detector that never trips looks exactly like a healthy run, which is the shape of a hang.

## What does the conventional setup cost?

The conventional setup runs agent commands in a shell that inherits the terminal, answers each prompt by hand, keeps the default timeout, and trusts exit code 0. It feels safe because a human can always answer. The costs show up later, out of sight.

It stops unattended runs at the first prompt. If a run needs someone at the keyboard for every `[y/N]`, it isn't unattended, whatever the dashboard says.

It hides failures behind green logs. For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of my bot's daily comment attempts. Every run logged success, and nothing raised an error. A hang is the same pattern in a different spot: a run that never finishes, logged as still in progress.

It treats a check as a stop. When X suspended the account on 2026-07-21, the lockout check fired and returned True. The caller skipped one action, and the loop kept running for 3.5 more days. A check that returns True isn't a halt. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit.

Writing "don't do that" into the prompt is the comfortable choice, and it fails too. Replit's agent deleted a live production database during a code freeze that existed to prevent exactly that ([Fortune, 2025](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)). As reported, the freeze was an instruction to the agent, not a control the system enforced. For the permissions side, see [least privilege for AI agents](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice).

The stakes are rising. METR (2025) found that the length of tasks frontier agents complete at 50% reliability has doubled roughly every seven months for six years ([arXiv:2503.14499](https://arxiv.org/abs/2503.14499)). Longer runs mean more commands per run, and every extra command is another chance to meet a prompt. Long runs bring their own problems, covered in [context window management for long-running agents](https://www.robatdasorvi.com/chapters/ai-agents/context-window-management-in-long-running-agents-the-patterns-nobody-writes-about).

## How do I stop a command from waiting?

Give the command no stdin, a deadline, and the tool's own non-interactive flag.

```python
import os
import signal
import subprocess

AGENT_ENV = {
    **os.environ,
    "GIT_TERMINAL_PROMPT": "0",        # git fails instead of prompting
    "DEBIAN_FRONTEND": "noninteractive",
    "CI": "1",                          # many CLIs skip prompts when CI is set
}

def run_agent_command(argv: list[str], timeout_s: int = 120) -> subprocess.CompletedProcess:
    proc = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True, env=AGENT_ENV)
    try:
        out, err = proc.communicate(timeout=timeout_s)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.communicate()
        raise RuntimeError(f"hung after {timeout_s}s: {argv[0]}")
    return subprocess.CompletedProcess(argv, proc.returncode, out, err)
```

run() is not enough on its own: on timeout it kills only the direct child, and grandchildren such as the processes behind pnpm, npm or a test runner can keep running and hold the output pipes open, which keeps run() blocked. shell=True makes this worse, because the shell is the only process run() knows about.

start_new_session and os.killpg are POSIX-only; on Windows, use a Job Object or CREATE_NEW_PROCESS_GROUP instead.

The table covers the commands that stop on a prompt most often. Set the flag inside the command itself rather than trusting a default.

| Command | Prompt it raises | Non-interactive form |
|---|---|---|
| `git push` over HTTPS | Username / password | `GIT_TERMINAL_PROMPT=0` in env |
| `apt-get install pkg` | "Do you want to continue? [Y/n]" | `apt-get install -y pkg` plus `DEBIAN_FRONTEND=noninteractive` |
| `npm init` | Package questions | `npm init -y` |
| `npx create-*` scaffolds | Framework and option menus | `npx --yes create-…` plus every option as a flag (npx itself asks "Ok to proceed?" before installing) |
| `vitest` / `jest --watch` test scripts | Interactive watch-mode UI | `vitest run` (or `CI=1`), `jest --watchAll=false` |
| `ssh` / `scp` | Host-key confirmation or password | `-o BatchMode=yes` |
| `sudo` | Password | `sudo -n` (fails instead of asking) |
| Anything with a menu | Arrow-key selection | Don't run it through an agent shell |

## What should you change today?

Find every place your agent calls a shell. Grep the tool layer for `subprocess`, `Popen`, `shell=True`, and `os.system`, and route each call through the wrapper. While you're in the tool layer, check what text can reach those commands; see [prompt injection in coding agents](https://www.robatdasorvi.com/chapters/ai-agents/prompt-injection-in-coding-agents-malicious-instructions-hidden-in-issues-readmes-and-dependency-files). Then run one deliberate test. Pick a command you know prompts, run it through the wrapper, and confirm it returns an error inside the timeout. If it comes back green instead, you have the failure I had: a log that says success over work that never happened.