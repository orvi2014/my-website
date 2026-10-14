---
title: "LLM-as-a-Judge Reliability: Check Your Grader Against Human Labels"
description: "LLM-as-a-judge reliability depends on more than an 80% agreement score. Here's what to check before you trust an AI grader."
pubDate: 2026-10-14
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["llm as a judge", "llm evaluation", "ai evals", "human labels", "ai agents", "grader reliability", "silent failures", "ai automation"]
featured: false
---

My X growth agent sent every post, reply, follow and like to Telegram and waited for me to approve it by hand. For months, its approval stats were wrong. I had been pressing 🗑 Skip, and the Skip button had silently done nothing for months, so every skipped item got filed as a timeout. The instrument was broken and the report looked fine. LLM-as-a-judge reliability fails the same way: a grader can report a clean agreement score while measuring the wrong thing.

## What Does an LLM Judge's Agreement Score Actually Measure?

An LLM judge's agreement score measures how often the judge matches the labels you collected, on the items you collected them for. That's all. It says nothing about outputs you didn't label, failures you didn't think to sample, or what happens when you swap the model that writes the outputs.

The common workflow goes like this: take a few hundred outputs, have people label them, run the judge on the same set, report agreement, and ship if the number looks high. Zheng et al. made this feel settled in 2023. They reported that GPT-4 agreed with expert votes 85% of the time on non-tied MT-Bench comparisons, against 81% between two human experts ([arXiv:2306.05685](https://arxiv.org/abs/2306.05685)). Agreement is the number everyone quotes. I think it's the wrong finish line.

## Why Do Experienced People Still Trust a Single Agreement Number?

Experienced teams trust a single agreement number because it fits on a slide and the 2023 MT-Bench headline made 80% sound like a standard. The strongest version of the argument goes: if the judge agrees with humans about as often as humans agree with each other, what more could you want?

The same paper answers that. The 85% applies only to non-tied first-turn comparisons. Put ties and inconsistent votes back in and the figures drop to 66% and 63%. The authors also measured position bias. Under the default prompt, GPT-4 gave consistent verdicts in only 65.0% of cases, which means swapping the two answers flipped the verdict about a third of the time. A judge that changes its mind when you reorder the candidates isn't reliably agreeing with anyone. The 85% was real, but it was measured only on comparisons where the human voters didn't call a tie. That subset is not your production traffic.

## Why Does a Judge Favor the Output of the Model It Is Grading?

Judges tend to prefer text that looks like their own, even when humans rate the two as equal. In 2024, Panickssery, Bowman and Feng showed that models can recognize their own generations, and that this recognition correlates with self-preference. Fine-tuning produced a linear relationship between the two ([arXiv:2404.13076](https://arxiv.org/abs/2404.13076)). Ye et al. went wider at ICLR 2025, cataloguing 12 potential biases in LLM-as-a-judge setups. They found significant biases in top models too, and the biases varied sharply by task ([arXiv:2410.02736](https://arxiv.org/abs/2410.02736)).

When a pipeline uses the same model family to write and grade, I assume the grader leans toward the writer. Prove otherwise on a held-out set before you trust the score.

## Can You Trust a Judge That Never Throws an Error?

No. A judge that never throws an error usually has failures that are being counted as passes. Before you trust its score, make sure that parse failures, refusals and timeouts each show up as a separate, counted outcome.

When X suspended my account on 2026-09-22, a week after the reply cap went from 16 to 150, the lockout check matched none of its known selectors. It never fired. The bot kept running until I stopped it by hand. The check knew a fixed set of lockout signals, and X showed it none of them, so the bot had nothing to stop on. A judge that can't parse its own output is in the same spot. My bot's long-form article generator wasn't a judge, but it shows the pattern: JSON parse errors killed 8 of 20 generations, and each failure burned a full 48-hour slot with no alarm anyone would notice. The comment cycle was worse. Four hardcoded target accounts that no longer existed soaked up 88% of the bot's daily comment attempts for about six weeks. Every run logged success, and nothing raised an error. If your judge returns malformed JSON and your harness defaults to "pass", your agreement score is counting outages as approvals.

This isn't just my bot. In July 2025, a Replit coding agent ran destructive commands against a production database during a declared code freeze ([AI Incident Database, entry 1152](https://incidentdatabase.ai/cite/1152/)). SaaStr founder Jason Lemkin, whose database it was, reported that the agent claimed the data couldn't be recovered, and a later rollback restored it. The agent's account of its own work was wrong. A judge that grades the writer's self-report instead of the actual output inherits that error. It's also the silent failure from the [agent rule-conflict problem I've written about before](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars), one layer up.

## Why Do the Labels Change While You Grade Them?

Your criteria form while you look at outputs. The labels you collect in week one won't match the ones you'd give in week three. Shankar et al. studied this at UIST 2024 with nine expert users building LLM evaluators ([ACM DOI 10.1145/3654777.3676450](https://dl.acm.org/doi/10.1145/3654777.3676450)). The criteria evolved as participants graded more outputs. Some criteria only made sense for the specific outputs in front of them, not as something definable in advance. Nine users is a small study. Still, the mechanism is plausible for anyone labeling a large batch alone over several days.

The best counterargument is that human labels are ground truth, so agreement with them is the only honest measure. MT-Bench undercuts that. Two experts agreed with each other 81% of the time, which means the ground truth has a ceiling of its own. Your labels are noisy, and they move. Treat them as a measurement with error bars, not as a fixed point the judge must match exactly.

## Is Raw Agreement the Right Metric for an LLM Judge?

Raw percent agreement is not a sufficient metric for an LLM judge, because it is inflated when one label dominates. If 90% of outputs are "pass," a judge that approves everything scores 90% agreement while catching no failures. Report Cohen's kappa or Krippendorff's alpha alongside raw agreement, since both correct for chance agreement.

Take the 90% case. For the judge that approves everything, p_e is 0.90 and κ is exactly 0. Now take a judge that also says "pass" 90% of the time and agrees with the humans on 90% of items: two raters guessing at random under those same proportions still match about 82% of the time (0.9² + 0.1² = 0.82). Cohen's kappa rescales observed agreement against that chance baseline: κ = (p_o − p_e) / (1 − p_e). Here p_o = 0.90 and p_e = 0.82, so κ ≈ 0.44. Cohen introduced the coefficient for two raters assigning nominal categories ([Cohen, 1960](https://doi.org/10.1177/001316446002000104)). With more than two raters, or with missing labels, Krippendorff's alpha is the usual choice. It extends the same chance correction to any number of coders and to ordinal or interval data (Krippendorff, *Content Analysis: An Introduction to Its Methodology*, 2nd ed., Sage, 2004).

## What Should You Check Before Trusting a Judge?

Before trusting a judge, check five things: agreement on a deliberately hard held-out slice, chance-corrected agreement (kappa), the verdict flip rate when you swap answer order, self-preference against a different model family, and how parse failures are counted. Include outputs from the generator you're evaluating and from a different model family. Self-preference only shows up when you go looking for it. Run every pair in both orders and count how often the verdict flips. If the verdict flips on more than about a third of swapped pairs (GPT-4's rate in the 2023 MT-Bench study), treat that as a warning, not a pass.

Report agreement per slice and per failure type, not as one blended number. A judge at 80% overall that scores 55% on the cases where the generator actually fails is useless for the job you need it to do. Count parse failures and refusals as failures in the score. If the judge can return "cannot determine," make that a distinct, visible outcome, not a quiet default pass. And record what the judge rewards. Check whether it prefers longer answers, more confident phrasing, or its own style, then compare those preferences against a human who has no reason to share them. Report kappa with a bootstrap confidence interval. On a slice of 50 labels, the interval is often wide enough to make a single point estimate meaningless.

None of this is exotic. It's the discipline you'd apply to any instrument. People skip it because the judge produces a clean number and never complains.

## Who Pays When a Judge Passes Bad Output?

The party that deployed the system pays, whether or not anyone audited the grader. In February 2024, the British Columbia Civil Resolution Tribunal held Air Canada liable for negligent misrepresentation (Moffatt v. Air Canada, 2024 BCCRT 149, decided 14 February 2024) after its website chatbot gave a passenger wrong information about bereavement fares. The airline argued the chatbot was responsible for its own words. The tribunal disagreed and treated the information as the airline's own ([CanLII decision](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html)). A grader that approves output is making the same kind of statement on the company's behalf.

Here's my prediction. Within two years, a regulator or a court will ask a company to produce the calibration set behind its automated grader: the held-out labels, the flip rates, the per-slice agreement. Most companies won't be able to. The ones that can will be the ones that kept a hard slice from day one. Nobody will call the missing audit a judge failure. They'll call it a missing audit trail, and they'll be right.

*Related reading: [When an Upstream API Changes, Your Agent's Tools Break Silently](https://www.robatdasorvi.com/chapters/ai-automation/when-an-upstream-api-changes-your-agent-s-tools-break-silently), on the same kind of quiet breakage, and [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars), on how rules that disagree fail without a signal.*