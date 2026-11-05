---
title: "Evaluate RAG Citation Accuracy: Does the Source Say It?"
description: "To evaluate RAG citation accuracy, check that each cited sentence is entailed by its source passage, not that the link resolves. In one audit, a quarter failed."
pubDate: 2026-11-05
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["RAG evaluation", "citation accuracy", "LLM hallucination", "faithfulness metrics", "AI attribution", "grounded generation", "LLM-as-judge"]
featured: false
---

To evaluate RAG citation accuracy, take each cited sentence and check it against the exact passage it points to. Ask whether that passage supports the claim. Don't ask whether the URL resolves. Measured that way, a large share fail. In Liu, Zhang and Liang's 2023 audit of four generative search engines, only 51.5% of generated sentences were fully supported by their citations, and a quarter of citations (25.5%) did not support the sentence they were attached to.

Every post, reply, follow and like my X growth agent made went through a Telegram approval I pressed by hand. A human gate like that judges whether a sentence reads well. A citation check asks a different question: does the passage underneath say the same thing? An approve button doesn't ask it. That gate was built to approve posts, not to check sources. What carries over is the gap between approving the surface and checking what is underneath.

## Why Does a Fluent Citation Pass Inspection?

A fluent citation gets through because the sentence and the link both look like evidence, and a human eye checks neither against the other. The approver grades the prose. Prose is the one thing a language model is good at.

The academic version is blunter. Liu, Zhang and Liang (2023) ran a human evaluation of four generative search engines: Bing Chat, NeevaAI, perplexity.ai and YouChat. The 51.5% figure is an average across the four engines ([arXiv:2304.09848](https://arxiv.org/abs/2304.09848)). The uncomfortable part is the trade-off they found. Citation quality ran inversely to perceived utility. Answers that copied or closely paraphrased their sources scored better on citations but read as less useful, and the answers that read as most useful drifted furthest from what they cited.

## What Does the Source Actually Say?

The source has to be checked as a passage, not as a page. Store the exact text that was retrieved, then test whether the claim is entailed by that text. A link that resolves only proves that a URL exists.

Citation recall is the share of claim-bearing sentences fully supported by their citations. Citation precision is the share of individual citations that support the sentence they are attached to (Liu et al., 2023). The ALCE benchmark (Gao et al., 2023, [arXiv:2305.14627](https://arxiv.org/abs/2305.14627)) automates both by running an NLI model over the cited passages and the generated sentence.

In March 2025, the Tow Center for Digital Journalism at Columbia tested a narrower version of the problem: given a quoted news excerpt, could eight AI search tools name the original article, publisher and URL? Collectively, the tools answered more than 60 percent of those queries incorrectly. The premium tools were more confidently wrong than the free ones ([Columbia Journalism Review](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php)).

A minimal check separates three outcomes. The source is missing. The source exists but doesn't support the claim. Or the source supports the claim.

```python
def check_citation(claim: str, cited_id: str, store: dict, judge) -> str:
    passage = store.get(cited_id)           # text stored at retrieval time, not the URL
    if passage is None:
        return "fabricated_source"          # id was never in the index
    # judge.support_level: an NLI entailment model (as in ALCE) or a calibrated LLM judge
    verdict = judge.support_level(premise=passage, hypothesis=claim)  # 'full' | 'partial' | 'none'
    if verdict == "none":
        return "unsupported"                # passage exists, claim is not in it
    if verdict == "partial":
        return "partially_supported"
    return "supported"
```

The first branch needs no model at all, and it catches the cheapest fabrications. A "partially supported" result needs its own label instead of being folded into "supported".

## Has This Already Gone Wrong in Public?

Yes. Here are two documented cases, one for each failure branch in the check above.

In Moffatt v. Air Canada, the British Columbia Civil Resolution Tribunal ruled on 14 February 2024 (2024 BCCRT 149). The airline's chatbot had invented a bereavement-fare refund policy. The airline's own webpage, which the chatbot linked to, said the policy didn't apply to requests made after travel. The tribunal rejected Air Canada's argument that the chatbot was a separate entity responsible for its own actions, and held that a customer has no reason to know which part of the airline's website is accurate. The award was about $812 CAD ([Skift](https://skift.com/2024/02/16/air-canada-ordered-to-pay-for-its-chatbots-false-info)). In the terms of the check above, that is the unsupported branch: the cited page existed and contradicted the claim attached to it.

The second case was a consulting report. In October 2025, Deloitte Australia agreed to partially refund the Australian government over a AU$440,000 welfare-compliance report. The report contained nonexistent academic references and a fabricated court quotation. Deloitte's corrected version added a disclosure of generative AI use, but it didn't attribute the errors to AI directly ([The Register](https://www.theregister.com/2025/10/06/deloitte_ai_report_australia/)). A report reviewed well enough to be paid for still carried citations that pointed at nothing. That is the fabricated_source branch. In a RAG pipeline it costs nothing to catch, but only if citations are limited to IDs from your own retrieval store. Free-text references like Deloitte's need a lookup against a real bibliographic index.

## Can an LLM Judge Check the Citation for Me?

An LLM judge can run the first pass, but only after you've measured how well it agrees with human labels on your own corpus. The Ragas framework (Es et al., 2023) scores faithfulness by extracting the statements in an answer and computing the fraction the retrieved context supports. It doesn't need human reference answers ([arXiv:2309.15217](https://arxiv.org/abs/2309.15217)).

The obvious objection is that this is circular. A model grading a model proves nothing. That objection is right about unvalidated judges and wrong about the method. The Liu study released its human annotations publicly ([GitHub](https://github.com/nelson-liu/evaluating-verifiability-in-generative-search-engines)), so judge output can be scored against human labels instead of trusted on faith. So calibrate on that kind of set, report judge-human agreement, and keep the judge model fixed when you compare runs. An LLM-scored metric shifts across models and prompts. The judge is a filter that needs its own test. It isn't an oracle.

## How Do You Run This Audit on Your Own Pipeline?

Start at generation time. Log the retrieved passage text and its ID with every generated answer, because a passage that has been re-indexed or rewritten can't be checked afterwards.

Next, draw a fixed sample of 100 to 200 cited sentences and have humans label each one as fully supported, partially supported or not supported, the way Liu et al. did. Keep the sample fixed so that numbers stay comparable across runs. At 200 sentences, a measured 75% support rate carries a margin of roughly ±6 points, so treat smaller movements between runs as noise.

From those labels, report citation recall and precision as defined above, plus the rate of fabricated_source from the check. Recall and precision come from the human labels; the fabricated_source rate needs only the ID lookup.

Before you trust an NLI model or LLM judge on the rest of the corpus, measure its agreement with the human labels on that sample. ALCE uses NLI for this kind of scoring, and Ragas uses an LLM to extract statements and judge their support, so either one needs a measured agreement rate before its scores mean anything.

Finally, re-run the audit on the same sample whenever the retriever, prompt or model changes. A score that moves without a change to the sample is a change in the system, not in the data.

## Who Checks the Approver?

Nobody, unless the pipeline makes the source visible and computes the label before a human sees the card. The human gate is the last place a bad citation can be stopped, and it's the weakest place to rely on, because it sees the sentence and not the passage ([AI-Assisted Coding vs Vibe Coding: The Difference Is Review](https://www.robatdasorvi.com/chapters/ai-automation/ai-assisted-coding-vs-vibe-coding)).

My own system had the same shape. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of my X bot's daily comment attempts, and every run logged success. Nothing raised an error. A check that always reports success tells you nothing about whether the thing it checks is right. Citation checks fail the same way when they test whether a link exists instead of whether the claim is in it. For the structural side of this problem, see [LLM Structured Output: Validation, Retry or Constrained Decoding?](https://www.robatdasorvi.com/chapters/ai-automation/fixing-malformed-json-from-llms-constrained-decoding-vs-validate-and-retry), which covers validating output instead of trusting it. For why these failures stay quiet, see [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars).

Whatever the approval surface, what should change is what sits under the sentence: the exact passage it came from, and a label saying whether that passage agrees with it.