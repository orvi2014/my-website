---
title: "Cognitive Load in Product Design: What the Research Actually Says vs What UX Gurus Claim"
description: "What the research on cognitive load actually says about the 7±2 rule, the jam study and the three-click rule, and why design keeps citing all three wrong."
pubDate: 2026-09-09
category: "psychology"
author: "Orvi"
readingTime: 9
tags: ["cognitive load", "ux design", "psychology", "design research", "product design", "replication crisis", "usability", "decision making"]
featured: false
---

The slide had three words on it: **Reduce cognitive load.** Under them, a before-and-after. Before: a settings screen with nine options. After: four options and a "More" link. Someone asked how we knew nine was too many. The designer said "Miller's Law, seven plus or minus two." The room nodded. We shipped it. Every guide to cognitive load in UX I've read since says roughly the same thing, with the same citation, in the same confident voice.

Support tickets went up. Not dramatically. Just enough that six weeks later somebody quietly moved two options back out of the drawer, and nobody wrote a retro about it.

I went looking for the paper afterwards, mostly out of embarrassment. It doesn't say what the slide said it said. The second-most-cited study in this genre has an average effect size of about zero. And the man who invented cognitive load theory deleted a third of his own model in 2019 while the design industry carried on teaching all three parts. So this isn't an essay about designers being wrong. What I'm actually curious about is the machinery: what kind of system puts a room full of competent people in the position of confidently citing a 1956 paper none of them have read.

## What actually happened with Snapchat's 2018 redesign?

Snap rebuilt the app to split social messages from media content, explicitly to make it simpler and better labelled, and lost three million daily users. As far as I can tell it's the largest publicly documented failure of a load-reduction argument. What makes it worth sitting with is that the argument was partly right.

The numbers are on the record. Daily actives fell from 191 million in Q1 2018 to 188 million in Q2, [Snap's first-ever decline](https://techcrunch.com/2018/08/07/snapchat-earnings-q2-2018/). More than a million people signed a Change.org petition demanding a rollback. Evan Spiegel blamed "disruption caused by our redesign."

Buried in the same earnings call is the finding that matters: retention among users over 35 rose 8 percent. The redesign worked. It worked on the people who hadn't already learned the old interface.

That's not a paradox and it isn't a fluke. It's the most replicated finding in the actual literature on cognitive load, and almost nobody in product design has heard of it.

## Does cognitive load theory actually apply to interface design?

Partly, and in a direction most of us have backwards. The theory was built for teaching novices unfamiliar material, and one of its core predictions is that load-reducing techniques reverse and start doing harm once the learner knows the domain.

John Sweller developed it in the late 1980s for instructional design. The classic result is the worked-example effect: hand a beginner a solved problem instead of a blank one and they learn faster. Then Kalyuga, Ayres, Chandler and Sweller published [the expertise reversal effect](https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4) in *Educational Psychologist* in 2003, showing that the same worked examples that help beginners actively hurt experienced learners. Scaffolding that lowers a novice's load turns into redundant material an expert has to read and then discard.

Apply that to Snap. For the sixteen-year-old who'd opened the app every day for three years, the old layout wasn't load. It was a schema. Replacing it didn't reduce anything; it invalidated a stored structure and made her learn the thing over again. For the forty-two-year-old who opened it twice a month there was no schema to invalidate, so the clearer labels helped. Both outcomes are what cognitive load theory predicts. The theory held up fine. The slogan people took from it, "reduce cognitive load," doesn't work as a design rule, because it never says whose.

There's a second problem, and it's more awkward. In [Cognitive Architecture and Instructional Design: 20 Years Later](https://link.springer.com/article/10.1007/s10648-019-09465-5) (2019), Sweller, van Merriënboer and Paas recast germane cognitive load as working-memory resources devoted to handling intrinsic load, which leaves two basic categories rather than three. The people who built the model collapsed it themselves. Search "intrinsic extraneous germane UX" today and you'll get hundreds of articles, plenty of them written well after 2019, teaching the retired version as settled science.

## Is Miller's Law (7±2) real?

Miller's 1956 finding is real. Its application to menus, navigation and option lists never had an empirical basis, and Miller said so himself.

Read [the original paper](https://psychclassics.yorku.ca/Miller/). It opens: "My problem is that I have been persecuted by an integer." He was measuring two things: how many levels people can discriminate along a single dimension like pitch or brightness, and immediate serial recall of unrelated items. He later stated flatly that neither "has anything to do with a person's capacity to comprehend printed text."

The mismatch isn't subtle. Miller's subjects were recalling unidimensional stimuli with nothing in front of them. A navigation menu is a recognition task with every option sitting right there on the screen. Nobody has validated 7±2 as an interface constraint, and it's hard to see what the validation would even look like.

The number was wrong too. Nelson Cowan's [reconsideration of mental storage capacity](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/44023F1147D4A1D44BDC0AD226838496/S0140525X01003922a.pdf/the-magical-number-4-in-short-term-memory-a-reconsideration-of-mental-storage-capacity.pdf) (*Behavioral and Brain Sciences*, 2001) puts the real limit at three to five chunks. Denny LeCompte's 1999 HFES paper is titled, with no ambiguity whatsoever, ["Seven, Plus or Minus Two, is too much to Bear: Three (or Fewer) is the Real Magic Number"](https://journals.sagepub.com/doi/10.1177/154193129904300334). Edward Tufte's verdict on the design reading is that it "can be sustained only by not reading the paper."

So the rule cited in my design review had the wrong number, taken from the wrong task, describing a cognitive process the interface wasn't using. Otherwise it was perfect.

## Do fewer options actually increase conversions?

On average, no. The choice-overload effect that underwrites this whole branch of UX advice doesn't survive meta-analysis.

The founding study is Iyengar and Lepper (2000), the jam experiment: a supermarket display of 24 jams drew more browsers, while a display of 6 produced roughly ten times the purchases. I've seen it in more product decks than I can count, usually alongside a stock photo of jam.

In 2010, Scheibehenne, Greifeneder and Todd published [Can There Ever Be Too Many Options?](https://academic.oup.com/jcr/article-abstract/37/3/409/1827647) in the *Journal of Consumer Research*: 63 conditions drawn from 50 published and unpublished experiments, N = 5,036, mean effect size d = 0.02. Statistically indistinguishable from zero. They had run ten experiments of their own first and couldn't produce the effect at all. Variance between studies was enormous, which does mean the effect is real somewhere, under some conditions. Nobody has managed to specify which ones. Until somebody does, the paradox of choice is a contested finding with unidentified moderators rather than a principle you can design against.

The click-count version didn't hold either. Joshua Porter's [Testing the Three-Click Rule](https://articles.centercentre.com/three_click_rule/) (User Interface Engineering, 2003) looked at 44 users across 620 tasks and roughly 8,000 clicks. Users didn't abandon at three. Some went past 25. The result that should have settled it: successful clickstreams and unsuccessful ones had the same length distribution. Click count carried no signal at all about whether the task succeeded. Twenty-three years later the three-click rule is still in circulation, still stated as a rule.

## Why do UX best practices keep turning out to be wrong?

Because the incentives reward legibility over accuracy, and nothing connects a heuristic back to the outcome it produced. It's a citation supply chain in which research travels one direction and evidence never travels back.

Trace it from the bottom. A designer in a review has to justify a judgement to a product manager and an engineer who outrank them on the org chart and have no vocabulary for taste. "Nine feels like too many" loses that argument every time. "Miller's Law" wins it. The citation isn't functioning as evidence there; it's functioning as authority, and its job is finished the second the room stops arguing. Nobody checks afterwards, because nothing downstream depends on whether it was true.

Now look at who supplies the rules. Conference talks, design-school curricula and the enormous middle layer of UX content are all rewarded for producing things that are memorable and teachable. "Cognitive load depends on prior knowledge, element interactivity and task type, and the direction of the effect reverses with expertise" is accurate and useless in a twenty-minute keynote. "Miller's Law" fits on a slide. Compression is the entire selection pressure, and compression is exactly what strips out the moderators, the populations and the error bars that made the finding true in the first place.

Then the packaging does its own damage. Publish a contested empirical claim under the heading **Laws of UX** and the word "law" performs work no researcher licensed. Sweller quietly deprecated germane load in a journal article in 2019, and nothing carried that back down the chain, because there is no path back down. A textbook has errata. A design heuristic in circulation doesn't.

The measurement gap closes the loop. NASA-TLX has existed since 1988. It measures perceived workload across six dimensions and takes about two minutes. Almost no product team runs it. We instrument our interfaces for clicks, funnels and retention, then spend an hour arguing about a construct we've decided not to measure. Compare Baymard's benchmark work: the average US checkout shows [23.48 form elements by default](https://baymard.com/blog/ecommerce-checkout-usability-report-and-benchmark) against an achievable 12, with abandonment sitting at 70.19 percent. You can act on that. It's what the field produces when it counts things instead of citing them.

The obvious objection to all of this is that Snap failed because of habit disruption, not because load reduction is wrong. Fair enough. But habit disruption is the expertise reversal effect wearing a different hat, it was documented in 2003, and it means the principle as practitioners state it has no stable sign. Whether simplifying an interface helps or hurts depends on who is looking at it. Something that can point either way isn't a rule; it's a question you still have to go and answer.

## What would have changed the outcome?

One thing. Snap already had the number that predicted the failure, the 8 percent retention lift among the over-35s, and it arrived after the rollout instead of before it. Splitting the release by account tenure rather than by geography would have surfaced the trade in a week, on a small slice of the base, for essentially nothing.

The version of that available to the rest of us is smaller and considerably more annoying to perform. When someone in a design review cites a load principle, ask which population it was measured on and how the load was measured. If neither answer exists, the citation is doing political work rather than empirical work, at which point you may as well say "nine feels like too many, let's test it," which is what everyone in the room meant anyway.