---
title: "How to Price a SaaS Product When You Have No Competitors to Copy"
description: "Pricing with nobody to copy feels like guesswork. But the wrong number is rarely what kills you. What kills you is who that number brings through the door."
pubDate: 2026-09-15
category: "building"
author: "Orvi"
readingTime: 10
tags: ["saas pricing", "pricing strategy", "value-based pricing", "category creation", "startup postmortem", "unit economics", "willingness to pay", "product strategy", "monetization"]
featured: false
---

I keep coming back to a number published in 1992. A 1% increase in price moves operating profit 11.1%. A 1% increase in volume moves it 3.3%. Michael Marn and Robert Rosiello at McKinsey ran that across 2,463 companies in the Compustat aggregate and put it in [Harvard Business Review](https://hbr.org/1992/09/managing-price-gaining-profit) thirty-four years ago. Price is roughly three to four times the lever that growth is, and has been for my entire life.

Now set that next to what actually happens when you have nothing to copy. You open Stripe on a Tuesday, you type a number that feels defensible, you go back to shipping. I've done it. Most people I know who've launched something have done it. Then eighteen months later there's a postmortem blog post, and it blames the market.

What the wreckage suggests is less flattering and more interesting. The wrong price is rarely the thing that kills a company outright. What does the killing is who the wrong price recruits, and by the time you can see that clearly it has stopped being a pricing problem. It's a product problem, a hiring problem, and a positioning problem, none of which pricing can reach anymore.

## Why did Docker fail to make money from containers?

Not because containers were hard to charge for. Because Docker set the reference price of an entire category at zero, and the money then showed up one layer above where it had any standing to charge.

On 13 November 2019, Docker sold its enterprise platform business to Mirantis and [raised $35 million to restart as a developer tools company](https://techcrunch.com/2019/11/13/mirantis-acquires-docker-enterprise/). Two years before that, Bloomberg had it raising at a $1.3 billion valuation. Docker invented the unit of modern software deployment. Practically every serious engineering org on the planet ran it. And the company that built it sold off the division that was supposed to pay for the company.

The usual reading: open source is hard to monetize, Docker gave away the runtime, Kubernetes ate orchestration. That's all true. It's also not the part that did the damage.

Here's the part that did. Because `docker run` was free, the industry learned what containers were worth at the same moment it learned what containers were. Zero became the coherent price of the category, not as a positioning choice but as a fact that buyers absorbed and stopped questioning. When real budget finally materialized, it materialized at the orchestration and registry layer, because that was the first place in the stack anyone had ever charged for anything. Docker had spent six years teaching the market that its own layer was free. It could not then walk into procurement and argue otherwise.

You could see the bill come due in August 2021, when Docker [started requiring paid subscriptions for Docker Desktop](https://www.docker.com/blog/updating-product-subscriptions/) at companies with more than 250 employees or more than $10 million in annual revenue. Technically a small change. The reception was something else. Engineers treated a modest per-seat fee as a betrayal, and teams were publishing migration guides to alternatives within weeks. That's what an anchor does to you seven years on. Docker wasn't charging too much in 2021. It was charging against a number it had set itself in 2014, and lost.

## How do you price a SaaS product with no competitors to compare against?

Price it against what the customer's current workaround costs them, usually at 10–20% of that monthly cost, and pick the number before you have users, because once you have users your willingness-to-pay research is poisoned by your own price.

This is value-based pricing with the one input you can still trust. The method, step by step:

1. **Name the workaround.** Nobody's problem is sitting there unsolved; it's solved badly. Three contractors and a spreadsheet, four hours a week of a senior engineer's time, or a $90,000 enterprise tool somebody bought for one feature.
2. **Put a monthly dollar figure on it.** Hours × loaded hourly cost × 4.33 weeks, plus any tools or contractors the workaround needs.
3. **Price at 10–20% of that figure.** The customer keeps 80–90% of the saving, which is what makes switching an easy yes rather than a procurement debate.
4. **Lock the number before launch.** Don't set it by asking early users what they'd pay (the reason why is below).
5. **Write down when you'll re-derive it.** A customer count or a date, not a feeling. More on this at the end.

**Worked example.** Say your product replaces a workaround that eats 4 engineer-hours a week. The US Bureau of Labor Statistics puts [median software developer pay at $133,080 in 2024](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm), roughly $64 an hour, and benefits add about another 30% of total compensation according to the [BLS Employer Costs for Employee Compensation](https://www.bls.gov/news.release/ecec.nr0.htm) release. Call the loaded cost $100 an hour to keep the math clean. 4 hours × $100 × 4.33 weeks comes to about $1,700 a month. At 10–20%, you'd price at roughly $170–$350 a month per team. Not $29.

Step 4 is where no-competitor pricing gets structurally different from competitive pricing, and it's sneakier than it sounds. Once you ship at $29, every willingness-to-pay conversation you have is with somebody who already self-selected into a $29 product. Ask them what they'd pay and they'll give you a thoughtful, internally consistent answer, calibrated entirely against your anchor. You will feel like you're measuring the market. You're measuring the echo of a decision you made on a Tuesday, and it will look like clean signal on the way in.

The workaround is the only uncontaminated reference point available. Those costs exist whether or not you do. Price against them.

Then do the arithmetic that the comfortable-sounding low price quietly lets you skip. Price Intelligently's finding, [reported by the Boston Globe in 2022](https://www.bostonglobe.com/2022/06/02/business/profitwell-its-all-about-getting-price-right/), is that the typical subscription company spends under six hours thinking about pricing across its entire existence. Six hours, on the lever with the 11.1x multiplier attached. That's not negligence exactly. It's the quiet conviction that price is a detail you'll get around to.

## Was the free tier really the mistake?

No. The mistake was treating the number as marketing when every price is actually a filter on who walks in.

Shyp makes this easier to see, because there's no open-source ideology to argue about. Shyp launched in 2013 charging $5 plus postage to come to your door, pack your thing, and ship it. Nobody had priced "a human shows up and deals with your package" before, so the $5 came from nowhere in particular, on the reasonable theory that it was low enough to feel like a magic trick.

It was. And the magic attracted exactly the wrong people.

Five dollars is the price at which it makes sense to summon a courier for one sweater you're returning to an online store. It is not the price at which it makes sense to route a business's outbound shipping. So Shyp filled up with infrequent, low-value, single-item shippers, which is about the most expensive customer per pickup you could possibly design for: a driver, a time window, packing materials, and human labor, all spent on one item worth less than the cost of collecting it. In May 2016 the company [swapped the flat fee for variable packaging-based pricing](https://techcrunch.com/2016/05/02/shyp-rolls-out-its-new-packaging-pricing-model-to-all-customers/) and started chasing business accounts. Too late. The entire operation had been built around the cohort the old price had selected. Shyp [shut down on 27 March 2018](https://techcrunch.com/2018/03/27/on-demand-shipping-startup-shyp-is-shutting-down/) having raised $62.1 million.

A first price set in a vacuum isn't a revenue decision. It's a casting decision, and the people it casts will write your roadmap for the next three years whether you invited them to or not.

## Can't you just raise prices later?

This is the standard defense and I used to believe it. It's wrong in a specific, measured way: raising the number later doesn't move the anchor, because the anchor was never something your customers were holding loosely.

Dan Ariely, George Loewenstein and Drazen Prelec showed this in ["Coherent Arbitrariness," Quarterly Journal of Economics, 2003](https://academic.oup.com/qje/article-abstract/118/1/73/1917051). Across six experiments, they found that people's valuations of ordinary goods were shaped by arbitrary anchors, in one case the digits of the participant's own social security number. The interesting finding for anyone selling software isn't that anchoring happens. It's the four properties they document: the effect can't be explained as a rational response to information, it doesn't fade with experience of the good, market forces don't reliably correct it, and it isn't limited to cash prices. After the anchor lands, people price coherently against it more or less forever, producing demand curves that look stable and rational while sitting on top of a number somebody invented.

Which means your first price isn't an opening offer. It's the origin of the coordinate system your market will use to evaluate you, your future competitors, and the category you just made up. Exposure to your product makes that stickier, not looser.

The counterargument has a real factual half and deserves credit for it: good companies change price constantly. The PricingSaaS 500 Index counted [more than 1,800 pricing and packaging changes across 500 leading B2B and AI companies during 2025](https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes), about 3.6 changes per company per year. But look at what that's describing. Those are companies running continuous price discovery from a position where they already know the shape of their willingness-to-pay distribution. It isn't evidence you can defer the question for two years and fix it later. If anything it's evidence of the opposite. The operators who win are running price as instrumentation from the beginning, not as a rescue at the end.

## Is it bad to launch a SaaS product with a low price?

Usually, yes, though not because of margin. Margin is the obvious cost and also the recoverable one. The expensive part is that your cheapest customers quietly become your product research, and three years of roadmap goes to people who were never going to fund the company.

The chain is boringly mechanical. A low price selects for price-sensitive users. Price-sensitive users generate the most support volume per dollar and the loudest feature requests. Loud requests are the most legible signal anywhere in the building, so they win the roadmap by default, because nothing else in the room is shouting. Eighteen months later you have a product that is genuinely excellent at serving a segment with structurally low willingness to pay, and that has no audit logs, no SSO, no real permissions model, and none of the procurement surface the segment with budget requires. Moving upmarket now means a two-year rebuild, and your runway was sized on the assumption that revenue would be compounding by then.

Then capital does the thing capital does. CB Insights' running analysis of [431 VC-backed companies that have shut down since 2023](https://www.cbinsights.com/research/report/startup-failure-reasons-top/) puts 19% down to unsustainable unit economics and 70% to running out of capital, with a median of 22 months between the last raise and the lights going off. "Ran out of capital" is hardly ever a cause. It's a timestamp on something decided years earlier, often by somebody who gave it an afternoon at most.

There's a layer past even that, and it's the one that bothers me. Play Bigger's 2016 research found that category kings capture roughly [76% of the total market capitalization of the categories they create](https://www.playbigger.com/media/category-contenders). If you invented the category, that 76% is nominally yours. But how big it is depends on the reference price you set, because every competitor who follows will price against your anchor and the analysts will size the market off the resulting revenue. Price low enough and you don't just give up margin. You shrink the category you were about to own, and then you win most of a market you personally made small. Which is a strange way to lose.

## Why do early SaaS pricing mistakes become permanent?

Because the number stops being treated as a guess. Picking it isn't the mistake; letting it harden is.

Docker's $0 and Shyp's $5 were both perfectly defensible on day one. They were guesses made under real uncertainty, which is the only condition a category creator ever gets to guess under. Neither was a firing offense, and I'd probably have picked something similar in both rooms. What was fatal is that both numbers hardened into infrastructure: into ops models, cost structures, customer bases, and market expectations, while carrying exactly as much evidence behind them as they had on the afternoon someone invented them.

Having no competitors doesn't make pricing hard. It removes the thing that normally forces you to look at it again. When a rival cuts price, you re-examine yours, whether you want to or not. When there's no rival, nothing ever asks the question a second time, and an arbitrary number gets to sit there accumulating the authority of a fact.

## When should a startup revisit its first price?

At a trigger you commit to before launch, such as your 100th paying customer, not whenever something starts breaking. One artifact, written down before launch: *this number is a guess, it holds until we have 100 paying customers, and on that date we re-derive it from what those customers were doing instead.*

That's it, and it defeats most of the chain. It keeps the number labeled as a hypothesis, so it can't quietly become load-bearing. It schedules the re-examination that no competitor is ever going to schedule for you. And it lands before the anchor sets, while changing the price is still a correction rather than the betrayal Docker discovered it turns into seven years in.

Docker would still have given the runtime away, and should have. But with an expiry date attached to "free," the question of where the category's money actually lives gets asked in 2015, by Docker, instead of being answered in 2019 by Kubernetes. The difference isn't a smarter guess. It's a guess with a death date on it, which is the only kind I'd trust myself to make.