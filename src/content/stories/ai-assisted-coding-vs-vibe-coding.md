---
title: "AI-Assisted Coding vs Vibe Coding: What the Difference Actually Is"
description: "Vibe coding and AI-assisted coding use the same tools and produce very different software. The line is review, and the data on what happens when you skip it."
pubDate: 2026-09-04
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["vibe coding", "AI-assisted coding", "AI coding tools", "code review", "software quality", "developer productivity", "AI code security"]
featured: false
faq:
  - q: "What is the difference between vibe coding and AI-assisted coding?"
    a: "The difference is review, not tooling. Both use an LLM to generate code from natural language. In vibe coding you accept the output without reading it, and you debug by pasting errors back into the chat. In AI-assisted coding you read what the model produced, test it, and keep architectural decisions yourself. Simon Willison's test settles most cases: if you reviewed the code, tested it, and can explain how it works to another person, it is not vibe coding, it is software development that happened to use an LLM."
  - q: "Is vibe coding safe for production?"
    a: "The evidence says no, not without a review step added back. OX Security reports 62% of AI-generated code ships with vulnerabilities. A Carnegie Mellon study found 61% of AI-generated code functions correctly while only 10.5% passes security review. Escape.tech scanned roughly 5,600 vibe-coded applications and found over 2,000 vulnerabilities, 400+ exposed secrets, and 175 instances of exposed PII. Vibe coding is well suited to prototypes, throwaway tools, and personal projects where nothing is at risk if the code is wrong."
  - q: "Who coined the term vibe coding?"
    a: "Andrej Karpathy, in February 2025. His description was to 'fully give in to the vibes, embrace exponentials, and forget that the code even exists.' The phrase named a practice that already existed without a label. Collins named it Word of the Year for 2025 and Merriam-Webster added it as slang the same year."
  - q: "Does AI-assisted coding actually make developers faster?"
    a: "Not reliably, and the perception gap is the interesting part. METR ran a randomized controlled trial in 2025 with 16 experienced open-source developers across 246 tasks. Developers predicted AI would make them 24% faster. They were measured at 19% slower. After finishing, they still believed they had been about 20% faster. Speed is the wrong thing to optimize for, which is most of the argument for keeping a review step."
---

## What is the difference between vibe coding and AI-assisted coding?

The difference is whether you read the code.

That is the whole distinction, and I have yet to see it survive being made more complicated. Both practices use the same models, the same editors, the same prompt-and-generate loop. What separates them happens in the few seconds after the output appears: you either read it and take responsibility for it, or you run it and find out.

Everything else follows from that one choice. Security posture, maintainability, whether anyone can fix the thing in six months, whether you can explain your own system in a code review. One decision, repeated a few hundred times a week, compounds into two very different kinds of software.

## What is vibe coding?

Vibe coding is building software with an LLM without reading what it wrote. [Andrej Karpathy coined the term in February 2025](https://x.com/karpathy/status/1886192184808149383), describing a way of working where you "fully give in to the vibes, embrace exponentials, and forget that the code even exists."

The phrase caught because it named something people were already doing and felt slightly embarrassed about. You describe what you want. The model writes it. You run it. If it breaks, you paste the error back into the chat and let the model try again. You never open the file. You are not reviewing an implementation, you are steering a black box by its outputs.

[Collins named it Word of the Year for 2025](https://www.collinsdictionary.com/woty) on 6 November 2025, and Merriam-Webster added it as slang that same year, which tells you something about how fast it moved from a tweet to a working practice. A throwaway tweet became a dictionary entry in nine months.

The important thing about Karpathy's original framing is that it was not a criticism. He was describing a legitimate mode for throwaway projects, where forgetting the code exists is exactly the point. The trouble started when the mode escaped the weekend project and turned up in production.

## What is AI-assisted coding?

AI-assisted coding uses the same tools and keeps the engineering. The model writes the implementation; you still own the architecture, the review, and the bug.

You still make the architectural calls. You decide what the system is, how it is structured, what the boundaries are. The model writes implementations inside those decisions, fast, and you read every one of them before it becomes yours. When something breaks you debug it the way you would debug anything, by understanding it, rather than by describing the symptom to a chat window and hoping.

[Addy Osmani has made this point sharply](https://medium.com/@addyosmani/vibe-coding-is-not-the-same-as-ai-assisted-engineering-3f81088d5b98): the model is a very fast junior engineer and you are the tech lead. The junior writes a lot of code. The lead is still accountable for all of it. His estimate is that AI gets you about 70% of the way to working software, and the remaining 30% is still engineering judgment.

[Simon Willison put the cleanest test on it in March 2025](https://simonwillison.net/2025/Mar/6/vibe-coding/). If an LLM wrote the code, and you reviewed it, tested it properly, and can explain how it works to someone else, that is not vibe coding. That is software development that happened to use an LLM. The tool did not change what you are responsible for.

## How do vibe coding and AI-assisted coding compare, side by side?

They differ on one input and eight outputs. The input is whether you read the generated code; everything below is downstream of that single decision.

| | Vibe coding | AI-assisted coding |
|---|---|---|
| Who makes architecture decisions | The model, implicitly | You, explicitly |
| Do you read the generated code | No | Yes, before it ships |
| How you debug | Paste the error back into chat | Read the code, form a hypothesis |
| What you optimize for | Speed to something running | Speed to something correct |
| Can you explain the system | No | Yes |
| Who is accountable for a bug | Unclear | You |
| Good for | Prototypes, throwaway tools, learning, personal projects | Anything with users, data, money, or a maintenance horizon |
| Failure mode | Silent defects that surface in production | Slower than the demo suggested |

The row that matters most is the last one. Both practices fail. They fail differently. AI-assisted coding fails by being less of a speedup than you were promised. Vibe coding fails by shipping something broken that nobody noticed was broken.

## What does the data say about skipping review?

Unreviewed AI code works far more often than it is safe, and the measured gap between those two things is roughly 50 percentage points. Four independent 2025 studies land in the same place from different directions.

On security, the numbers are consistent across independent sources and they are not close. [OX Security reports that 62% of AI-generated code ships with vulnerabilities](https://www.ox.security/blog/vibe-coding-security/). A [Carnegie Mellon study](https://arxiv.org/abs/2512.03262) built a benchmark called SusVibes — 200 repository-scale tasks drawn from 108 open-source Python projects, spanning 77 CWE weakness classes — and found that while 61% of AI-generated code functions correctly, only 10.5% passes security review. More than 80% of the solutions that passed the tests still contained a vulnerability. That is the gap between "it works" and "it is safe" stated as plainly as it can be.

[Escape.tech scanned roughly 5,600 vibe-coded applications](https://escape.tech/state-of-security-of-vibe-coded-apps) and found over 2,000 vulnerabilities, more than 400 exposed secrets including API keys and credentials, and 175 instances of exposed personal data — medical records, IBANs, phone numbers, emails. [Their methodology writeup](https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/) is worth reading on one point in particular: these were live production apps, findable within hours by anyone who bothered to look, not theoretical flags from an over-sensitive scanner.

A December 2025 study from [Tenzai](https://blog.tenzai.com/) took 15 applications across five AI coding platforms and found 69 vulnerabilities in total, [about half a dozen of them rated critical](https://www.infoworld.com/article/4116937/output-from-vibe-coding-tools-prone-to-critical-security-flaws-study-finds-2.html). Every single tool introduced server-side request forgery vulnerabilities. Zero of the 15 applications implemented CSRF protection. Zero set any security headers. Not most. Zero.

On defect rates, [CodeRabbit's December 2025 analysis of 470 pull requests](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report) — 320 AI-coauthored, 150 human-only — found AI-coauthored code carried 1.7 times more major issues, with logic flaws up 75%, readability problems tripling, and security findings up to 2.74x higher. In raw terms: 10.83 findings per AI pull request against 6.45 per human one. [Uplevel's 2024 study of roughly 800 developers after Copilot adoption](https://resources.uplevelteam.com/gen-ai-for-coding) found a 41% increase in bugs, with no significant improvement in pull request cycle time or merged throughput. The speed arrived and left again as rework.

[Gartner's Predicts 2026 research](https://www.armorcode.com/blog/your-genai-code-debt-is-coming-due-heres-what-gartner-predicts) projects that prompt-to-app development by citizen developers will increase software defects by 2,500% by 2028 without governance and quality controls. I would not put much weight on the specific figure, since nobody can forecast a defect rate two years out to that precision, but the direction is consistent with everything else here.

None of this says models write bad code. It says unreviewed code is unreviewed code, which was true long before any of this.

## Does AI-assisted coding actually make you faster?

Measured, no — at least not for experienced developers in codebases they already know. The best available experiment found a 19% slowdown, and the developers living through it could not detect it.

[METR ran a randomized controlled trial in 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) with 16 experienced open-source developers working on repositories they knew well — averaging over 22,000 stars and a million lines of code — across 246 real tasks averaging about two hours each. Each task was randomly assigned to allow or forbid AI tools. [The full paper is on arXiv](https://arxiv.org/abs/2507.09089).

Developers forecast that AI would make them 24% faster. They were measured at 19% slower. And after completing the tasks, having actually lived through the slowdown, they still estimated they had been about 20% more productive.

The slowdown itself I would hold loosely. Sixteen participants, mature codebases they already knew well, one point in time. The perception gap is the part that has stayed with me. These people could not tell from the inside whether the tool was helping, and they were experienced developers paying attention. What it felt like and what was measured pointed in opposite directions by nearly 40 percentage points. If you cannot feel a 19% slowdown while it is happening, you cannot feel a missing review either.

I recognize that gap, which is probably why it bothers me. AI-assisted work feels productive in a way that is hard to argue with while you are doing it.

[Stack Overflow's 2025 survey of more than 49,000 developers](https://survey.stackoverflow.co/2025/ai) found the same tension from a different angle. Adoption reached 84% using or planning to use AI tools, up from 76% the year before. Trust in AI accuracy fell from 40% to 29% year over year, with 46% actively distrusting the output and only 3% reporting high trust. The most cited frustration, from 66% of respondents, is "AI solutions that are almost right, but not quite," and 45% say they lose significant time debugging AI-generated code. Adoption went up while trust went down, which is not a pattern you see in tools that are working.

Almost-right is the specific hazard. Obviously wrong code fails loudly and costs you a minute. Almost-right code passes a glance, passes the happy path, and fails in the case you did not think to check. The only reliable filter for almost-right is a person reading it.

## When should you use vibe coding, and when should you use AI-assisted coding?

Vibe code when being wrong is free. Use AI-assisted coding the moment someone other than you depends on the result.

Prototypes you will throw away. A script that renames 400 files. A weekend project with no users. Something you are building to decide whether the idea is worth building properly. Exploring an unfamiliar API where the fastest path to understanding is watching working code appear. Karpathy's framing holds up completely here, and the people sneering at vibe coding as a category are usually ignoring how much of programming is legitimately disposable.

Use AI-assisted coding when someone will depend on it.

Anything touching user data, money, authentication, or a database you cannot restore. Anything another developer will maintain. Anything you will still be running in a year. Size has nothing to do with it. The question is consequence: if this being subtly wrong would cost something real, read the code.

Choosing wrong is survivable. Drifting is what gets people. A prototype picks up a user. That user brings a second one. Nobody goes back and reviews the 4,000 lines that were never meant to survive, because no moment forces it, and the review would be miserable by then anyway. I have done this to myself more than once. It is a boring, procedural failure rather than a dramatic one, which is exactly why it keeps happening.

## How do you tell which one you are doing?

Open the last thing you shipped and try to explain it out loud. If you are reconstructing your own system from evidence, you were vibe coding, whatever you were calling it at the time.

Not the intent. The implementation. Why is the retry logic there. What happens when that call times out. Why does that function take a list instead of a single item. If you can answer, you were doing AI-assisted development, whatever the model contributed.

The honest answer for most of us, most weeks, is that we do both, and the line moves depending on how tired we are and how much the task seems to matter. That is fine. The problem is losing track of which one is happening, because both produce output that looks the same right up until it does not.

The tools will keep getting better, and I think that makes this distinction more useful over time rather than less. Better models write more convincing code. More convincing code makes skipping the review more tempting and its failures harder to spot.

## Related reading

The practice side of this, and what my own review habit actually looks like day to day, is in [I use AI to build, I don't let it think for me](/chapters/ai-automation/i-use-ai-to-build-i-dont-let-it-think-for-me). The failure mode that makes review non-negotiable is [code that looks right and is wrong](/chapters/ai-automation/what-happens-when-the-ai-gets-it-wrong-and-you-do-not-notice). If the model keeps forgetting what you told it three messages ago, that is [a context window problem rather than a discipline problem](/chapters/ai-automation/why-context-window-size-is-the-thing-every-developer-should-care-about). And the same review-or-not line, drawn around systems that act without you, is [AI-assisted vs AI-autonomous](/chapters/ai-agents/ai-assisted-vs-ai-autonomous-where-the-line-actually-is-and-why-it-matters).