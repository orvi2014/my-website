---
title: "LLM Judge Scores Every Answer the Same: Fixing the Rubric"
description: "An LLM judge scores every answer the same when its rubric has vague anchors and a coarse scale. Anchor each level, then check score spread before trusting it."
pubDate: 2026-11-21
category: "ai-automation"
author: "Orvi"
readingTime: 6
tags: ["LLM as a judge", "LLM evaluation", "rubric design", "AI agent evals", "score calibration", "pointwise scoring", "AI quality gates"]
featured: false
---

An LLM judge gives everything the same score when its rubric gives it no reason to tell answers apart. That usually means vague level descriptions, a coarse integer scale, and a top level that describes what most answers already do. The fix is to anchor each level to something you can check, then look at how the scores spread before any threshold reads them.

For months, a number in my own approval-gated X bot was wrong and I didn't know. A Telegram button I'd built to skip items did nothing, so every skip got logged as a timeout, and the approval statistics were wrong without anything raising an error. The judge problem below has the same shape: an instrument that hands you a clean number while measuring something else.

## Why does an LLM judge give nearly every answer a 4 or a 5?

It gives high scores because the rubric describes a good answer in words that a fluent answer always satisfies. "Clear, accurate, and well-structured" describes most model output, so the judge defaults to the top band.

The obvious reading is that the judge is lenient. That's true, and it doesn't help much, because leniency is the symptom. The rubric produced it. Each level was a sentence about quality, not a test the answer could pass or fail.

## Why does a rubric compress scores?

Three places, at once: the anchors, the scale, and the lack of any check on how the scores are distributed.

Zheng et al. (2023) found that a strong judge, GPT-4 among them, agreed with human preferences over 80 percent of the time, about the same rate humans agree with each other, in [their NeurIPS paper](https://arxiv.org/abs/2306.05685). That agreement was measured on MT-Bench and Chatbot Arena questions, using mainly pairwise comparisons on a fixed question set. It says nothing about whether your rubric separates your answers, and that is the part you have to check yourself.

A coarse scale makes it worse. TrustJudge (2025) traced score-comparison inconsistency to information loss on a 5-point integer scale, where different quality levels collapse into the same score. With Llama-3.1-70B as the judge, the paper reports that inconsistency drops from 23.32 percent to 14.89 percent when scoring uses the judge's probability distribution over ratings instead of a single integer, per [arXiv 2509.21117](https://arxiv.org/abs/2509.21117).

Feuer et al. (2025) found that judges' overall verdicts were largely unexplained by their own per-criterion scores (schematic incoherence) in an Arena-Hard Auto case study, with over 90 percent unexplained variance for DeepSeek-R1-32B, per [arXiv 2509.20293](https://arxiv.org/abs/2509.20293). If a judge's final score doesn't follow from its own criteria, the rubric isn't controlling the score.

## What does the compression cost once the scores are used?

The second-order cost is that the gate stops filtering, and the team starts optimizing noise.

Say the pipeline passes anything scoring 4 or higher. If 90 percent of answers land at 4 or 5, the gate passes nearly everything and stops deciding anything. The pass rate sits high, someone reads that as success, and then the prompt or the best-of-n selection gets tuned against a score with almost no range. Each change looks like an improvement, but it's moving a number that barely moves.

From there the loop rewards whatever moves the number, not the quality the rubric was supposed to measure. A judge that can't tell two answers apart will choose between them on length, formatting, or phrasing, because those are the features it can see.

A second judge from the same model family is likely to share the first one's blind spots, so check agreement against [human labels](https://www.robatdasorvi.com/chapters/ai-automation/llm-as-a-judge-reliability-how-to-check-your-grader-against-human-labels), not against another judge.

## When an automated score was optimized in public

AlpacaEval's judge was known to favor longer outputs, and the maintainers released length-controlled win rates in April 2024 to correct for it (Dubois et al., [arXiv 2404.04475](https://arxiv.org/abs/2404.04475)). Anyone tuning against the raw win rate was partly tuning for length.

In October 2024, Zheng et al. showed that a "null model" that returns the same adversarially crafted response, built to exploit the judge's prompt template, for every prompt could reach an 86.5 percent length-controlled win rate on AlpacaEval 2.0 ([arXiv 2410.07137](https://arxiv.org/abs/2410.07137)). If a crafted non-answer can beat the judge, an optimization loop can climb the judge's score without any answer getting better.

On 2025-04-29, OpenAI rolled back a GPT-4o update after it became overly sycophantic, saying it had focused too much on short-term feedback ([OpenAI](https://openai.com/index/sycophancy-in-gpt-4o/)). A follow-up on 2025-05-02 named a reward signal based on thumbs-up and thumbs-down data as a contributing factor ([OpenAI](https://openai.com/index/expanding-on-sycophancy/)). That signal was user feedback, not an LLM judge, but the failure has the same shape: a proxy score that tuning could push up without the underlying quality improving.

## Is the judge right and the answers really equal?

Sometimes they are equal, and then the judge is right to score them the same. That's the strongest counterargument, and it can be tested.

If the answers are equal, pairwise comparisons should land near 50/50, and the absolute scores should agree with the order of those comparisons. TrustJudge measured this directly. With Llama-3.1-70B as the judge, its baseline showed a 23.32 percent score-comparison inconsistency rate (cases where the absolute scores and the judge's own pairwise preference disagreed), so the absolute scores weren't fully tracking the judge's preferences.

The test is cheap. Take 50 answers and pick random pairs that received the same pointwise score. Run each pair through a pairwise comparison twice, swapping the order. If the judge picks the same winner in both orders well above half the time, it can tell those answers apart, and the scale is hiding that. If it splits close to 50/50, the answers may really be equal for this criterion.

## Does a finer scale fix it?

Not by itself. A wider integer scale gives the judge more labels, but if the anchors are still adjectives it has no reason to use them consistently. TrustJudge's gain came from reading the judge's probability distribution, not from adding integer points.

The fix is in what each level means. Swap adjectives for checks the answer either passes or fails:

```python
import statistics
RUBRIC = {
    5: "Every factual claim is traceable to a supplied source; no step is unsupported.",
    4: "Every claim that affects the conclusion is traceable; at most one peripheral detail is unsupported.",
    3: "Exactly one claim that affects the conclusion is untraceable, or two or more peripheral details are unsupported.",
    2: "Two or more untraceable claims; conclusion not reliable.",
    1: "Conclusion contradicts the source or is absent.",
}

def spread_check(scores, min_sd=0.8, max_top_share=0.6):
    top_share = sum(s >= 4 for s in scores) / len(scores)
    sd = statistics.pstdev(scores)
    if sd < min_sd or top_share > max_top_share:
        raise ValueError(f"scores compressed: sd={sd:.2f}, share>=4={top_share:.0%}")
    return sd, top_share
```

This rubric is for grounded answers checked against supplied sources. For other criteria, write each level as a check the same way: a countable condition, not an adjective.

The thresholds in `spread_check` are starting points, not measured values. Set them from a labelled sample of your own answers. If the swap-order test shows your answers really are equal on this criterion, a failing `spread_check` is a true negative. Relax the threshold for that criterion rather than rewriting the rubric to force spread.

Two fixes the rubric above doesn't yet show. First, give the judge one short example answer for each level, so every score has a concrete reference. Second, take the probability-weighted score from the judge's token log-probabilities, where their API exposes them, instead of the single integer. That is the change the TrustJudge results point to.

| Symptom | Likely cause | Check before changing the model |
|---|---|---|
| Most scores are 4 or 5 | Anchors describe quality in adjectives | Rewrite each level as a pass/fail test |
| Pairwise and pointwise disagree | Scale collapses distinct quality levels | Swap-order pairwise test on tied pairs from 50 answers |
| Score moves when option order changes | Position bias in the rubric list | Shuffle level order and re-score |
| Two judges agree, both wrong on hard cases | Shared model-family errors | Score a human-labelled sample |
| Pass rate high, quality complaints rising | Gate filters nothing | Check score range before the gate |

## What to do before any gate reads the scores

Run `spread_check` on the first batch of scores, before any gate or optimization reads them. Compression is cheap to fix at that point and expensive once a threshold or a prompt-tuning loop depends on it. Rewrite the rubric as checks, then set the threshold from a labelled sample instead of guessing.

A judge whose scores bunch at the top has stopped measuring. Every decision made on its numbers after that point is made on a range the rubric never had.

For the reliability side, see [LLM-as-a-Judge Reliability: Check Your Grader Against Human Labels](https://www.robatdasorvi.com/chapters/ai-automation/llm-as-a-judge-reliability-how-to-check-your-grader-against-human-labels). For a related case where an automated check reported a clean result, see [Evaluate RAG Citation Accuracy: Does the Source Say It?](https://www.robatdasorvi.com/chapters/ai-automation/evaluate-rag-citation-accuracy-does-the-source-say-it). If the judge returns JSON scores, see [LLM Structured Output: Validation, Retry or Constrained Decoding?](https://www.robatdasorvi.com/chapters/ai-automation/fixing-malformed-json-from-llms-constrained-decoding-vs-validate-and-retry).