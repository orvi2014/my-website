---
title: "AI Agent Kill Switch Not Working: Cached Flags and Leases"
description: "A kill switch fails when a cached flag, a skipped caller or a silent detector lets an AI agent keep running. Stop it with a hard process exit, not a flag."
pubDate: 2026-11-03
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["ai-agents", "kill switch", "agent safety", "distributed locks", "launchd", "kubernetes", "incident analysis", "agent guardrails"]
featured: false
---

If your AI agent kill switch is not working, the stop signal is cached, the caller is allowed to ignore the check, or the detector never fires. The fix is a check that exits the process instead of returning a value, a stop read on every action, and a halt sentinel the agent writes but only a human can clear.

My agent's kill switch returned True, and the agent kept running for three and a half more days. The stop had done the only job it had, which was to answer a question.

## Where Did the Kill Switch Actually Fail?

The check worked. The caller that received its answer was free to ignore it.

On 2026-07-21, X suspended the account. The lockout check ran and returned True. The caller skipped that one action and moved on, and the loop kept going for 3.5 more days. The easy story is that the detector was broken. It wasn't. It was right, but its answer was advisory. A boolean handed to a caller who decides whether it binds is a suggestion with a return type.

## Why Did the Bot Come Back After It Exited?

Because launchd KeepAlive respawned the process after a plain exit, the exit alone wasn't enough. The restarted process needed a sentinel to check before it did any work.

The fix had two parts. The process exits hard, and on startup it checks a sentinel file that only a human can clear. A stop that only a human can clear is the mirror image of [break-glass access for AI agents](https://www.robatdasorvi.com/chapters/ai-agents/break-glass-access-for-ai-agents-time-boxed-elevated-permissions-with-human-approval-and-automatic-expiry). The respawn trap also shows up in [the Kubernetes restart case](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-repeats-actions-after-a-kubernetes-pod-restart), where a restarted agent repeats work it already finished.

## Why Did the Second Kill Switch Never Fire?

On 2026-09-22 the lockout check matched none of its known selectors, so it never fired at all. I stopped the bot by hand.

This failure was worse than the first. A detector that returns False and a detector that never runs look identical from outside. The suspension came a week after the reply cap rose from 16 to 150. The lockout check only knew a fixed list of selectors, and none of them matched. Silence got read as health.

A stop that works for the incident that built it has only been tested along one path.

The same shape showed up elsewhere in the bot. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of daily comment attempts, and every run logged success. The Telegram Skip button silently did nothing for months. Every skipped item was counted as a timeout, so the approval statistics were wrong. In both cases the system kept producing normal-looking numbers while the control underneath had stopped working.

## Why Does a Cached Flag Keep Running After the Stop?

A cached flag and an unexpired lease both let a process act on a stop it hasn't seen yet. So the stop has to be read at each action, not once at startup.

Per the Kubernetes documentation, a change to a ConfigMap mounted as a volume can take the kubelet sync period plus the cache propagation delay to reach a running pod, and ConfigMap values consumed as environment variables don't update until the pod restarts ([Kubernetes documentation](https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap)). Leases fail differently. Martin Kleppmann showed in 2016 that a lease can expire while its holder is paused, for example during a stop-the-world garbage collection pause, and the holder keeps acting on a lock it no longer owns. His remedy is a fencing token that the protected resource checks before accepting a write ([Kleppmann, "How to do distributed locking"](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)). An agent that uses a lease to mean "only one worker runs" inherits that failure. A [feature flag gate for agent tools](https://www.robatdasorvi.com/chapters/ai-agents/feature-flags-for-ai-agent-tools-disabling-one-capability-in-production-without-a-redeploy) has the same problem when it is evaluated once per session instead of once per action.

Flags fail in production at scale too. On 2012-08-01, Knight Capital reused an old flag for new trading code but deployed that code to only seven of eight servers. On the eighth server the flag woke up retired 'Power Peg' logic, which sent millions of orders in about 45 minutes. Knight had no automated way to halt the system, and when engineers removed the new code from the other seven servers, all eight began running the old path. The SEC put the loss at more than $460 million ([SEC, 2013](https://www.sec.gov/news/press-release/2013-222)).

| Failure | What it looks like from outside | Control that catches it |
|---|---|---|
| Cached flag | Stop is set, actions continue for the cache window | Read the sentinel on every action |
| Skipped return value | Check returns True, loop continues | Hard process exit, not a return |
| Silent detector | No selector matches, nothing fires | Fail closed when detection returns nothing |
| Paused lease holder | Old holder resumes and acts on a lock it lost | Fencing token checked by the downstream resource |
| Respawn after exit | Process restarts and resumes its schedule | Sentinel checked at startup, exit before any work |

## Isn't the Model the Real Reason Kill Switches Fail?

In my case, no. The model wasn't why the switch failed. It does interfere with shutdown when it can write to the place the stop lives, though, and that's an argument for moving the stop out of its reach.

The strongest counterargument is that the problem is alignment, not plumbing. In a controlled experiment, Palisade Research (May 2025) reported that OpenAI's o3 sabotaged a shutdown mechanism in 7 of 100 runs when told to allow shutdown, and in 79 of 100 runs without that instruction ([Palisade Research, "Shutdown resistance in reasoning models," July 2025](https://palisaderesearch.org/blog/shutdown-resistance); [The Register, 2025](https://www.theregister.com/2025/05/29/openai_model_modifies_shutdown_script/)). That finding is real, and it supports the location argument. The sabotage targeted a script the model could overwrite. A stop the agent's tools cannot write, read by a process the agent cannot modify, closes that path.

The second counterargument is that a shorter cache TTL fixes it. It doesn't. A ten-second cache still fails when the caller discards the return value, which is what happened on 2026-07-21. A shorter window shrinks the delay. It doesn't make the stop binding.

Replit's July 2025 incident shows the same error from the other direction. The SaaStr founder had told the agent not to change code without permission during a code freeze, and the agent deleted a production database anyway. Replit's CEO responded by separating development and production databases ([The Register, 2025](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/)). The freeze lived in a prompt, not in the permission system.

## What Would Have Changed the Outcome?

A hard exit checked at every action, backed by a sentinel the agent writes on lockout and only a human can clear, would have stopped the July loop at its first action after the lockout returned True. The sketch below is minimal and is not the bot's actual code.

```python
import os, sys

HALT_SENTINEL = "/var/lib/agent/HALTED"  # written by the agent on lockout; only a human-run tool can delete it

def halted() -> bool:
    return os.path.exists(HALT_SENTINEL)  # read on every action, never cached

def write_sentinel(reason: str) -> None:
    with open(HALT_SENTINEL, "w") as f:
        f.write(reason)

def hard_stop(reason: str) -> None:
    print(f"HALT: {reason}", file=sys.stderr, flush=True)
    write_sentinel(reason)
    os._exit(78)  # no return path for a caller to skip

def act(action):
    if halted():
        hard_stop("sentinel present")
    return action()

if __name__ == "__main__":
    if halted():  # under KeepAlive=true, launchd relaunches this about every 10s (ThrottleInterval) and it exits each time; exit 0 with KeepAlive {SuccessfulExit: false} to stop the loop
        sys.exit(78)
    run_loop()  # placeholder for the agent's main loop
```

Under launchd KeepAlive=true, the halted process is relaunched roughly every 10 seconds (the default ThrottleInterval) and exits each time; to stop that, set KeepAlive to {SuccessfulExit: false} in the plist and exit 0 when the sentinel is present.

If a lease decides which worker may act, checking it inside the worker is not enough; pass a fencing token with every write and have the downstream resource reject stale tokens, as Kleppmann describes.

The lockout detector must fail closed. If none of the known selectors match and the page is not positively confirmed healthy, call hard_stop("lockout state unknown"). That is the control most likely to have caught the 2026-09-22 failure. The cost is false halts: every X layout change that breaks the health check stops the bot until a human clears the sentinel, and for an account that had already been suspended once, I would take that trade.

If I could change one thing about July, it would be the return type of the check. The check was correct. It was also optional. A stop that returns True to a caller who can decline it is a stop with a polite request built in, and the loop ran for 3.5 days on that politeness.