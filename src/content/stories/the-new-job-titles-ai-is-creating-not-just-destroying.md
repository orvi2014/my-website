---
title: "New Job Titles AI Is Creating, Not Just Destroying"
description: "AI is killing jobs and creating stranger ones. Here are the new AI job titles paying real salaries in 2026 that didn't exist three years ago, and which roles will last."
pubDate: 2026-05-23
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["ai jobs", "future of work", "prompt engineering", "ai automation", "job creation", "llm", "career", "ai roles", "ai job titles 2026", "rag engineer", "ai evaluator"]
featured: false
---

Last week someone in a Dhaka tech group I follow posted a salary breakdown for an "LLM Evaluation Specialist" role at a London-based AI company. Remote-friendly, $70,000–$90,000 base. The replies were mostly confusion. What does that person actually do all day? A few years ago that question would have made sense because the job didn't exist. Now it does, and the pay is real, and I've been watching a whole category of work like it emerge while the public conversation stays stuck on what AI is taking away.

That conversation matters. Displacement is real. A copywriter losing freelance work to GPT-4 is not a hypothetical, and I'm not going to pretend the net effect of AI on employment is some simple positive number. But there's a second story that gets almost no oxygen: the specific new roles that companies are actively hiring for right now, which require skills that weren't on any job board in 2021. Those roles are what I want to think through here, because they're the ones people I know are actually trying to get into.

I've been building software from Dhaka for over a decade, so I've watched technology waves arrive with both the hype and the dislocation they carry. When e-commerce scaled in Bangladesh, logistics and payments work grew faster than retail work shrank. The net math on AI is probably similarly complicated. The roles below are part of that complication.

## What does the actual data say about AI job creation?

The data points to net job creation, not collapse. The World Economic Forum's Future of Jobs Report 2025 projects that structural forces including AI will create roughly 170 million new jobs globally by 2030 while displacing about 92 million — a net gain of around 78 million, assuming displaced workers can actually make the transition. The same report ranks AI and machine learning specialists among the fastest-growing roles of the decade. That transition assumption carries most of the weight in the analysis, and it's not a given. Transitions are expensive, uneven, and heavily dependent on geography and access to retraining. But the 170 million figure rarely gets treated with the same urgency as the 92 million, and that asymmetry shapes how people plan their careers. The full report is at [weforum.org/publications/the-future-of-jobs-report-2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/).

What I've been tracking separately are the specific titles showing up on job boards with real headcount behind them, not think-piece speculation. The list below comes from that tracking, plus conversations with people who hold these jobs.

## Which new AI roles are gaining real traction?

Six new AI roles are gaining real traction in 2026: RAG engineer, AI evaluator (LLM quality assessor), AI red teamer, synthetic data engineer, human-AI interaction designer, and AI product manager. Each one has actual job postings, actual salary ranges, and actual teams behind it — these aren't titles from LinkedIn thought leaders.

RAG Engineer. As companies moved past "let's bolt GPT onto our website," they discovered that getting language models to reliably answer questions using their own private documents was genuinely hard. Retrieval-Augmented Generation systems involve embedding documents, building vector databases, and designing retrieval pipelines that affect how accurately the model answers. People who understand both the infrastructure side and how LLMs process retrieved context are in short supply. I know developers in Southeast Asia doing remote contracts specifically for this work, not because they got lucky but because they invested in the technical depth before it became a crowded skill.

AI Evaluator / LLM Quality Assessor. Every model that ships goes through rounds of human evaluation. Someone has to sit with outputs, score them against rubrics, flag failure modes, and help companies understand where their fine-tuned models are drifting. The London job I mentioned at the start of this piece is this role. Companies like Scale AI and Surge AI employ thousands of people globally in this function. The interesting constraint is that it requires genuine domain expertise: a medical AI evaluator needs to understand clinical workflows, not just grade sentences. That domain requirement is what keeps this role from being fully automated, at least for now.

AI Red Teamer. Security teams now include people whose job is to try to break AI systems: jailbreak them, extract training data, find prompt injection vulnerabilities, probe for bias in ways that could create legal exposure. This is a natural extension of traditional penetration testing applied to a new attack surface. MIT's Work of the Future research group has been tracking the emergence of AI-adjacent security roles specifically, and the red teaming function shows up repeatedly in their findings at [workofthefuture.mit.edu](https://workofthefuture.mit.edu).

Synthetic Data Engineer. Training good models requires training data, and increasingly that data is generated rather than scraped from the real world. Privacy regulations make scraped data legally complicated; synthetic data sidesteps some of those constraints. Someone has to design the generation pipelines, the quality filters, and the validation approaches to make synthetic data actually useful for model training. This is a full engineering discipline now, not a supporting function inside some other role.

Human-AI Interaction Designer. This isn't UX design for chatbots. It's people who understand how trust forms between users and AI outputs, where people over-rely on model suggestions versus staying appropriately skeptical, and what interface decisions cause harm that only shows up after deployment. The LinkedIn Economic Graph team has been tracking this as one of the faster-growing roles in the design category. Their research is publicly available at [economicgraph.linkedin.com](https://economicgraph.linkedin.com).

AI Product Manager. Product management has existed for decades, but AI PMs have a specific responsibility that general PMs don't: understanding what a model can and cannot do, setting user expectations accurately, deciding when a feature needs a human fallback, and navigating the difference between "the model gets this right 95% of the time" and "the model needs to be right 99.9% of the time." That gap matters enormously depending on whether you're building a recipe tool or a medical triage feature. The PM who can hold that distinction clearly is not the same person as a PM who just knows Agile.

## Why is this wave different from previous automation cycles?

This wave is different because it targets cognitive work rather than routine physical labor, and the ceiling on which cognitive tasks still need human oversight turns out to be higher than anyone forecast. Previous automation waves mostly targeted routine physical tasks: manufacturing work, data entry, scripted call center scripts. AI targets cognitive tasks, but the more capable the AI, the more important it becomes to have humans who can evaluate it, direct it, and catch its specific failure modes. Oversight scales with capability, which is counterintuitive.

There's also a multiplication effect I didn't expect. AI adoption has gone mainstream fast — McKinsey's 2025 State of AI survey found that 78% of organizations now use AI in at least one business function, up from 55% a year earlier ([mckinsey.com](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)), and every one of those deployments needs people to build, evaluate, and supervise it. When one developer can ship what a team of ten used to ship, you'd think demand for developers would drop. What actually happened in the product-building communities I move in is that the bar for what a small team could attempt rose dramatically. Projects that would have been too expensive for a bootstrapped founder to build are now viable, so more of them get started, and they all need builders. Demand went up, not down.

This doesn't mean everyone benefits. It means the people who adapt their skill set toward working with AI systems rather than competing against them are in a better position than people waiting for the old job market to return.

## Does geography determine who gets access to these roles?

Not entirely — geography matters less than it used to and more than the optimists want to admit. This is the question I think about most honestly, because the people asking me about this are mostly in Dhaka, Nairobi, Manila, not in San Francisco.

Remote work normalization means an AI evaluator in Dhaka can genuinely work for a company in London. The RAG engineer doing contract work from Nairobi is real, not hypothetical. But the high-trust, high-judgment roles, the ones that compound into careers rather than gig income, still tend to cluster around networks, and those networks remain geographically concentrated.

What I've observed is that the path in from the periphery almost always runs through demonstrable work. Not credentials, not institutional prestige, but actual shipped products, actual public evaluations, actual open-source contributions to AI tooling. The barrier to producing that kind of portfolio has dropped enough that it's genuinely possible without institutional access. Whether it's sufficient to overcome network gaps is a different and harder question.

## Which of these roles are here to stay?

Not all of them — the durable roles are the ones tied to oversight, trust, and domain expertise: AI red teamers, AI evaluators, and human-AI interaction designers. "Prompt Engineer" as a standalone title is already being absorbed into every other role, the same way "knows how to use Google" stopped being a distinguishing skill on a resume.

Red teamers aren't going away as long as AI systems are deployed in contexts where getting it wrong carries legal or physical consequences. That's a large and growing list of contexts. AI evaluators will evolve, but the function of applying human judgment to model outputs isn't going to disappear, because the cost of not doing it is too high for the companies that get it wrong publicly.

Human-AI interaction design is going to get more rigorous, not less, as more products reach market and companies learn what actually causes harm versus what merely looked bad in a demo.

The roles I'd bet against are the ones that exist because the model currently can't do something. Wherever the model improves enough, that job shrinks. The roles I'd bet on are the ones where humans provide signal the model can't generate for itself: domain expertise, ethical judgment, cultural context, accountability for outcomes. These are the roles where being human is actually load-bearing, not just a historical artifact of the current capability ceiling.

---

The narrative that AI destroys jobs is accurate but incomplete. It's the half that triggers anxiety, so it gets the most airtime. I'm not trying to argue that everything works out fine, because displacement is real and the transitions are genuinely hard and unevenly distributed.

But I'd rather spend my energy on the new map than mourning the old one. The new titles are strange. The career paths are non-linear. Nobody has a clean ten-year plan. That feels about right, honestly. That matches how every previous technology wave actually landed when you were inside it, not reading about it afterward.