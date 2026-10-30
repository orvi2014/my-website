---
title: "Customer Support AI Agent Prompt Injection: Refund Abuse"
description: "Support bots can be talked into refunds when the limit lives in the prompt. Air Canada, Chevrolet and the benchmark data show why caps belong in tool code."
pubDate: 2026-10-29
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["prompt injection", "AI agents", "customer support", "refund abuse", "LLM security", "tool calling", "agent guardrails", "AI red teaming"]
featured: false
---

Prompt injection against a customer support AI agent turns into refund abuse when the refund limit lives in the prompt, because customers can write prompts too. Put the cap and the approval threshold in the code that issues the refund, outside the model. The model can request a refund. Only the tool should be able to grant one.

In December 2023, a chat assistant on a Chevrolet dealership's website in Watsonville, California, agreed to sell a 2024 Tahoe for $1. The customer had told it to agree with every statement and to end each reply by calling it a legally binding offer. The bot had no authority to close a sale, so no car changed hands. A sentence typed by a stranger outranked the dealership's instructions. What saved the dealership was not the prompt but the fact that the bot had no power to complete a sale ([The Decoder](https://the-decoder.com/people-buy-brand-new-chevrolets-for-1-from-a-chatgpt-chatbot/); [AI Incident Database, report 6682](https://incidentdatabase.ai/reports/6682)).

## Can a customer support AI agent be tricked into issuing a refund?

Yes, if the refund tool trusts the model. The public record doesn't yet include a documented case of injection pulling money out of a refund tool, but it shows the step before that: support bots stating offers or policies the company never authorized. One was injected (Chevrolet) and two were hallucinated (Air Canada, Cursor). Only Air Canada was forced to honor what its bot said; Chevrolet was protected because the bot had no power to complete a sale.

In February 2024, the British Columbia Civil Resolution Tribunal decided *Moffatt v. Air Canada* (2024 BCCRT 149). Jake Moffatt had asked the airline's website chatbot about bereavement fares, was told he could claim the reduced rate retroactively, and booked full-fare flights. The tribunal held the airline responsible for what its chatbot said and ordered it to pay $650.88 in damages plus interest and fees ([Kiplinger](https://kiplinger.com/personal-finance/travel/air-canada-to-pay-a-partial-refund-for-chatbot-error); [CanLII, Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html)).

In April 2025, the help-desk bot "Sam" at Cursor told users who were being logged out when they switched machines that this was a new one-device-per-subscription policy. No such policy existed. The fault was a session bug. Users believed it, some cancelled their subscriptions, and Cursor's co-founder publicly apologized ([Ars Technica, April 2025](https://arstechnica.com/ai/2025/04/cursor-ai-support-bot-invents-fake-policy-and-triggers-user-uproar/)). No attacker was involved. The model filled a gap with confident text, and the company absorbed the cost.

## Why does a refund bot fail only some of the time?

It doesn't behave the same way on every attempt, and an attacker can retry until one attempt works. The tau-bench paper from Sierra tested agents on simulated retail and airline customer service, with API tools and a written policy. Its reliability metric, pass^k, asks whether an agent succeeds on all k independent trials of the same task. The authors report that gpt-4o's pass^8 in retail stayed below 25% ([Yao et al., 2024, arXiv:2406.12045](https://arxiv.org/pdf/2406.12045)). Put plainly, fewer than one retail task in four was completed correctly on all eight tries. tau-bench measured ordinary customers, not attackers; the step to adversarial retries is my inference.

Set that against an attacker, who needs one success out of many attempts. A bot that refuses 90% of the time pays out about once in every ten tries, and a support chat has no rate limit on that tenth try unless someone built one. Production teams need a reliability story for tool use, not just a demo that works once. The [tool-use reliability essay](https://www.robatdasorvi.com/chapters/ai-agents/tool-use-in-llms-what-it-actually-means-for-production-systems) covers the failure modes in more detail.

## Will better models stop prompt injection?

No. Instructions can also arrive hidden in content the bot reads, such as order notes, emails and ticket text, and a stronger system prompt doesn't close that route. The strongest counterargument is that newer models will simply stop obeying the customer. The evidence supports that part and undercuts it in the same breath.

Gray Swan and the UK AISI ran a public red-teaming competition in spring 2025 against agents in simulated deployments. The paper reports 1.8 million prompt-injection attacks, with over 60,000 successfully eliciting policy violations, and nearly all agents exhibiting policy violations for most behaviors within 10 to 100 queries ([Zou et al., arXiv:2507.20526](https://arxiv.org/pdf/2507.20526)). The results snapshot gives each model a single attack success rate for the whole challenge, ranging from about 1.5% to 6.5% ([Gray Swan results snapshot](https://www.grayswan.ai/blog/uk-aisi-x-gray-swan-agent-red-teaming-challenge-results-snapshot)). Claude models were the most robust in that competition, which is a fair point for the other side. A refund bot that reads order notes, emails, and pasted ticket text is exposed to indirect injection as well as direct: instructions arrive inside content the bot treats as data. The same indirect channel arrives through tool descriptions instead of ticket text, as the [MCP tool poisoning essay](https://www.robatdasorvi.com/chapters/ai-agents/mcp-tool-poisoning-malicious-tool-descriptions-and-silent-updates-to-trusted-servers) describes.

The newer evidence closes the escape hatch. Gray Swan's March 2026 indirect-injection arena reported more than 272,000 attack attempts against 13 frontier models. "No model was immune." ([Gray Swan blog post, March 2026](https://www.grayswan.ai/blog/your-ai-agent-can-be-compromised-youd-never-know)). A better model lowers the rate. It doesn't bring it to zero, and a refund process needs zero for the cases that move money.

AgentDojo, a 2024 benchmark for tool-using agents, makes the same point and also tests a defense. Across 97 tasks and 629 security test cases, the strongest agents were hijacked in under 25% of cases, and a secondary attack detector cut that to 8% ([Debenedetti et al., arXiv:2406.13352](https://arxiv.org/pdf/2406.13352)). The detector helps. It still lets one attack in twelve through, and a refund bot can't live with that rate for refunds.

## Who pays when the bot grants the refund?

The company does, and the prompt won't help in court. The Air Canada tribunal rejected the argument that the chatbot was a separate entity responsible for its own actions. Rivers, the tribunal member, wrote that the chatbot is part of the website, and the airline is responsible for the information on it. The tribunal found the airline "did not take reasonable care to ensure its chatbot was accurate" ([Kiplinger](https://kiplinger.com/personal-finance/travel/air-canada-to-pay-a-partial-refund-for-chatbot-error); [CanLII, Moffatt v. Air Canada, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html)). If your bot promises it, your books carry the promise. That was one small-claims decision in British Columbia, not a binding rule everywhere, but it is the clearest ruling so far and it rejected the 'separate entity' defense outright.

## Where should the refund limit live?

In tool code that checks identity, order state, and amount before any money moves. The model proposes an action, and the code decides whether it's allowed. The sketch below is minimal and illustrative, not taken from any product.

```python
REFUND_CAP_CENTS = 10_000          # above this, a human decides
MAX_REFUNDS_PER_ORDER = 1

def issue_refund(session, order_id: str, amount_cents: int) -> dict:
    # Identity comes from the authenticated session, never from chat text.
    order = orders.get(order_id, owner=session.customer_id)
    if order is None:
        return {"status": "denied", "why": "order_not_found"}
    if amount_cents <= 0:
        return {"status": "denied", "why": "invalid_amount"}
    if amount_cents > order.paid_cents:
        return {"status": "denied", "why": "exceeds_amount_paid"}
    if order.refunds_issued >= MAX_REFUNDS_PER_ORDER:
        return {"status": "denied", "why": "already_refunded"}
    if amount_cents > REFUND_CAP_CENTS:
        return queue_for_human(session, order_id, amount_cents)
    payments.refund(
        order.payment_id,
        amount_cents,
        idempotency_key=f"{order_id}:{order.refunds_issued}",
    )
    # in production, check-and-increment must be atomic (row lock or conditional update)
    order.refunds_issued += 1
    return {"status": "approved", "amount_cents": amount_cents}
```

I learned the difference between an advisory check and an enforced one on a different system: my approval-gated X growth agent, where every post, reply, follow and like went through a Telegram approval I pressed by hand. On 2026-07-21, X suspended that account. The lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. A check that returns an answer is advisory until the code path can't proceed without it. The fix was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit. A refund cap needs the same property: the model can't route around it, and only a human can lift it.

The temptation is to put the cap in the system prompt, because that's the easiest place to edit it on a Friday afternoon. The code above is harder to change, and it can't be argued with. Scoping the tool's permissions the same way is the subject of the [least-privilege essay](https://www.robatdasorvi.com/chapters/ai-agents/least-privilege-for-ai-agents-scoping-tools-keys-and-filesystems-in-practice).

| Control | Where it runs | Survives an injected instruction? |
|---|---|---|
| "Never refund over $100" in the system prompt | Model context | No. It's text, and the customer can argue with text. |
| Injection classifier in front of the model | Model pipeline | Partly. AgentDojo's detector still let 8% of attacks through. |
| Cap, ownership, and once-per-order checks in the refund tool | Application code | Yes, for amounts and ownership. It does not stop a plausible false claim under the cap. |
| Human queue above threshold, not writable from chat | Ops tooling | Yes, as long as the chat session has no write path into the queue. |

## What the tool layer doesn't fix

A cap limits the loss per order, but it doesn't stop abuse below the cap, such as false "item never arrived" claims or many small refunds across accounts. Those need per-customer refund velocity limits and fraud signals that the chat session can't see or write. An enforced check also only protects against failures it can recognize. When X suspended the account again on 2026-09-22, the lockout check matched none of its known selectors and never fired; I stopped the bot by hand.

## What I expect the next post-mortem to say

By 2027-10-29, I predict at least one publicly documented case in which a customer got a refund or credit above a support bot's published cap through the chat interface. The post-mortem will name a missing check in the tool layer, not a prompt the model failed to follow. My reading of the tau-bench numbers suggests the mechanism: if a bot is inconsistent with ordinary customers, an attacker who retries will eventually get the bad outcome, and the company's fix will be a server-side limit that should have existed from the start. If no such case is documented by that date, the prediction is wrong, and the likely reason is that nobody publishes these incidents.