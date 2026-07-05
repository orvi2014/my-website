---
title: "The Paradox of Choice: Barry Schwartz Was Right and SaaS Products Keep Ignoring It"
description: "The paradox of choice in product design isn't a myth — the data shows 24 jams beat 6 only until checkout. Here's why SaaS keeps adding options anyway."
pubDate: 2026-06-16
category: "psychology"
author: "Orvi"
readingTime: 9
tags: ["paradox of choice", "barry schwartz", "saas", "choice overload", "product design", "behavioral economics", "decision fatigue", "product management"]
featured: false
---

Every feature you ship makes your product harder to buy.

That is the uncomfortable version, and it is the one most product teams will argue with before they finish the sentence. But the paradox of choice in product design is not a vibe or a design-blog opinion — it is one of the most stubbornly replicated findings in consumer psychology, and the people building software keep behaving as if it does not apply to them. Barry Schwartz named it in 2004. The data behind it is older and harder than his book. And twenty-two years later, the average SaaS product is a monument to ignoring it.

Start with the number that breaks the story everyone tells themselves.

In Sheena Iyengar and Mark Lepper's 2000 field experiment at an upscale California grocery store, a tasting table offering **24 jams drew 60% of passersby to stop, while a table with only 6 jams stopped 40%**. More choice won the attention battle decisively. Then came the part that should terrify every growth team: **3% of the people who stopped at the 24-jam table actually bought a jar. At the 6-jam table, 30% did.** Cutting the options by three-quarters multiplied conversion-among-stoppers by ten ([Iyengar & Lepper, 2000, *Journal of Personality and Social Psychology*](https://pubmed.ncbi.nlm.nih.gov/11138768/)).

The big display got the traffic. The small display got the revenue. If you have ever A/B tested a landing page, sit with that for a second.

## Does More Choice Actually Hurt Sales?

Yes — once the options become hard to compare, the extra choices suppress the decision instead of expanding it. The jam study is the famous version, but the most expensive version involves people's retirement.

Iyengar, Gur Huberman, and Wei Jiang analyzed Vanguard data covering roughly **800,000 employees across 647 retirement plans** and found that **every additional 10 mutual-fund options was associated with a 1.5-to-2 percentage-point drop in 401(k) participation** ([Iyengar, Huberman & Jiang, 2004, Pension Research Council](https://repository.upenn.edu/prc_papers/426/)). These were not jars of jam. This was free money — employer-matched contributions — and people walked away from it because the menu was too long to evaluate. When choosing is hard, the rational-looking move is to not choose at all. In SaaS that shows up as the abandoned trial, the unfinished onboarding, the pricing page that gets a long scroll and no click.

Now hold that mechanism next to how software is actually built.

## Why Do SaaS Products Keep Adding Features Nobody Uses?

Because the system rewards shipping features, not removing them — and almost nothing measures the cost of the ones that don't get used. The result is staggering waste hiding in plain sight.

Pendo analyzed feature adoption across **615 of its subscriptions in 2019 and found that 80% of features in the average product are rarely or never used** — and estimated that public cloud-software companies had collectively poured **$29.5 billion in R&D** into features their customers ignore ([Pendo, 2019 Feature Adoption Report](https://www.pendo.io/resources/the-2019-feature-adoption-report/)). The Standish Group's older breakdown is even more brutal: across delivered software features, **45% were never used and 19% rarely used**, for a combined 64% that essentially never earned their keep ([Mountain Goat Software's analysis of the Standish data](https://www.mountaingoatsoftware.com/blog/are-64-of-features-really-rarely-or-never-used)). That original figure rested on only four applications and deserves the skepticism it gets — but Pendo's 80%, built on 615 real product datasets, points the same direction with far more weight behind it.

Here is the trap. Every one of those unused features is not free. It is a new menu item on the tasting table. It is another fund in the 401(k). It widens the choice set for the next user who has to figure out what your product is *for*, and per Iyengar's data, that widening is precisely what suppresses the decision to commit. The unused features do not sit quietly in a corner. They tax the conversion of everything else.

So why does it keep happening? Not because product managers are foolish. Because of the system they operate inside.

## What System Produces Feature Bloat?

It is the feature factory — a delivery system that measures output (features shipped) instead of outcome (decisions made easier), and whose every incentive loop points toward addition. Name it, because you cannot fight what you refuse to name.

Follow the loops. Sales loses a deal and files a feature request, because "the prospect asked for X" is an unanswerable argument inside a revenue org. A competitor ships something, so parity goes on the roadmap — nobody was ever fired for matching a competitor's checklist. A product manager's promotion case is built on launches, not on the modal they deleted. The quarterly roadmap demands new things to announce, because a release-notes email that says "we removed four features" reads like retreat. Each loop is locally rational. Each loop adds an option. None of the loops contains a force that subtracts, because subtraction has no internal champion: the cost it imposes — suppressed conversion, slower onboarding, decision fatigue — lands diffusely on users who never file a ticket that says "you have too many features."

That asymmetry is the whole disease. Addition has a thousand advocates inside the building. Removal has none. The paradox of choice is not a UX problem the design team can fix downstream — it is the inevitable output of an incentive structure where every gradient points the same way. The individuals are responding sanely to the system. The system is the thing that is broken.

And the standard rebuttal to all of this deserves a real answer, not a dismissal.

## Didn't the Jam Study Fail to Replicate?

Partly, and this is the honest counterargument: the single largest meta-analysis of choice overload found a mean effect of roughly zero. But the same body of research shows *why* it averages to zero — and the conditions where the effect is strongest are an almost exact description of buying software.

In 2010, Benjamin Scheibehenne, Rainer Greifeneder, and Peter Todd pooled **50 experiments (63 conditions, about 5,036 participants) and reported a mean effect size of choice overload that was virtually nil** ([Scheibehenne, Greifeneder & Todd, 2010, *Journal of Consumer Research*](https://academic.oup.com/jcr/article-abstract/37/3/409/1827647)). For a decade, that paper was the trump card people played to wave the jam study away. More choice, they said, is fine. The original result was a fluke that didn't hold up.

Then Alexander Chernev, Ulf Böckenholt, and Joseph Goodman went back through the evidence — **99 observations, 7,202 participants** — and found the missing structure. Choice overload is real, but conditional. It reliably appears when four moderators are present: **high choice-set complexity, high decision-task difficulty, high preference uncertainty, and an unclear decision goal** ([Chernev, Böckenholt & Goodman, 2015, *Journal of Consumer Psychology*](https://www.sciencedirect.com/science/article/abs/pii/S1057740814000916)). Average across studies where those factors are absent — picking a chocolate when you already know you like chocolate — and the effect washes out to zero. That is what Scheibehenne measured. It is not evidence that choice overload is fake. It is evidence that it is *specific*.

Now read those four moderators as a SaaS spec sheet. Complex set of options? That is a pricing page with five tiers and an add-on matrix. Difficult task? That is comparing your feature list against three competitors during a 14-day trial. Preference uncertainty? That is a buyer who does not yet know which jobs your tool does. Unclear goal? That is the user who installed your product to "see if it helps" with nothing specific in mind. Software onboarding and pricing pages are not the chocolate condition where the effect vanishes. They are the precise conditions where Chernev's data says it bites hardest. The meta-analysis that supposedly kills the paradox of choice is, read carefully, the strongest case that it governs your funnel.

The conversion numbers are consistent with exactly this. Across industry benchmarks, **opt-in free trials that ask for nothing upfront convert at around 8.9%, while opt-out trials requiring a credit card convert near 31.4%** ([Userpilot SaaS benchmarks](https://userpilot.com/blog/saas-average-conversion-rate/)). The credit-card requirement works partly by collapsing the decision: it removes the open-ended "should I, shouldn't I, what else is out there" deliberation that the paradox of choice feeds on, and replaces it with a single committed path. Constrain the choice, and people decide.

## So What Happens Next, and When?

The pricing page is where this breaks first, because it is the one screen where the cost of too many options is measured directly in lost revenue and a controlled experiment is one deploy away. The trend has already turned: **pure subscription models have fallen from roughly 65% to 43% of SaaS pricing**, with companies consolidating toward simpler, usage-aligned structures ([Invesp, State of SaaS Pricing](https://www.invespcro.com/blog/saas-pricing/)).

Here is the falsifiable prediction. By **December 31, 2027**, the median number of distinct paid tiers shown on the public pricing pages of the top 100 B2B SaaS companies will be **three or fewer** — down from the four-to-five-tier sprawl that dominated 2020–2023 — and the products that cut a tier will report higher trial-to-paid conversion, not lower revenue. The mechanism is not taste. It is Iyengar's 3%-versus-30% playing out at scale, finally measured by teams who got tired of watching qualified buyers stall on a comparison table. If, by that date, the median pricing page still shows four or more tiers and the simplifiers show flat conversion, then the paradox of choice does not govern software the way I am claiming, and you should disregard everything above.

Barry Schwartz did not discover a curiosity about jam. He described the load-bearing constraint of every product anyone has to choose to use. The feature factory has spent two decades betting that constraint does not apply to it. The bet is coming due, and the first invoice arrives on the pricing page.