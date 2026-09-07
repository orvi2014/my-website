---
title: "The Endowment Effect: Why Users Never Delete Software They Do Not Use"
description: "The endowment effect keeps software users paying for tools they never open. Field notes on what that dormant retention actually costs the people who build it."
pubDate: 2026-09-07
category: "psychology"
author: "Orvi"
readingTime: 9
tags: ["endowment effect", "behavioral economics", "product psychology", "user retention", "saas", "loss aversion", "software adoption", "churn"]
featured: false
---

Most of your retention number is people who forgot your product exists and haven't gotten around to admitting it.

I've been staring at usage tables long enough to stop finding that funny. The endowment effect isn't a curiosity you pick up from a behavioral economics book and deploy as a growth tactic. It's the widest gap between your dashboard and reality, and the awkward part is that it pays you. Revenue goes up. Every decision you make downstream of that revenue gets worse.

For years I had this backwards. Everyone treats deletion as the risky act and keeping as the safe one. The user who cancels might regret it. The team that sunsets a feature might get flamed on Twitter. So nobody deletes, and the cost of not deleting never lands on a chart with a name on it.

## Why don't users delete software they never open?

Because deleting it means admitting the purchase was a mistake, and keeping it costs nothing that feels like a cost. Ownership inflates value on its own, whether or not you use the thing.

The canonical demonstration is [Kahneman, Knetsch and Thaler's 1990 mug experiment](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Behavioral_Decision_Theory/Kahneman_et_al_1990_Experimental_tests.pdf) in the *Journal of Political Economy*. Students handed a $6 coffee mug demanded more than double what students without one would pay for the same object. The endowment was minutes old. No sentimental history, no data trapped inside the mug. Ownership alone did it.

Software is the mug with a login screen and eleven months of your notes inside it.

The consumer version you can verify on your own phone. The average smartphone carries around 80 installed apps and opens roughly 30 in a given month, and [surveys of uninstall behavior](https://buildfire.com/app-statistics/) find only about 39% of people remove an app when they stop using it. The other 61% aren't making a decision. They're declining to make one, which is a different thing with an identical bank statement.

Enterprise is less charming. [Zylo's SaaS Management Index](https://zylo.com/news/zylos-saas-management-index-reveals-organizations-only-utilize-60-of-saas-licenses-leaving-40-unused/) puts license utilization at roughly 60%, so four in ten paid seats are dark. [Nexthink's 2023 study](https://nexthink.com/press/half-of-software-licenses-goes-unused-by-employees-wasting-businesses-billions) found nearly half of installed software and licensed SaaS went untouched by employees, worth about $44.7 million per month across just 30-odd popular tools.

The part that gets left out of the think-pieces: those seats don't sit still. They renew. Somebody signs the invoice every year for a login nobody has used since the last invoice.

## Is the endowment effect real, or a lab artifact?

It's been attacked seriously and it survived. The strongest challenge showed the gap can be suppressed under specific conditions, not that it isn't there.

I want to give the counterargument its due, because I believed it for a while. In 2005, [Charles Plott and Kathryn Zeiler published a paper in the *American Economic Review*](https://www.aeaweb.org/articles?id=10.1257%2F0002828054201387) arguing the willingness-to-pay/willingness-to-accept gap was an artifact of subjects misunderstanding the elicitation procedure. Train them properly, run practice rounds, and the gap for mugs disappears. People cited it like the whole edifice had come down.

It didn't hold. A [2015 replication attempt by Fehr, Hakimov and Kübler](https://ideas.repec.org/p/zbw/wzbmbh/spii2015204.html) at WZB failed to reproduce the null. Plott and Zeiler's own unpublished lottery data from that same study showed a persistent disparity under identical procedures. And the field evidence never needed the lab in the first place.

[Carmon and Ariely's 2000 study](https://people.duke.edu/~dandan/webfiles/PapersPI/Value%20Buyer%20and%20Seller.pdf) in the *Journal of Consumer Research* used a real Duke basketball ticket lottery, real students, real money. Losers said they'd pay about $170 for a ticket. Winners said they'd sell theirs for about $2,400. Fourteen times. In a market where everyone understood the procedure perfectly, because everyone had been camping in tents for weeks to be in it.

[Morewedge and Giblin's 2015 review](https://pubmed.ncbi.nlm.nih.gov/25939336/) in *Trends in Cognitive Sciences* is what settled it for me. They argue the driver is cognitive framing and biased memory retrieval rather than raw loss aversion. The mechanism moved. The phenomenon stayed exactly where it was. We were wrong about why, not whether.

## What does this actually cost a software company?

It costs you the ability to know what your product is. Every unused-but-retained account is a data point that lies in the same direction every time.

The safe move — leave the feature in, leave the seat active, count the dormant account as retained — has a bill. Here's roughly what's on it.

[Pendo's 2019 Feature Adoption Report](https://go.pendo.io/rs/185-LQW-370/images/2019%20Feature%20Adoption%20Report%20Digital.pdf) analyzed 615 subscriptions and found 80% of features in the average product are rarely or never used, with an estimated $29.5 billion in annual R&D spend by public cloud companies going toward features that may never be touched. That gets quoted as a waste statistic, which undersells it. Waste is a one-time charge. Each of those features is a standing liability: regression-tested every release, patched every CVE, migrated during every schema change, and rendered in every screenshot a new user squints at while trying to work out what your product does.

Then there's the pattern I only saw after a few renewal cycles. Cancellations don't cluster around the day usage stops. They cluster within a few days of the renewal date, often months after the last meaningful session. The user stopped getting value in March and stopped paying in October, and October only happened because a credit card charge forced a decision they were never going to make on their own.

I've watched dormant accounts hit the password reset flow and abandon it. They came back to cancel, couldn't log in, gave up. The subscription survived because leaving was more annoying than staying. That counts as retention. It isn't any.

People don't keep software because it's valuable. They keep it because deleting it means conceding that buying it was a mistake.

## Why do experienced teams still get this wrong?

Because the bias runs on both sides of the transaction and the two sides multiply. Builders overvalue what they made by roughly the same factor users overvalue what they already have.

John Gourville named this in [*Harvard Business Review* in June 2006](https://hbr.org/2006/06/eager-sellers-and-stony-buyers-understanding-the-psychology-of-new-product-adoption). Sellers overvalue their innovation by about 3x. Buyers overvalue their incumbent by about 3x. Multiply and you get the 9x effect: a nine-to-one mismatch between what the builder thinks the thing is worth and what the buyer does.

Experience doesn't immunize you. It arguably makes it worse, since experienced teams have more built things to be endowed with. Add the [IKEA effect](https://www.sciencedirect.com/science/article/abs/pii/S1057740811000829) — Norton, Mochon and Ariely showed in 2012 that people value what they assembled themselves as highly as expert work, and assume everyone else will too — and you have a room full of people who can't see their own product.

The tell is the deprecation email. Announce that you're removing a feature, collect the complaints, then cross-reference the complainers against the event log. A meaningful share of them haven't fired that event in six months. They're not defending a workflow. They're defending an option they own.

The second tell is enterprise seat reclamation. IT knows precisely which 40% of licenses are dark. They renew anyway, because one loud person losing access costs more than the license does in the only currency that matters to the person signing. The safe choice again, priced in something other than money.

## How long before a user can't leave?

Longer than onboarding, and it has almost nothing to do with your features. It has to do with accumulated configuration.

[Strahilevitz and Loewenstein showed in 1998](https://academic.oup.com/jcr/article-abstract/25/3/276/1795651), in the *Journal of Consumer Research*, that valuation of a possessed object rises with how long you've possessed it. Adaptation to ownership starts immediately and finishes slowly.

In software the clock isn't calendar time, it's configuration time. The saved views. The custom fields nobody remembers creating. The one integration that took an afternoon and a support ticket. The archive of things marked "come back to this."

Samuelson and Zeckhauser called the general pattern status quo bias in [*Journal of Risk and Uncertainty* volume 1 in 1988](https://scholar.harvard.edu/files/rzeckhauser/files/status_quo_bias_in_decision_making.pdf), finding that people disproportionately stick with the default across health plans and retirement elections. Decisions worth far more than a $40/month subscription. If people won't re-optimize their pension, they're not going to re-optimize their note-taking app.

So your moat isn't the feature set. It's how much a user would have to admit about the past year to leave. That's not a compliment to your product. It's a description of a trap that happens to be holding your ARR.

## Should you remove features users say they want?

Yes, when the event log contradicts the survey. Stated preference from an endowed user measures ownership, not use.

The rule I've landed on: never let a feature's survival be decided by people who possess it. Ask non-users what they'd pay to gain it. That's a WTP question, and the 1990 mug data says it comes back at roughly half of what possessors demand, sometimes far less. Enormous gap plus near-zero usage means you're looking at pure endowment, and you can cut.

I don't say that comfortably. I've cut things people were fond of, and I was wrong about at least one of them. But the alternative is a product that only ever accumulates, maintained by a team reading the absence of complaints as the presence of value.

Here's a prediction I wouldn't have made three years ago.

The endowment effect has always needed a human to be the one who fails to cancel. That's ending. Agents with read access to spend and usage data will run the audit nobody wants to run, and they won't feel the loss, because they never owned anything. Within about eighteen months some mid-market SaaS company is going to lose a double-digit percentage of ARR in a single quarter, and the cause will be a batch of automated subscription audits terminating seats that had been dark for a year and renewing on autopilot. No competitor involved. No bad release.

I might be wrong about the eighteen months. I don't think I'm wrong about the direction. Whoever comes through it will be whoever already knew which of their users were real, and almost nobody knows, because that number has been a very comfortable one not to look at.