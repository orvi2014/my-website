---
title: "Is AI Pair Programming Worth It? One Year With Copilot, Cursor and Claude"
description: "Is AI pair programming worth it? After a year with GitHub Copilot, Cursor and Claude: the speed gains are real but concentrated, the bug data is sobering, and authorship quietly moves upstream."
pubDate: 2026-05-20
category: "ai-automation"
author: "Orvi"
readingTime: 10
tags: ["ai pair programming", "is ai pair programming worth it", "github copilot", "developer productivity", "cursor", "claude", "software engineering", "ai tools", "coding assistants"]
featured: false
---

The first sign that something had shifted was when I stopped feeling proud of finishing things.

That sounds worse than it is. I don't mean I stopped caring about the work. I mean the small dopamine hit of writing a function from scratch and watching it pass, that feeling got quieter. Not gone, but quieter. Replaced by something more like project management satisfaction. Getting things done, quickly, moving on to the next thing.

I had been using AI coding assistants, primarily GitHub Copilot, then Cursor, then Claude, for about a year by the time I noticed this. I'm a developer and founder based in Bangladesh, building products in the SaaS space, doing a mix of backend work, system design, and whatever frontend nobody else wants to touch. The noticing felt worth actually sitting down and writing through, rather than dismissing as a mood.

## What does an AI pair programming setup actually look like?

It's a small setup: an AI assistant inside the editor you already use. For me that was GitHub Copilot in VS Code first, then Cursor, then Claude. Installing it takes a few minutes. Getting used to working with it takes months.

The work I do is a mix: architecting new systems, maintaining existing ones, and the tedious middle ground of implementing features that are technically simple but time-consuming. Writing CRUD routes for the fifth time this quarter. Scaffolding components that follow a pattern established a dozen times in the same codebase. That last category is where I first used AI assistance in any serious, deliberate way.

The setup was unremarkable. GitHub Copilot inside VS Code. A task. A deadline. Autocomplete that occasionally surprised me with how well it read my intent.

What I wasn't ready for was how quickly the "assistant" framing would collapse in my head. Within two weeks, it didn't feel like a tool I was picking up and putting down. It felt more like a rhythm, a call-and-response where I was handling intent and the model was handling a lot of the expression. When that rhythm works, things move at a pace that takes a moment to get used to. When it doesn't, you find yourself reading plausible nonsense and wondering how long you stared at it before noticing.

## How much faster does AI pair programming make you?

It depends on the task. Boilerplate, repetitive routes, type generation and migration files went from 20–30 minutes to under 5 for me. Novel problems, architecture decisions and hard debugging barely sped up, and the best controlled study of experienced developers found them 19% *slower* on real-world tasks.

After a year, that feels about right. Anything where the solution was pattern-adjacent to things the model had encountered before: fast, sometimes startlingly fast. Anything requiring genuine novelty, like designing a system from scratch, debugging something truly strange, making judgment calls about architecture, the speed advantage mostly evaporated. The model gets confident faster than it gets correct, and in novel territory that gap widens considerably.

The most-cited number here comes from a controlled study GitHub ran in 2022: developers given an AI assistant finished a standardized programming task 55% faster than a control group — 1 hour 11 minutes versus 2 hours 41 minutes, a result statistically significant at P=.0017 ([GitHub, 2022](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/)). But that task was well-defined boilerplate (an HTTP server in JavaScript), exactly the slice of work where the gains pile up. Google's [2024 DORA report](https://dora.dev/research/2024/dora-report/) found the flip side at the team level: every 25% increase in AI adoption correlated with a 2.1% lift in individual productivity, but also a 7.2% drop in delivery stability and a 1.5% decline in throughput. And in a 2025 randomized trial, METR had 16 experienced open-source developers complete 246 real tasks in repositories they knew well. With AI tools allowed they took 19% longer, yet afterward they estimated AI had made them about 20% faster ([METR, 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)). That last result stuck with me more than any headline number: **how fast AI makes you feel is not a reliable measure of how fast AI makes you.** The productivity gains are worth having. They just aren't spread evenly across a developer's actual work.

Testing surprised me most. I expected the AI to be useful for writing test cases. I didn't expect it to be useful for helping me think through edge cases. When you ask it to generate tests, the output is often mediocre. It covers the happy path and the obvious failure modes and stops there. But reading mediocre test output made me argue with it, and arguing made me sharper about what the code actually needed to handle. Using the tool adversarially, against its grain, turned out to be one of the more productive things I did with it.

## Does AI-assisted coding make you feel less ownership of your code?

Yes, at least for me. The feeling showed up about four months in, while I was reviewing my own work the next morning. The code wasn't bad. What bothered me was good code I couldn't fully account for.

I'd written something. The AI had contributed meaningfully to several functions. Sitting there reading it back, I couldn't always tell which parts I'd thought through carefully and which parts I'd accepted because they looked plausible and I was moving fast. The code wasn't bad. It was often quite clean. But my relationship to it was different. There was less certainty about the *why* behind specific choices, because some of those choices had happened in a kind of flow state where evaluation and generation were running at the same speed.

Most productivity surveys ask about speed and output volume. They don't ask what happens to your sense of ownership over time, or whether you still feel like the author of something you built quickly. The [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/ai) found that 76% of developers were using or planned to use AI tools (62% were already using them, up from 44% the year before), yet only 43% said they trusted the accuracy of AI output. The survey questions focused almost entirely on speed and code quality, not on how the work *felt* from the inside.

I'm not saying AI diminished my craft. The craft moved upstream. It relocated into prompting carefully, into evaluating outputs skeptically, into knowing which suggestions to reject immediately and which to accept without touching. That is genuinely interesting work. But it is different work than sitting down with a blank file and building something from first principles.

## Does AI pair programming improve code quality?

Not reliably. It raises the floor on routine code, with better names, more consistent patterns and fewer skipped tests. But the largest independent study found Copilot users shipped about 41% more bugs, and AI output still misses novel constraints, business-logic edge cases and decisions that depend on knowing what a codebase was meant to become.

The model is very good at producing code that *looks* correct. It follows conventions, uses appropriate patterns, handles the obvious cases. What it reliably fails at is the weird stuff: the constraint buried in a footnote of the library docs, the edge case that only manifests when two systems interact in a specific order, the decision that depends on knowing what this codebase was *supposed* to become rather than what it currently is. Context it doesn't have. Judgment it can't fake. GitClear's analysis of 153 million changed lines points the same way: code churn, meaning lines reverted or rewritten within two weeks of being authored, was on track to double in 2024 against its 2021 pre-Copilot baseline ([GitClear, 2024](https://www.gitclear.com/coding_on_copilot_data_shows_ais_downward_pressure_on_code_quality)).

What I found more interesting is what the AI inadvertently fixed about my bad habits. I used to delay writing tests because writing tests was slow and the task already felt done. That excuse is mostly gone. I used to let mediocre variable names sit in early drafts because naming things is friction and I'd come back to it later. The AI is genuinely better at naming than I am at my worst, so that particular source of friction just disappeared.

Some bad habits were sustained entirely by the effort they'd take to correct. Remove the effort, the habits go with them. That's an underrated benefit and it took me several months to notice it was happening.

Being less exhausted by the boring parts also means more attention left for the parts that actually need it. That's my experience, but the data doesn't cleanly back it up, and I'd rather say so than cherry-pick. [Uplevel's 2024 study](https://uplevelteam.com/blog/ai-for-developer-productivity) tracked roughly 800 developers before and after Copilot access. It found a 41% higher bug rate among Copilot users and no significant improvement in PR cycle time or throughput. Its burnout proxy, time spent working outside normal hours, fell for both groups, but less for Copilot users (17%) than for developers without it (28%). **Feeling lighter while shipping more bugs is exactly the trade you don't notice until someone measures it.** That's why I now review AI-assisted code as if a stranger wrote it: the energy I saved is only worth something if I spend it on that review.

## What doesn't AI pair programming speed up?

The decisions that actually matter. After a full year of AI assistance, they took the same amount of time, sometimes longer. How much code I wrote per hour changed a lot. How many hard decisions each piece of code needed didn't change at all.

Deciding how to structure a complex feature before writing a line of code. Figuring out why production is behaving differently than staging when the code is identical. Understanding a user complaint well enough to trace it to the real cause in the system, rather than the surface-level symptom they described. Reading a codebase you didn't write and forming an accurate mental model of what it's doing versus what it was intended to do.

None of this got faster. Some of it got marginally harder, because more of the surrounding code now gets written quickly, which means there is more code to read. The ratio of code-written to time-spent shifted significantly. The ratio of complex-decisions-needed to code-written did not.

I also found the AI made me lazier about documentation, which is a debt I'm still paying down. When you can generate a function in thirty seconds, the instinct to explain why you're generating it weakens. Future me and future collaborators read code to understand intent. The model writes code without the context that created the need for it. That gap doesn't close itself, and I underestimated how much it would accumulate.

There's a version of this problem that shows up in code reviews too. A function that looks sensible in isolation can be wrong for reasons that live entirely in the product decisions made six months ago. The AI doesn't know about those decisions. It can't. So the judgment layer, the part of a developer that holds the full context of what you're building and why, that part stays entirely yours.

## Is AI pair programming worth it?

For translation work, where you already know what you need and are just turning it into syntax, yes. As a thinking partner on genuinely novel problems, no, because confident, fluent output is not the same as correct output.

Learn to read AI-generated code with the same skepticism you'd apply to a capable but context-free contractor who's never seen your codebase before. And watch what happens to your relationship to authorship over time, because it will change in ways that won't show up in your commit history.

The speed is real. The cognitive offload on repetitive work is real. But so is the gradual quieting of the muscle that used to build things slowly from first principles. I notice it most when I sit down to work without AI access, which happens occasionally. The blank-file anxiety that had gone dormant comes back slightly stronger than before.

I'm faster now. I'm also less certain of some things I used to feel sure about. Whether that trade is worth it probably depends on what you were building, and who you were trying to become while building it. For me, working in Dhaka, running a small team, trying to ship things that matter on a budget that doesn't allow for waste, the speed has been worth it. But I don't think it's been free.

---

**Further reading:** [GitHub's research on Copilot and developer productivity (2022)](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/) on the 55% speed finding. [Google's 2024 DORA report](https://dora.dev/research/2024/dora-report/) on the productivity-versus-stability tradeoff. [METR's 2025 study of experienced open-source developers](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) on the 19% slowdown and the gap between perceived and measured speed. [Stack Overflow Developer Survey 2024](https://survey.stackoverflow.co/2024/ai) on AI tool adoption and trust among developers. [Uplevel's 2024 study of Copilot users](https://uplevelteam.com/blog/ai-for-developer-productivity) on the 41% higher bug rate with no measurable throughput gain. [GitClear's 2024 code quality analysis](https://www.gitclear.com/coding_on_copilot_data_shows_ais_downward_pressure_on_code_quality) on code churn in the AI era.