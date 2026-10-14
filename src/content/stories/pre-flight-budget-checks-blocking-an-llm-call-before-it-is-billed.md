---
title: "Pre-Flight Budget Checks: Blocking an LLM Call Before It Is Billed"
description: "Want to limit OpenAI API spending? Dashboard caps fire after the bill is already running. The check has to run before the request exists."
pubDate: 2026-10-13
category: "building"
author: "Orvi"
readingTime: 8
tags: ["llm cost control", "openai api", "spend limits", "ai agents", "pre-flight checks", "agent engineering", "noburn", "budget enforcement"]
featured: false
---

The check returned `True`, and that's why the bug took so long to find.

On 2026-07-21, X suspended the account my growth agent ran on. The lockout detector did exactly what I wrote it to do. It saw the suspension and returned `True`. The caller read that, skipped one action, and moved on to the next iteration. The loop then ran for another 3.5 days against a dead account. Nothing crashed, and the logs looked fine. The detector was right the whole time. Nobody downstream was listening.

If you came here searching for how to **limit OpenAI API spending**, there's a fair chance you're making the same mistake with money. You found the project budget in the dashboard, typed in a number, and felt covered. You aren't. That check is correct, but it lives in the wrong part of your system and it's built for a different failure than the one you're worried about.

## Doesn't the OpenAI dashboard already cap my spending?

One of its settings does. It caps the wrong thing. OpenAI's docs say outright that spend alerts "do not enforce a cap." The hard spend limit does block traffic, but it covers a whole project for a whole month.

[OpenAI's spend-limits guide](https://developers.openai.com/api/docs/guides/spend-limits.md) describes two controls. A spend alert notifies you and lets traffic keep flowing. A hard spend limit returns a `429` with the code `project_spend_limit_exceeded` once tracked spend hits your number. The same page admits that "enforcement is not instantaneous, so recorded spend can slightly exceed the configured amount," and that the limit "resets with the next monthly cycle."

So the unit is a project and the window is a month. When the limit trips, everything in that project fails together: the runaway loop, your paying customer, your health check. The guide itself warns that "hard spend limits can interrupt production traffic." Of course it does. It's the main breaker for the whole building.

Anthropic is no different. [Workspace spend limits](https://platform.claude.com/docs/en/build-with-claude/workspaces) cap monthly spend per workspace, inherit from the organization, and can't be set on the Default Workspace at all. Google Cloud's own blog [admits](https://cloud.google.com/blog/topics/developers-practitioners/protect-your-google-cloud-spending-budgets) that budgets "don't actually cap your usage." Ask any major provider how to stop spending and you get the same answer: a monthly number pinned to an account.

## What does a runaway agent bill actually look like?

Small, spread across hours, and normal-looking on every dashboard you own. One loop I left running overnight cost $47. That loop is the reason I started Baar-Core.

$47 won't come close to tripping a monthly cap set at any sane production level, and that's exactly the trouble. A runaway agent rarely makes one enormous request. It makes a few thousand reasonable ones in a row that nobody asked for, and you pay for each of them.

The token math gets worse every year. Anthropic's [June 2025 write-up of its multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) says "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats." The same post says token usage alone "explains 80% of the variance" in performance. Burning tokens is how the architecture wins. The systems you're building are designed to burn them.

Meanwhile per-token prices keep dropping. Stanford's [2025 AI Index](https://hai.stanford.edu/ai-index/2025-ai-index-report) has GPT-3.5-level performance costing $20 per million tokens in November 2022 and $0.07 by October 2024, more than 280× cheaper. You'd think that helps. It mostly encourages longer loops and more agents. What grows is the cost of a single run, and no dashboard I know of counts runs.

## Why isn't monitoring enough?

Monitoring tells you what already happened. The failures that cost money look like success while they're happening.

For about six weeks, four hardcoded target accounts that no longer existed ate 88% of my bot's daily comment attempts. Every run logged success. Nothing threw. Each attempt did real work too: a model call, generated text, a used-up slot. A tracing dashboard would have shown me six weeks of green, fully instrumented waste.

The article lane had the same disease. JSON parse errors killed 8 of 20 generations, and each failure quietly burned a 48-hour slot. And the Telegram Skip button did nothing for months, so every skip got logged as a timeout and my approval stats were fiction the entire time.

None of this was exotic. It's just how automated systems usually fail: everything reports success and nothing useful comes out. Langfuse, LangSmith, Arize Phoenix and Traceloop are good at showing you that after the fact. But they record the call once the provider has already billed it, and a beautifully traced wasted call is still a wasted call you paid for.

If your cost control only runs after the request goes out, you have a reporting tool.

## Where should the spending check actually run?

In your own code, right before the provider call, returning allow or block. If it blocks, the request never gets built, so there's nothing to bill.

That's the whole idea behind [noburn](https://noburn.dev), which I built. The call site looks like this:

```js
// guard is configured from NOBURN_API_KEY and NOBURN_PROJECT_ID
const decision = await guard.check({
  model,
  estimatedTokensIn,
  estimatedTokensOut,
  endUserId,
});

if (decision.blocked) {
  return; // the request never exists, so it is never billed
}

const response = await openai.chat.completions.create({ model, messages });

await guard.record({ /* actual token counts from response.usage */ });
```

One check resolves three caps: project, per end user, and per run. Provider dashboards can't give you the per-run cap, and it's the one that would have caught my $47 night. A runaway loop is just a run that should have ended. Cap the run and you kill the loop without touching anyone else's traffic.

Now look at the `if` statement, because that's where my July bug actually lived. Detection worked fine on 2026-07-21. A better detector wouldn't have helped. The fix was forcing the caller to obey the answer: exit the process, and write a sentinel file only a human can clear, because launchd's KeepAlive happily respawned a plain exit. Budget checks fail the same way. If `blocked` means "log a warning and carry on," you've rebuilt the July bug and stuck a dollar sign on it.

Writing the check takes an afternoon. Getting every caller to treat "block" as final is where the real effort goes.

## Isn't a gateway the standard answer to this?

It is, and gateways really can refuse a call. They just need all your traffic to go through their proxy first.

This is the strongest objection, so I'll give it its due. LiteLLM and Portkey enforce budgets before the provider ever sees a request, and they do it well. If you already route everything through one of them, you have pre-flight enforcement. Keep it. Nothing here is an argument for ripping it out.

The price is architectural. A proxy sits on every request path. Your connection to the provider now belongs to them, your SDK points at their endpoint, and their uptime is your uptime. For a platform team wrangling dozens of internal projects, that's a reasonable deal. For a seed-stage team or a solo dev who wants one cap on one loop, it's a lot. The standard advice treats "add a gateway" as the obvious default, but most people searching for this have one app talking directly to one provider. A gateway is the heaviest possible answer to a fairly small question.

The third option is one extra call and no proxy. You keep your provider SDK and your direct connection. That's what I picked, and it isn't free either. A network check adds latency, and I'm not going to quote a number I haven't earned: noburn doesn't have enough production traffic yet for an honest p50. What the repo does ship is `scripts/bench-check.mjs`, which measures the added latency against your own project. Run it before you trust anyone's figure. Mine included.

## What happens if the budget service itself is down?

You decide ahead of time with `onError`. Both choices cost you something.

Fail open, and an unreachable checker lets calls through. Traffic keeps flowing, and for the length of the outage you've lost the cap, which is the exposure you were trying to get rid of. Fail closed, and an unreachable checker blocks everything. The cap holds, and you eat an outage that wasn't your fault.

There's no universally right answer. A customer-facing chat endpoint should probably fail open. An unattended overnight batch job should fail closed, since overnight jobs are how I got the $47 bill in the first place. The real mistake is never choosing. Then you learn what the default was in the middle of an incident.

## Can it really know the cost before the call runs?

Not exactly. You can count input tokens up front. Output tokens are a guess, and I haven't solved that.

`estimatedTokensOut` is a number you supply. Guess low and a call that should have been blocked slips through. Guess high and you block calls that would have fit. `guard.record()` meters the real counts afterwards, so the ledger stays honest and the error doesn't pile up across calls. Inside a single call, though, the error is still there. Blocked calls don't consume quota, so erring conservative is cheap, but tuning the estimate is on you.

The other gap is self-hosting. noburn is hosted-only right now. Some teams can't use it for that reason alone, and I see that as something to fix, not a principled stance.

## Is this worth changing if nothing has gone wrong yet?

Yes. The failures that cost money don't look like anything going wrong.

Gartner [predicted in June 2025](https://www.newelectronics.co.uk/content/news/over-40-of-agentic-ai-projects-could-be-cancelled-by-2027) that more than 40% of agentic AI projects will be cancelled by the end of 2027, with rising costs as a lead reason. Cost escalation almost never arrives as one dramatic invoice. It's a month of correct-looking calls nobody needed, made by a loop that never stopped because nothing told it to.

My second suspension shows where every check runs out. On 2026-09-22, a week after I raised the reply cap from 16 to 150, X suspended the account again. This time the page matched none of the lockout check's known selectors, so it never fired, and I had to stop the bot by hand. A check only catches the failures it was written to recognize. I can't predict what the next failure will look like. I can always count runs and dollars, so that's where the cap goes.

If you skipped to the end, here's the short version. Keep the dashboard limit, as a backstop for the whole building and nothing more. Put a check in front of every call, and make sure it knows which run the call belongs to. When it says "blocked," end the run and keep it ended until a human says otherwise. Pick fail-open or fail-closed tonight, deliberately. Then grep your code for every place that reads the check's answer and make sure each one actually stops.