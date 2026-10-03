---
title: "Does Social Proof Actually Work? What 8.57 Million Households Show"
description: "Social proof works, but not the way product teams think. Opower's trials across 8.57M households averaged 1–2%, and for some users the effect ran backwards."
pubDate: 2026-10-02
category: "psychology"
author: "Orvi"
readingTime: 8
tags: ["social proof", "behavioral psychology", "product design", "social norms", "Opower", "nudges", "conversion", "behavioral economics"]
featured: false
---

For years I thought of social proof as a multiplier. Show people what everyone else is doing and more of them will do it. Then I read one number from a 2007 study and had to give the idea up.

Researchers in San Marcos, California told 290 households how their electricity use compared with the neighborhood average. The households already using less than average responded by using more. Their consumption went from 10.38 to 11.27 kWh a day, up 8.6%.

You will not find that result in most of the social proof guides product teams read. Which is odd, because it is the result that built a company. Opower was founded the same year, turned the San Marcos door hanger into a product, mailed it to millions of homes, and sold to Oracle in 2016 for $532 million. Its trials are the largest body of evidence on social proof anyone has assembled, and they contradict the standard advice.

## What is social proof in product psychology?

Social proof is a comparison between you and a reference group. We tend to treat it as an endorsement, a crowd vouching for something. What it actually does is tell people where the norm sits, and they move toward it from whichever side they started on.

The San Marcos study shows both directions. It was published in *Psychological Science* in 2007 by Wesley Schultz, Jessica Nolan, Robert Cialdini, Noah Goldstein and Vladas Griskevicius ([Schultz et al., 2007](https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/schultz_et_al._2007_-_power_of_social_norms.pdf)). The researchers read meters, then hung handwritten notes on doors giving each household's daily use next to the neighborhood average.

Households above the average cut consumption by 1.22 kWh a day, from 21.47 to 20.25. Households below it raised theirs by 0.89 kWh a day. Everyone got the same note, and the two groups moved in opposite directions, both toward the middle.

The authors called the second result a boomerang effect, which makes it sound like a malfunction. I think that name has done some damage. Nothing broke. The mechanism that produced the savings also produced the increase, because half the recipients were standing on the other side of the norm.

Opower's founders, Dan Yates and Alex Laskey, built on this research. Their Home Energy Report was a letter from your utility with a bar chart of your usage against similar homes nearby. The first large pilot began in spring 2008 at the Sacramento Municipal Utility District, with 35,000 households receiving reports ([Ayres, Raseman and Shih, 2009](https://www.nber.org/papers/w15386)). By the time Oracle bought it, Opower's platform covered 60 million utility customers across more than 100 utilities ([SEC filing, May 2, 2016](https://www.sec.gov/Archives/edgar/data/0001412043/000119312516571455/d180345dex991.htm)).

## How much does social proof actually change behavior?

About 2% in the best-measured case, and less at scale. Across Opower's first randomized experiments, covering 600,000 households, the average reduction in energy use was 2.0%.

That figure comes from Hunt Allcott's 2011 evaluation in the *Journal of Public Economics* ([Allcott, 2011](https://econpapers.repec.org/RePEc:eee:pubeco:v:95:y:2011:i:9-10:p:1082-1095)). These were randomized controlled trials read off real meters, with no self-reporting anywhere in the chain. I don't know of a cleaner measurement of social proof.

Compare that with the marketing blogs, where the lift from social proof is 15%, or 34%, or 270%. Those numbers come from single A/B tests on self-selected traffic, reported by the people selling the widget. When the outcome is a utility meter and the assignment is random, you get 2.0%.

Even that average hides most of the story. Allcott split households by how much electricity they used before the reports began. The top decile cut consumption by 6.3%. The bottom decile cut it by 0.3%.

That is a 21-fold difference in response to the same letter. It worked on the heaviest users and did close to nothing for the lightest.

## Can social proof backfire?

Yes. San Marcos is one documented case. There is a second, and it is stranger: the same report lowered consumption in some households and raised it in others, depending on their politics.

Dora Costa and Matthew Kahn analyzed a home energy report experiment at a California utility and matched the households to voter registration and donation records. Their paper appeared in the *Journal of the European Economic Association* in 2013 ([Costa and Kahn, 2013](https://ideas.repec.org/p/nbr/nberwo/15939.html)). The report was two to four times more effective with political liberals than with conservatives.

At the extremes the sign flipped. A registered Democrat who bought renewable power, donated to environmental groups and lived in a liberal neighborhood cut consumption by 3%. A registered Republican who did neither raised consumption by 1%.

Most product teams I've seen treat social proof as something you add more of. The Costa and Kahn data says the dose matters less than the reader. Whether the report helped or hurt depended on two things: did this person accept the neighbors as a reference group, and did they think the behavior was worth copying? Readers who rejected either one moved away from the norm.

## Why does social proof work on some users and not others?

It depends on how far a person sits from the norm, and on which side. People far above it move a lot. People near it barely move. People already past it can drift back.

That explains the gap between the 6.3% and 0.3% deciles. A household burning twice the neighborhood average learns it is an outlier. A household already below average learns it has room to relax.

The Schultz team tested a fix, and it is almost embarrassingly simple. They drew a smiley face on the door hangers of below-average households. The boomerang disappeared: those households went from 10.34 to 10.58 kWh a day, a change that was not statistically significant. Opower took the idea and labelled efficient homes "Great" on their reports.

The smiley stopped the backsliding, and that is all it did. Light users did not become savers. In Allcott's data the bottom decile still cut only 0.3%, and his regression discontinuity analysis found that the approval categories themselves had no significant effect on usage. The label prevents harm. The savings still come almost entirely from the heavy users.

This maps onto product work without much translation. "10,000 teams use this feature" moves the user who has never touched it and does little for the average one. And a power user sending 40 reports a month who reads "the typical team sends 12" has just been told, with evidence, that 12 is enough.

## Is a 2% effect too small to matter?

No. The 2% lasted, cost almost nothing to deliver, and matched what a large price increase would have achieved.

This is the strongest objection to my reading of Opower, so I want to take it seriously. If social proof moves behavior by 2%, maybe the honest conclusion is that it barely works and product teams should stop caring. Three findings say otherwise.

First, Allcott calculated that the reports reduced consumption as much as a short-run electricity price increase of 11% to 20%. No utility gets to raise prices that much on its own say-so. Any utility can send a letter.

Second, the effect persisted. Hunt Allcott and Todd Rogers tracked households whose reports stopped after two years, and reported in the *American Economic Review* in 2014 that the savings decayed at only 10% to 20% a year ([Allcott and Rogers, 2014](https://www.aeaweb.org/articles?id=10.1257/aer.104.10.3003)). Households that kept getting reports kept responding after two years. By then the program reached more than six million households.

Third, Oracle paid $532 million for the company.

So the effect is real. Where the objection goes wrong is on size and shape. Social proof produces a small, durable shift concentrated in the users farthest from the norm. A team expecting a multiplier will look at a 2% result, call the test a failure, and throw away a feature that worked.

## Why don't users notice social proof working on them?

Because they can't see it. The same research group found that the people most influenced by a norm message rated it the least motivating.

Jessica Nolan and colleagues published this in *Personality and Social Psychology Bulletin* in 2008 ([Nolan et al., 2008](https://journals.sagepub.com/doi/10.1177/0146167208316691)). They surveyed 810 Californians about why they conserved energy. Respondents ranked "other people are doing it" last, behind saving money, protecting the environment and benefiting society. Yet their beliefs about what the neighbors did predicted their actual conservation better than any other belief.

A follow-up field experiment compared four door-hanger messages. The norm message produced the largest drop in consumption, and the people who received it rated it the least motivating of the four.

I find this the most uncomfortable result in the whole literature, because it breaks the tools we normally use. User interviews will tell you social proof doesn't matter. Surveys will rank it last. A team that builds from stated preferences will cut the one element that changes behavior. A team that trusts testimonials about testimonials is making the same mistake from the other side. For this effect, the only evidence worth having is what people actually did.

## What happens to social proof when a product scales?

The effect shrinks. Opower's first ten sites averaged a 1.67% reduction. The next 101 averaged 1.26%.

Allcott documented this in the *Quarterly Journal of Economics* in 2015, using all 111 Opower trials that began before February 2013 ([Allcott, 2015](https://www.povertyactionlab.org/sites/default/files/research-paper/Allcott_SiteSelectionBias.pdf)). The trials covered 8.57 million households, about one in every 12 in the United States. The mean effect across all sites was 1.31%.

Predictions built on the first ten sites overstated later results by 0.41 to 0.66 percentage points. That sounds like a rounding error until you scale it nationally, where it comes to $560 million to $920 million in first-year savings that never appeared.

Allcott identified two causes, and both follow from the mechanism above. The early utilities were in more environmentalist areas, where customers accepted the comparison. The early programs also targeted high-usage households, the ones farthest above the norm. As the product expanded, it reached people closer to the average and people who rejected the reference group, and it did less for both.

Every product that shows a usage count, a peer benchmark or a "most popular" badge has the same structure. The first test runs on the most receptive segment. The rollout reaches everyone else.

So here is my prediction. By December 31, 2027, any randomized test of a peer-comparison feature that covers more than 100,000 users and reports results by segment will show an average lift under 2%. The decile farthest from the norm will respond at least ten times as strongly as the decile nearest it. And at least one identifiable segment will move the wrong way.

One published trial of that size with a uniform lift across deciles would prove me wrong. I'd like to read it. Until it turns up, I'm going with the 8.57 million households.