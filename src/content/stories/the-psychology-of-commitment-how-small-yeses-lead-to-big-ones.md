---
title: "Commitment and Consistency: Why Small Yeses Lead to Big Ones — And When They Backfire"
description: "I spent years treating commitment and consistency as a Cialdini sales trick. Here's the study that proved I had the mechanism backwards — and where it curdles into sunk cost."
pubDate: 2026-07-06
category: "psychology"
author: "Orvi"
readingTime: 9
tags: ["psychology", "cialdini", "commitment and consistency", "sunk cost fallacy", "foot in the door", "behavioral design", "persuasion", "product growth", "dark patterns", "consumer psychology", "onboarding"]
featured: false
---

I was in a glass-walled conference room in Austin, watching a growth lead I'll call Priya scroll through a chart she was visibly proud of. She'd added one checkbox to a trial signup flow: "I'm committing to actually try this for 14 days." Nothing else changed. Trial-to-paid conversion jumped 22% in three weeks. She'd read Cialdini, she'd found the lever, and the lever worked. I remember nodding along, because I believed the same thing she did: that commitment and consistency was a Cialdini product trick, a switch you flip on customers to make them say yes twice instead of once.

Three weeks later the refund requests started, and the cancellation surveys had a phrase in them that Priya's chart hadn't accounted for: "felt tricked." Same checkbox, same 22% lift, a second dataset nobody had put on a slide.

I misread the entire mechanism for years, and I want to walk through exactly how, because the correction changes what you should build.

## What Is Commitment and Consistency in Psychology?

Commitment and consistency is the tendency to treat your own past behavior as evidence for who you are, and then act to stay consistent with that evidence. It's a self-perception mechanism, not a sales trick — and treating it as a trick is precisely what makes it stop working.

The principle, as Robert Cialdini described it in *Influence* (1984), rests on a much older and less exploitable finding: people use their own past behavior as evidence for who they are, and then act to stay consistent with that evidence — not because someone is manipulating them, but because inconsistency is psychologically expensive. The foundational study here is Freedman and Fraser's 1966 "foot-in-the-door" experiment, published in the *Journal of Personality and Social Psychology*. Researchers approached California homeowners with a tiny request — sign a petition or display a small "keep California beautiful" sign. Weeks later, a different researcher asked those same homeowners to allow a large, ugly "Drive Carefully" billboard in their front yard. Homeowners who'd made the small commitment agreed to the billboard at roughly 76%. Homeowners approached cold agreed at about 17% ([Freedman & Fraser, 1966](https://doi.org/10.1037/h0023552)). That's not a marketing hack. That's a homeowner privately updating their self-concept to "the kind of person who cares about this issue," then acting on that updated identity a month later, with no salesperson in the room.

Here's the part I missed: the mechanism runs on the person's *own* inference from their *own* freely chosen action. It is not a dial businesses turn. It's closer to a chemical reaction that only completes under specific conditions — genuine choice, visible to the person themselves — and most of the "commitment consistency" tactics I built in product were trying to skip the chemistry and keep the yield.

## Does the Commitment and Consistency Bias Only Work on Gullible People?

No — it works on everyone, which is a less comforting answer than it sounds. Intelligence and skepticism don't screen it out, because the bias is structural rather than a character flaw.

The bias isn't something you can reason your way out of by being well-read; it's structural, because humans genuinely need a stable self-concept to function, and the fastest available evidence for "who am I" is "what did I just do." Cialdini, Cacioppo, Bassett, and Miller ran a study in 1978 that makes this uncomfortable point sharply. Psychology students were asked to participate in a study and told the time only after they'd agreed to take part — a technique now called "low-balling." Some were told upfront it would be at 7 a.m.; only 24% agreed to show up. Others agreed to the study first and were told about the 7 a.m. slot afterward — 53% still showed up, more than double, despite knowing the actual cost before the appointment ([Cialdini et al., 1978](https://doi.org/10.1037/0022-3514.36.5.463)). Sleep deprivation didn't care whether the subjects were "smart." Their prior commitment did the deciding for them.

That's the quotable part: consistency pressure doesn't ask whether the deal changed for the worse — it asks whether you already said yes. This is also, not coincidentally, the exact mechanic behind every SaaS "special launch price" that becomes the real price at checkout, and every gym contract that gets the add-on membership fee mentioned after the handshake. I used to admire the low-ball as clever sequencing. It's the same experiment, just run on people who didn't sign up for a psych study — they signed up for a product.

## Why Do Free Trials Still Churn If Small Commitments Compound?

Because most "small commitment" product design never produces a real commitment — it produces a click, and clicks don't have a self attached to them.

The scale of the gap is worth stating plainly: OpenView's 2022 Product Benchmarks report, drawn from several hundred product-led companies, put median free-to-paid conversion at roughly 17% for free trials and around 5% for freemium ([OpenView, 2022](https://openviewpartners.com/2022-product-benchmarks/)) — meaning four out of five trial signups walk, in a decade where nearly every onboarding flow has a commitment step bolted onto it somewhere.

The commitment-consistency effect requires three things the average onboarding flow skips: the action has to be freely chosen, it has to be effortful enough to notice, and it has to be publicly or privately attributable to the person's own identity. A progress bar ticking to 40% is none of those things — it's decoration. Compare that to Greenwald, Carnot, Beach, and Young's 1987 voting study in the *Journal of Applied Psychology*: the day before an election, researchers simply asked one group of voters to predict whether they would vote. No pledge, no signature, no public statement — just a question that forced a private self-prediction. Voter turnout in that group hit roughly 86%, against roughly 61% in a control group who weren't asked ([Greenwald et al., 1987](https://doi.org/10.1037/0021-9010.72.2.315)). One sentence, spoken by the subject about themselves, moved behavior by 25 points. A checkbox that says "I commit to trying this" — written by a product manager, clicked reflexively to get past a paywall — moves nothing, because the subject never generated the commitment. They rubber-stamped someone else's sentence.

This is the part product teams get backwards constantly, and it's grimly funny once you notice it: they measure the click-through on the commitment step and call it validated, when the click-through is the one number that mechanism doesn't run on.

## Commitment and Consistency vs Sunk Cost Fallacy: What's the Difference?

Sunk cost is about resources — you keep going because stopping means admitting the money and effort were wasted. Commitment and consistency is about identity — you keep going because stopping means admitting you were wrong about who you are.

Confusing the two is exactly the mistake I made for the longest. They travel together often enough to look identical from the outside, but they fail differently. Kill a sunk-cost decision and the person feels regret about resources. Kill a commitment-consistency decision and the person feels regret about *themselves*, which is a much stickier, more defensive emotion — and it's why customers who feel "low-balled" don't quietly churn, they write the cancellation-survey essay, they leave the one-star review with a paragraph, they tell their group chat. The 2022 FTC staff report on manipulative interface design, "Bringing Dark Patterns to Light," documents this exact escalation pattern across e-commerce and subscription services — coerced or deceptive consistency plays generate disproportionate complaint volume and regulatory attention relative to their conversion lift ([FTC, 2022](https://www.ftc.gov/reports/bringing-dark-patterns-light)). Regulators built an entire report category around the moment consistency-as-manipulation curdles into consistency-as-grievance.

That's the mechanism in reverse: the same psychological wiring that makes people honor a freely made small commitment makes them furious when they realize the commitment was staged for them. You don't get to use half the effect and skip the other half. It's one system.

## Can You Resist the Commitment and Consistency Bias?

In theory, yes — the pressure is overridable. In practice, almost never, because overriding it takes deliberate reasoning in exactly the moments you're on autopilot, and that's what makes the honest version of this so durable.

It works on smart, skeptical, well-read people just as reliably as anyone else. I've watched founders who could recite *Influence* cover to cover still say yes to their own funnel's small ask, because knowing the mechanism exists and catching yourself inside it in real time are different cognitive tasks entirely. This is also why the honest version compounds and the staged version decays: a freely chosen small yes gets reinforced every time the person notices they're acting consistently with it, building a loop with no expiration date. A manufactured small yes gets reinforced right up until the person notices the manufacturing, at which point the loop doesn't just stop — it runs backward, and now they're consistent with a new identity: "the kind of person who doesn't fall for that again."

I spent years optimizing for the first click. The correction wasn't "stop using commitment and consistency" — it was building the small ask so it survives the person looking directly at it. If your onboarding checkbox can't survive a customer rereading it three weeks later, it was never a commitment. It was a checkbox.

What changes if this is right: growth teams stop measuring the micro-yes and start measuring whether it still holds up unexamined a month out, product teams stop treating "friction reduction" as an unqualified virtue since real commitment requires a small, felt cost, and anyone building an onboarding flow starts asking not "how do I get the click" but "would this person defend this choice to a friend." Cialdini's mechanism was never a lever on the customer. It was always a mirror, and I spent years trying to sell people a reflection I'd staged for them.