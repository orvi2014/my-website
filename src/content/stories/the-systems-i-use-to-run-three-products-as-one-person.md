---
title: "The Systems I Use to Run Three Products as One Person"
description: "Three products, one person. The systems that make it work, and why most solo founders with a second product are really just avoiding a verdict."
pubDate: 2026-09-08
category: "building"
author: "Orvi"
readingTime: 8
tags: ["solo founder", "bootstrapping", "product portfolio", "indie hacking", "systems", "focus", "saas", "automation"]
featured: false
---

Last Tuesday at 11:40pm I had a scaffold command typed out and my finger resting on enter. New directory, doesn't exist yet, product number four. Two windows behind that terminal sat a support email from Sunday, from a person who actually pays me for something I shipped fourteen months ago. I hadn't opened it.

I've been in that exact moment three times now. I run noburn, AgencyHandy and APIDiffGuard, plus a writing site and an automation stack that posts on my behalf. So let me say the part that never makes it into the "how I run multiple products" posts, the part most builders I know believe privately and then launder into the word *portfolio*: most second products aren't diversification. They're the most sophisticated procrastination available to someone who can code. It's the only kind of avoidance that ships commits.

I'm not telling you to stop. I obviously didn't. I'm telling you to be precise about which of your products is which.

## Can one person actually run three products?

Yes, under two conditions, and the second one is the hard one. The products have to share a substrate. And two of the three have to be starved of your attention on purpose, by you, on a schedule, rather than starved by accident because the newest one keeps eating everything. Three products isn't the failure mode. Three products that each believe they're the priority is.

The arithmetic here is public and unkind. MicroConf's [State of Independent SaaS](https://microconf.com/state-of-indie-saas) surveyed roughly 700 independent founders: 38% of those businesses earned under $10,000 in *annual* revenue, and about 1% crossed $1M ARR. That's the real context for your decision, not motivational trivia. It isn't a bell curve you land somewhere in the middle of. It's a long tail with a lottery attached, and any single product you build starts with an expected value close to zero.

Then there's survival. Bureau of Labor Statistics figures put [77.9% of new establishments through year one and about 51.4% at five years](https://www.bls.gov/opub/ted/2024/1-year-survival-rates-for-new-business-establishments-by-year-and-location.htm). Call it a coin flip over five years, and that's for businesses with employees, revenue, and usually a market somebody validated before signing a lease.

So the honest framing of your situation isn't "should I focus." It's that you're placing a small number of high-variance bets against a hard ceiling on your own throughput, with no reliable way to know in advance which bet is the good one.

## Why the second product feels so good

Because a new product is the only place where the feedback is guaranteed positive. Every commit works. No design decision has been punished yet. Nothing has failed, because nothing has been shown to anyone who could reject it.

The uncomfortable version is that what you're running from isn't boredom. It's the verdict. Product one has been live long enough to be judged, the judgment is arriving, and it isn't good. Building product two means it never has to land, because now there's an explanation for the flat numbers. You're split. You're busy. You're running a portfolio. The portfolio is an alibi.

I did this. My writing site sat at 281 followers on X for months while I told myself the problem was reach. When I finally instrumented it, impressions correlated with follows at r=0.38 and engagement correlated at r=0.80. The lever had been sitting in plain sight the entire time. Nothing had blocked me from pulling it. I'd just been somewhere else, building.

Here's the test I use now, which takes about thirty seconds. For each product, write down the one number that would tell you it's working, and the date it has to hit that number by. If you can't produce the number, that product isn't a business, it's a hobby with a Stripe account. Fine, but call it that. If you *can* produce the number and you've never checked it, you already know what the 11:40pm scaffold command was for.

## Isn't the answer just "focus on one thing"?

It's the right advice at the wrong stage. Focus is a concentration strategy, and concentration pays once you have evidence that your one bet beats the base rate. Before that evidence exists, concentration is an unhedged bet placed blind, and calling it discipline doesn't change the math.

This is the objection I get most, and it deserves a real answer because there's real data behind it. The [Startup Genome premature-scaling report](https://s3.amazonaws.com/startupcompass-public/StartupGenomeReport2_Why_Startups_Fail_v2.pdf) found that solo founders take 3.6x longer to reach the scale stage than a two-person founding team. That's a measured penalty on being one person, and splitting yourself further ought to make it worse.

But look at what the finding actually measures. Solo founders are slower *per product*. That's a throughput constraint. If thin focus were the binding problem, you'd expect solo founders pouring everything into a single product to outperform on that product. They don't. They take 3.6x longer on the one thing they were already giving everything to. Meanwhile CB Insights' post-mortems of failed startups put *no market need* at the top of the list, cited in [42% of failures](https://s3-us-west-2.amazonaws.com/cbi-content/research-reports/The-20-Reasons-Startups-Fail.pdf). Focus does not fix "nobody wants this." It makes you extremely efficient at building it anyway.

So the resolution is about stage rather than character. You run several small bets while you're still searching, because signal is the scarce input and you cannot manufacture it by concentrating harder. The day one of them shows real traction, the portfolio stops being a hedge and becomes a tax, and you kill or freeze the others that week rather than next quarter.

Almost nobody makes that switch on time. Same reason they started the second product: switching lets the verdict land.

## How I actually split the time

I don't split it. I rank it. One product per day, never one product per hour, because the unit of allocation has to be at least as long as the cost of switching, and that cost is measured in tens of minutes.

This is the one place where the productivity research is load-bearing rather than decorative. Gloria Mark's UC Irvine work on interrupted knowledge work ([CHI 2008](https://ics.uci.edu/~gmark/chi08-mark.pdf)) found that people compensate for interruption by working faster and pay for it in stress, frustration and time pressure. The companion figure everyone quotes from her 2004–2006 studies is 23 minutes and 15 seconds to get back to the original task. The APA's summary of Rubinstein, Meyer and Evans (2001), [Executive Control of Cognitive Processes in Task Switching](https://www.apa.org/topics/research/multitasking), puts the cost of switching as high as 40% of productive time, with the penalty climbing as tasks get more complex and less familiar.

Three codebases, three deploy pipelines, three auth systems, three billing integrations. That's roughly the worst-case version of the experiment. When you're the only person holding all of it, 40% isn't an abstraction. It's most of your week.

What that looks like in practice:

A shared substrate. Same host, same auth, same billing, same error reporting, same deploy command across all three. If a fourth idea needs its own stack, I don't have a portfolio, I have a fourth job. The substrate is the entire trick. It's what converts "three products" into "one product with three front doors."

One product owns the calendar, the others own a queue. The active product gets scheduled blocks. The other two get an inbox I drain on one fixed day. Nothing jumps that queue except a paying customer who is broken right now.

A re-rank date, in writing. Every six weeks I re-rank against the numbers I wrote down, never against how each product feels. Feelings always vote for whichever product is newest.

Batched approvals for anything automated. My outreach and content stack drafts everything and sends it to me to approve, and I clear the whole queue in one sitting. Otherwise automation doesn't save time. It just relocates the interruption into forty smaller ones.

## What breaks first

Silent failure. Not the outage that pages you at 2am, which is honestly the easy kind, but the pipeline that keeps running normally while producing nothing, inside the product you weren't looking at that month.

My clearest example: an automated long-form content lane that appeared healthy for weeks. It was failing JSON parsing on 8 of 20 generations, and because each attempt consumed the full 48-hour slot, 40% of that channel's output simply never existed. Nothing alerted. Nothing crashed. The dashboards were green because nothing on them measured the thing that mattered.

With one product you catch that in a day, since you're looking at it every day anyway. With three, the neglected product's failures get a multi-week detection window, and that window is where the actual cost of a portfolio lives. So the rule I don't bend: every product emits one number into one place I see daily, and the alert fires on absence. Zero output has to be loud on its own. An exception trace is a luxury.

## When to kill one

On the date you wrote down, at the number you wrote down. If you catch yourself renegotiating either one, that *is* the answer. The renegotiation is the data.

Killing is part of the system rather than proof the system failed. A product without a written kill condition isn't a bet, it's an open-ended subscription you pay in attention. Freezing counts too: maintenance mode, no roadmap, lights on for existing customers, zero calendar blocks. Legitimate outcome, and usually the right one.

---

If you've got a minute, do this instead of reading the rest of your tabs. Don't run the scaffold command tonight. Open the support email. Then open a text file and write three lines, one product per line, each with a number and a date. It took me about four minutes to see which product I'd been using to avoid finding out about the others.

Keep building all three if you want. I do. Just keep them because you chose to stay in the search, and not because a new repo is the one room the verdict can't get into. It's coming either way. Another repo only buys a later and more expensive version of it.