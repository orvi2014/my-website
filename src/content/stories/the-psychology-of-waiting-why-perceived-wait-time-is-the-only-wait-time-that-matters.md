---
title: "The Psychology of Waiting: Why Perceived Wait Time Is the Only Wait Time That Matters"
description: "The psychology of waiting UX teams keep quoting is half wrong. Hold music solved this in 1962 better than your skeleton screens do."
pubDate: 2026-09-07
category: "psychology"
author: "Orvi"
readingTime: 8
tags: ["psychology", "ux", "perceived performance", "waiting", "product design", "latency", "cognitive science", "design history"]
featured: false
---

"It's not slow. Look at the graph."

The monitor turns toward me. p95 response time, 380ms, flat for six weeks. No regression, no incident. And in the other window, four support tickets from that same week, all some version of *the app has gotten really slow lately*.

Both things are true, which is the part I sat with for a while. The system did not get slower and the users are not lying. No profiler was going to tell me which one to believe. What I wanted was the psychology of waiting that UX teams keep half-quoting at each other: elevator mirrors, airport bags, the spinner that's supposed to feel faster than a blank screen. So I went looking for where those stories actually come from, and one of them fell apart in my hands.

## Why does a fast app still feel slow?

Because users don't experience latency. They experience duration, and duration is a judgment the brain assembles out of whatever evidence it can find. Your p95 measures the system. The ticket measures the assembly.

Jakob Nielsen fixed the boundaries in 1993 in [Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/): 0.1 seconds feels instantaneous, 1 second keeps the flow of thought unbroken, 10 seconds is the ceiling on held attention. Those numbers are still right. But they describe when a wait becomes noticeable, not what happens after it does. Everything interesting lives past the ten-second line, and past that line the engineering metric stops predicting the complaint.

## Why do elevators have mirrors?

Not for the reason you've read. The story — tenants complain the elevators are slow, a consultant installs mirrors, complaints vanish — is almost certainly folklore. I spent an afternoon confirming that, which was an odd afternoon, because it's the most repeated anecdote in the field. It shows up in design talks, in product decks, in my own notes.

The trail runs back to Russell Ackoff's 1963 *A Manager's Guide to Operations Research*, where it is already being told secondhand, and then it stops. No building, no year, no complaint log. Meanwhile Otis was advertising mirrors in lift cars in the 1870s, decades before anyone theorized about elevator boredom, and one durable practical explanation is that wheelchair users need to see behind them to reverse out safely.

So I'd been leaning on a parable. Worth finding out, since the field has a real case with a paper trail, and it comes from the telephone.

## Why was hold music invented?

In 1962, a factory owner in Glen Cove, New York discovered that a loose wire touching a steel girder had turned his building into a radio receiver, and callers placed on hold were hearing the station next door. Alfred Levy filed on it. It issued in 1966 as US Patent 3,246,082, "Telephone Hold Program System." [Smithsonian's history of hold music](https://www.smithsonianmag.com/innovation/a-brief-history-of-hold-music-from-early-patents-to-the-soundtrack-of-customer-service-purgatory-180989185/) tracks the accident and what followed.

Read the patent's own framing and it isn't about entertainment at all. It's about ending the wait in dead silence. Telephony had a specific failure that predates every loading state you've ever shipped: a silent open line and a dropped call are indistinguishable to the person holding the handset. The caller cannot tell whether the wait is progressing, or whether the wait ended and nobody told them.

That's the real inheritance. The on-hold industry's own figures claim roughly 90% of callers abandon within 40 seconds of silence, and that callers in silence overestimate elapsed hold time by as much as 70%. Those are vendor numbers rather than peer review and I'd treat them as directional only. Even discounted hard, they point the same way as every controlled finding that came after. Silence gets read as failure.

## What is the difference between occupied and unoccupied waiting time?

Occupied time is time you're doing something with. Unoccupied time is time spent on nothing but the wait. Same clock, wildly different judgments.

David Maister formalized this in 1985 in [The Psychology of Waiting Lines](https://www.columbia.edu/~ww2040/4615S13/Psychology_of_Waiting_Lines.pdf), eight propositions, the first being that unoccupied time feels longer than occupied time. A [2025 review of that paper's forty-year afterlife](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5669790) worked through nearly 1,500 citations and 201 peer-reviewed articles. Support varies a lot by proposition. This one held.

The cleanest field demonstration is the Houston airport case, reported by Alex Stone in the New York Times in August 2012 in [Why Waiting in Line Is Torture](https://www.nytimes.com/2012/08/19/opinion/sunday/why-waiting-in-line-is-torture.html). Passengers walked one minute from gate to baggage claim, then stood there for seven more. Eighty-eight percent of the wait was spent doing nothing. The airport had already added handlers and was hitting industry benchmarks, and the complaints kept coming. So they moved the arrival gates farther out and routed bags to the outermost carousel. The walk got six times longer. The total wait didn't shrink at all. Complaints fell to near zero.

That's the version of this story I trust, because it has an operator, a date, and a number.

## Do progress bars and skeleton screens actually reduce perceived wait time?

Progress bars, measurably yes. Skeleton screens, not reliably, and there's a study where they finished last.

Chris Harrison, Zhiquan Yeo and Scott Hudson tested the bars directly at CHI 2010 in [Faster Progress Bars](https://www.chrisharrison.net/projects/progressbars2/ProgressBarsHarrison.pdf). Same actual duration, different animation. A bar with ribbing animated backward and decelerating cut perceived duration by 11%. A [2022 Scientific Reports study](https://www.nature.com/articles/s41598-022-14649-1) found the mechanism underneath: more, smaller steps read as faster progression and compress estimated time, while fewer, larger steps dilate it, independent of actual speed or distance covered.

So I reached for the modern equivalent and got burned again. Viget ran [a test of skeleton screens against spinners and a blank screen](https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens/) with 136 participants in 2017. The skeleton screen lost on every metric. Participants shown a plain loading spinner rated the wait more positively and estimated it as shorter than the ones shown the skeleton. The thing the industry adopted as the sophisticated option underperformed the thing it was replacing.

Two design patterns, both aimed at perceived speed, opposite results. The gap between them is where the actual answer is.

## Should I just make the app faster instead?

Speed is real and you should buy it where you can. But "just optimize" isn't a complete answer, and there's a result that breaks it.

The obligatory numbers first, because they're true. In November 2006, Greg Linden [reported](http://glinden.blogspot.com/2006/11/marissa-mayer-at-web-20.html) that Amazon's A/B tests showed roughly a 1% sales drop per 100ms of added latency, in the same post where Marissa Mayer's Web 2.0 talk put a 500ms delay in Google search at a 20% traffic drop. Latency costs money.

Now the awkward one. Ryan Buell and Michael Norton, in [The Labor Illusion](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376), *Management Science* 57(9), 2011, ran five experiments on simulated travel and dating sites. Users shown a site that displayed its work, naming the airlines it was querying one by one, often *preferred* it to a site returning identical results instantly. Making the wait longer and visible increased perceived value.

You cannot get that out of a speed model. Under a pure speed model, zero is the optimum and every millisecond above it is loss. Buell and Norton found a region where added duration is a gain, which means perceived wait time and actual wait time aren't the same axis at all. Correlated, sure. Identical, no, and you can move one without touching the other. Houston moved the perception and left the clock alone. The travel site moved it by adding to the clock.

## Why does a slow spinner make people think the network is broken?

Because a spinner is a heartbeat rather than a report. It proves the system is alive and tells you nothing about what it's doing, so users fill the gap with their own causal story, and the story they reach for is that something is wrong.

This is where I ended up somewhere I hadn't expected. I went in believing the lesson was *distract them*. It isn't. A [2025 series of experiments in the International Journal of Human–Computer Interaction](https://www.tandfonline.com/doi/full/10.1080/10447318.2025.2492806) found that lab results on throbber rotation speed reverse in real usage. In the lab, a faster spinner shortens perceived time. In the wild, people read a slow spinner as evidence the network is slow. They stop treating it as decoration and start treating it as data.

Which reframes everything above. Hold music worked because it proved the line was open. The Houston walk worked because moving toward your bag is evidence the bag is coming. The labor illusion worked because those airline names were a true account of where the seconds went. And the skeleton screens lost because a gray rectangle asserts a layout that may never arrive and says nothing about progress. So the variable was never occupation, and it was never speed. It's whether the wait is legible: whether the user can build an accurate story about where their time is going.

## How do you actually measure perceived wait time?

Mostly you don't, and that's the part I haven't solved.

I can instrument p95. I have no instrument for legibility. Those four support tickets were the only signal I had that perception had drifted from measurement, and four tickets isn't a metric, it's an accident of who bothered to write in.

Worse, legibility and theater look identical in a screen recording. Hold music was honest by accident. It couldn't lie about progress, only about the line being open, and about that it was telling the truth. A modern loading state can claim anything it wants. "Analyzing your data" while a queue job sits idle would pass every test I currently have. The 2011 result depends on the labor being real, nothing in my stack enforces that, and it's a failure mode I'd ship without noticing, because it would look exactly like the fix.

So I know what to build. What I don't know is how I'd find out, six months from now, that I'd built the lie instead.