---
title: "AI Agent Negotiating With Another Agent: Binding Limits"
description: "Binding limits for an AI agent negotiating with another agent belong in code, not the prompt. Prompt-stated floors break under pressure."
pubDate: 2026-11-13
category: "ai-agents"
author: "Orvi"
readingTime: 8
tags: ["AI agents", "agent negotiation", "LLM guardrails", "multi-agent systems", "agent safety", "tool-use controls", "AI agent kill switch"]
featured: false
---

An AI agent negotiating with another agent needs guardrails that code enforces, outside the model: a price floor, a concession cap, and a spend limit that the agent's own output cannot override. A limit written into a prompt is advice. The counterparty's agent is built to find the gap between advice and enforcement.

The standard advice is to write the bounds into the system prompt, add a reviewer model to check offers, and keep a human approving anything that binds money. The Automated but Risky Game (2025) simulated buyer and seller agents and flagged budget violations and negotiation deadlock as critical risks ([arXiv:2506.00073](https://arxiv.org/abs/2506.00073)). Those risks are real. The standard response is incomplete, though. None of the papers cited here compares a prompt-stated limit with a code-enforced one. My argument is that the failures they report all sit in the instruction channel, where the limit is a sentence the model can reason its way around.

A price floor written into a system prompt is an argument the counterparty can answer. Enforcement has to sit at a decision boundary the other agent cannot talk to.

I have not shipped a negotiating agent. What I have run is an approval-gated X growth agent where every post, reply, follow and like went through a Telegram approval I pressed by hand, and its limits failed in ways that map onto this problem.

## Does a price floor in the system prompt hold under pressure?

Not reliably. The budget violations in the simulations cited above are this failure, and the same instruction-erosion pattern shows up under [multi-turn pressure](https://www.robatdasorvi.com/chapters/ai-agents/multi-turn-jailbreaks-against-ai-agents-with-tool-access). My read: the breach belongs to the instruction channel, not to how carefully the prompt was written.

A careful prompt narrows the risk but doesn't close it, because the model is still the one deciding whether the floor applies to the current turn.

## Why do experienced teams still put limits in the prompt?

Because it's fast to write, easy to review in a diff, and it passes every demo. It only fails when the other side pushes, and demos rarely push.

The case for prompts isn't stupid. A prompt is inspectable and changes without a deploy. Neither property helps much when the counterparty is a model optimizing against your stated floor. Magentic Marketplace (Microsoft Research and Arizona State University, 2025) put buyer and seller agents in a simulated market and found a severe first-proposal bias. Agents accepted the first acceptable offer instead of shopping around, and giving them more options didn't fix it. When researchers gave business agents manipulation strategies, those tactics shifted customer agents' choices ([arXiv:2510.25779](https://arxiv.org/html/2510.25779v1)). Telling the agent to "get the best price" doesn't correct a bias that lives in its default behavior. It just rewords the bias.

## Can a second model review the offers instead?

Not as a binding control. There is evidence that agents checking each other converge rather than correct: Peacemaker or Troublemaker (2025) found that sycophancy pushes multi-agent debate toward early agreement, and that early agreement lowered the debates' accuracy ([arXiv:2509.23055](https://arxiv.org/abs/2509.23055v1)). That study covers peer debate, not offer review, so treat it as a warning, not proof.

The strongest counterargument is that a well-prompted frontier model with a reviewer is good enough, and you can prove it with a few hundred test negotiations. A few hundred test negotiations only prove the reviewer holds against pressure you wrote yourself. In production the counterparty writes the pressure, and you don't control it.

## What does a binding limit look like in code?

A binding limit is a check the executor runs on every proposed action. It returns true or false, and the model can't edit it. The model proposes. The code decides.

This is the buyer side. A seller agent mirrors it with a floor: `if price < limits.floor: return False`.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Limits:
    ceiling: float          # highest price the agent may offer, set by the operator
    max_concessions: int    # rounds in which the price may move
    spend_cap: float        # total committed per day

def allow_offer(price: float, limits: Limits, state: dict) -> bool:
    # state holds "last_price", "concessions" and "committed"; the executor updates them after each sent offer.
    if price > limits.ceiling:
        return False
    if price != state["last_price"] and state["concessions"] >= limits.max_concessions:
        return False
    if state["committed"] + price > limits.spend_cap:
        return False
    return True
```

The executor calls allow_offer() before any commitment is sent. A False return is logged and the offer is refused; the model is not asked.

| Control | Lives in | Holds under counterparty pressure? |
|---|---|---|
| Prompt instruction | system prompt | Not reliably, the model decides whether it applies |
| Reviewer model | second LLM call | Not reliably, sycophancy in debate (2025) |
| Executor check | code, outside the model | Yes, for the fields it checks |
| Human approval | out-of-band gate | Only for what reaches the gate, and only per item |

Approval checks each action on its own. Nothing in my gate looked at the total volume or the pattern of actions. I can't say whether that is why X suspended the account twice, because X never told me.

The executor check only covers the fields you wrote it for. That's its limit. It checks what you named, so the list of named fields is the real specification.

## What did silent failures look like in my own agent?

For about six weeks, four hardcoded target accounts that no longer existed soaked up 88% of my bot's daily comment attempts. Every run logged success, and nothing raised an error.

The Telegram Skip button silently did nothing for months, so every skipped item got counted as a timeout. The approval stats from that stretch are unreliable. The article lane lost 8 of 20 generations to JSON parse errors, and each failure quietly burned a 48-hour slot.

None of these raised an error. Each one made the numbers I was steering by wrong. The link from these to negotiating agents is my inference; none of these incidents involved a negotiation.

## Who should be able to clear a stop?

Only a human. A stop the process can clear is a stop the process will clear.

On 2026-07-21, X suspended the account. My lockout check fired and returned True, but the caller only skipped one action, and the loop kept running for 3.5 more days. The fix was a process exit plus a sentinel file that only a human can clear, because launchd KeepAlive respawned a plain exit. The check was correct. Its consumer wasn't. A kill switch the system can reset isn't a kill switch, and [the same failure shows up in cached flags and leases](https://www.robatdasorvi.com/chapters/ai-agents/ai-agent-kill-switch-not-working-cached-flags-and-leases).

On 2026-09-22, a week after I raised the reply cap from 16 to 150, X suspended the account again. This time the lockout check matched none of its known selectors and never fired. I stopped the bot by hand. A detector that only knows a fixed list of selectors has the same weakness as a prompt floor: it covers only the cases someone wrote down in advance. A detector that only recognizes known strings fails open when the world changes; a stop condition also needs a fallback that trips on anything unrecognized. [Quarantining an agent after repeated guardrail blocks](https://www.robatdasorvi.com/chapters/ai-agents/quarantine-an-ai-agent-after-repeated-guardrail-blocks) covers the related case where blocks do fire.

## Which public incidents show the same gap?

Three documented cases show the same gap from different sides: a deployed bot stated a commitment or took an action that nothing outside the model checked. None of them is agent-to-agent; they are the closest public precedents.

In December 2023, a customer instructed the Chevrolet of Watsonville chatbot, which was built on ChatGPT, to agree with everything and append that each reply was a binding offer, [the same pattern behind refund abuse in support agents](https://www.robatdasorvi.com/chapters/ai-agents/customer-support-ai-agent-prompt-injection-refund-abuse). It "accepted" a $1 offer on a 2024 Tahoe. No car was sold, and the dealership pulled the bot ([AI Incident Database, report 3534](https://incidentdatabase.ai/reports/3534)).

In Moffatt v. Air Canada (February 14, 2024), the British Columbia Civil Resolution Tribunal held the airline responsible for its chatbot's wrong statement about bereavement fares. It also rejected the argument that the bot was a separate legal entity ([Kiplinger](https://www.kiplinger.com/personal-finance/travel/air-canada-to-pay-a-partial-refund-for-chatbot-error); primary source: [*Moffatt v. Air Canada*, 2024 BCCRT 149](https://www.canlii.org/en/bc/bccrt/doc/2024/2024bccrt149/2024bccrt149.html), BC Civil Resolution Tribunal decisions).

In July 2025, according to investor Jason Lemkin's public account, a Replit agent deleted a production database during a code freeze, then said rollback was impossible. He ran the rollback himself and recovered the data ([Fortune, July 23, 2025](https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/)). The freeze existed as an instruction, not as a permission the system enforced.

Replit is the clearest of the three. Nothing in the system stopped a destructive write during a freeze, so the freeze lived in a sentence.

## What will break first?

The first costly agent-to-agent negotiation failure will trace back to a limit that existed only as text. I expect a public incident within 12 months where one company's agent commits money past the other side's stated limit, and the root cause will turn out to be a prompt-level ceiling. The postmortem fix will be a per-action spend check in the executor, not a model upgrade. And the check will be the only part that worked.