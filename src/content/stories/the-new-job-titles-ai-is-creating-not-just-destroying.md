---
title: "New Job Titles AI Is Creating, Not Just Destroying"
description: "AI is killing jobs and creating stranger ones. Six new AI job titles paying real salaries in 2026, what each one does, and which will last."
pubDate: 2026-05-23
category: "ai-automation"
author: "Orvi"
readingTime: 10
tags: ["ai jobs", "future of work", "prompt engineering", "ai automation", "job creation", "llm", "career", "ai roles", "ai job titles 2026", "rag engineer", "ai evaluator"]
featured: false
---

Last week someone in a Dhaka tech group I follow posted a salary breakdown for an "LLM Evaluation Specialist" role at a London-based AI company. Remote-friendly, $70,000–$90,000 base. The replies were mostly confusion. What does that person actually do all day? A few years ago that question would have made sense because the job didn't exist. Now it does, and the pay is real, and I've been watching a whole category of work like it emerge while the public conversation stays stuck on what AI is taking away.

That conversation matters. Displacement is real. A copywriter losing freelance work to GPT-4 is not a hypothetical, and I'm not going to pretend the net effect of AI on employment is some simple positive number. But there's a second story that gets almost no oxygen: the specific new roles that companies are actively hiring for right now, which require skills that weren't on any job board in 2021. Those roles are what I want to think through here, because they're the ones people I know are actually trying to get into.

I've been building software from Dhaka for over a decade, so I've watched technology waves arrive with both the hype and the dislocation they carry. When e-commerce scaled in Bangladesh, logistics and payments work grew faster than retail work shrank. The net math on AI is probably similarly complicated. The roles below are part of that complication.

## Is AI creating more jobs than it destroys?

On current projections, yes: the World Economic Forum expects AI and other structural forces to create about 170 million jobs and displace about 92 million by 2030, a net gain of roughly 78 million. That only holds if displaced workers can actually move into the new roles.

The World Economic Forum's Future of Jobs Report 2025 projects that structural forces including AI will create roughly 170 million new jobs globally by 2030 while displacing about 92 million — a net gain of around 78 million, assuming displaced workers can actually make the transition. The same report ranks AI and machine learning specialists among the fastest-growing roles of the decade, and estimates that 39% of workers' core skills will change by 2030. That transition assumption carries most of the weight in the analysis, and it's not a given. Transitions are expensive, uneven, and heavily dependent on geography and access to retraining. But the 170 million figure rarely gets treated with the same urgency as the 92 million, and that asymmetry shapes how people plan their careers. The full report is at [weforum.org/publications/the-future-of-jobs-report-2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/).

The new jobs aren't only a forecast. LinkedIn's Economic Graph data, presented at Davos in January 2026, found that the global economy had already added about 1.3 million AI-related roles over the previous two years, including AI engineers, forward-deployed engineers, and data annotators ([World Economic Forum, January 2026](https://www.weforum.org/stories/2026/01/ai-has-already-added-1-3-million-new-jobs-according-to-linkedin-data/)). The demand runs in both directions: 1.3 million new AI roles already exist, and 92 million existing jobs are projected to go.

What I've been tracking separately are the specific titles showing up on job boards with real headcount behind them, not think-piece speculation. The list below comes from that tracking, plus conversations with people who hold these jobs.

## Which new AI roles are gaining real traction?

Six new AI roles are gaining real traction in 2026: RAG engineer, AI evaluator (LLM quality assessor), AI red teamer, synthetic data engineer, human-AI interaction designer, and AI product manager. Each one has actual job postings, actual salary ranges, and actual teams behind it — these aren't titles from LinkedIn thought leaders.

Pay across these six spans more than 4x, from about $45,000 at the low end of AI evaluation to over $225,000 for experienced AI product managers in the US. The salary figures below come from US aggregator data in 2026. Treat them as rough markers, because aggregators sample different postings and often disagree with each other by tens of thousands of dollars.

### RAG Engineer

**What it is:** a RAG engineer builds the systems that let a language model answer questions accurately from a company's own private documents.

**Typical pay:** $68,500–$105,000 for the middle half of US salaries, with an average of $90,511 ([ZipRecruiter, September 2026](https://www.ziprecruiter.com/Salaries/Rag-Engineer-Salary)). Senior roles at AI labs and infrastructure companies pay well above that band.

As companies moved past "let's bolt GPT onto our website," they discovered that getting language models to reliably answer questions using their own private documents was genuinely hard. Retrieval-Augmented Generation systems involve embedding documents, building vector databases, and designing retrieval pipelines that affect how accurately the model answers. People who understand both the infrastructure side and how LLMs process retrieved context are in short supply. LinkedIn lists Retrieval-Augmented Generation and vector databases among its fastest-growing skills ([LinkedIn Skills on the Rise 2026](https://www.linkedin.com/pulse/linkedin-skills-rise-2026-fastest-growing-us-linkedin-news-nujwe)). I know developers in Southeast Asia doing remote contracts specifically for this work, not because they got lucky but because they invested in the technical depth before it became a crowded skill.

### AI Evaluator / LLM Quality Assessor

**What it is:** an AI evaluator scores model outputs against rubrics, flags failure modes, and tells a company where its model is getting things wrong.

**Typical pay:** $44,500–$79,500 for the middle half of US salaries according to [ZipRecruiter (2026)](https://www.ziprecruiter.com/Salaries/Ai-Evaluator-Salary), but $99,591–$185,904 according to [Glassdoor (2026)](https://www.glassdoor.com/Salaries/ai-evaluator-salary-SRCH_KO0,12.htm). The gap is the story: generalist rating gigs sit at the bottom, and domain-expert evaluation sits at the top.

Every model that ships goes through rounds of human evaluation. Someone has to sit with outputs, score them against rubrics, flag failure modes, and help companies understand where their fine-tuned models are drifting. The London job I mentioned at the start of this piece is this role. Companies like Scale AI and Surge AI employ thousands of people globally in this function. The interesting constraint is that it requires genuine domain expertise: a medical AI evaluator needs to understand clinical workflows, not just grade sentences. That domain requirement is what keeps this role from being fully automated, at least for now. In AI evaluation, your domain expertise sets your pay more than your AI skills do.

### AI Red Teamer

**What it is:** an AI red teamer attacks AI systems on purpose to find jailbreaks, data leaks, prompt injection holes, and harmful bias before real attackers or regulators do.

**Typical pay:** $98,000–$180,000 typical range for red teamers in the US ([Glassdoor, 2026](https://www.glassdoor.com/Salaries/red-teamer-salary-SRCH_KO0,10.htm)). That figure covers red teaming in general. AI-specific titles are still too new to have a separate, reliable sample.

Security teams now include people whose job is to try to break AI systems: jailbreak them, extract training data, find prompt injection vulnerabilities, probe for bias in ways that could create legal exposure. This is a natural extension of traditional penetration testing applied to a new attack surface. The size of that surface is now documented. MIT's AI Risk Repository catalogued more than 1,600 coded AI risks across 7 domains and 23 subdomains as of its April 2025 update ([airisk.mit.edu](https://airisk.mit.edu/blog/april-2025-update-of-the-ai-risk-repository-2)), and every one of them is something a red teamer might be asked to probe.

### Synthetic Data Engineer

**What it is:** a synthetic data engineer designs pipelines that generate artificial training data, then filters and validates it so models can actually learn from it.

**Typical pay:** $114,000–$222,000 across advertised US postings ([ZipRecruiter job listings, 2026](https://www.ziprecruiter.com/Jobs/Synthetic-Data-Engineer)).

Training good models requires training data, and increasingly that data is generated rather than scraped from the real world. Privacy regulations make scraped data legally complicated; synthetic data sidesteps some of those constraints. Someone has to design the generation pipelines, the quality filters, and the validation approaches to make synthetic data actually useful for model training. This is a full engineering discipline now, not a supporting function inside some other role.

### Human-AI Interaction Designer

**What it is:** a human-AI interaction designer shapes how people trust, question, and act on AI outputs, so that users rely on the model when they should and push back when they shouldn't.

**Typical pay:** no clean salary sample exists yet because the title is so new. The nearest benchmarks run from $53,983–$97,070 for AI conversation designers to $119,173–$216,171 for interaction designers broadly ([Glassdoor AI Conversation Designer](https://www.glassdoor.com/Salaries/ai-conversation-designer-salary-SRCH_KO0,24.htm); [Glassdoor Interaction Designer](https://www.glassdoor.com/Salaries/ai-interaction-designer-salary-SRCH_IL.0,2_KO3,23.htm), 2026).

This isn't UX design for chatbots. It's people who understand how trust forms between users and AI outputs, where people over-rely on model suggestions versus staying appropriately skeptical, and what interface decisions cause harm that only shows up after deployment. LinkedIn's [Work Change Report](https://economicgraph.linkedin.com/research/work-change-report) estimates that 70% of the skills used in most jobs will change by 2030, with AI as the catalyst. Design is one of the places where that shift is easiest to see.

### AI Product Manager

**What it is:** an AI product manager decides what an AI feature should do, how accurate it needs to be, and where a human has to stay in the loop.

**Typical pay:** $153,849–$226,473 for the middle half of US salaries, with an average of $184,837 ([Glassdoor, March 2026](https://www.glassdoor.com/Salaries/product-manager-ai-salary-SRCH_KO0,18.htm)).

Product management has existed for decades, but AI PMs have a specific responsibility that general PMs don't: understanding what a model can and cannot do, setting user expectations accurately, deciding when a feature needs a human fallback, and navigating the difference between "the model gets this right 95% of the time" and "the model needs to be right 99.9% of the time." That gap matters enormously depending on whether you're building a recipe tool or a medical triage feature. The PM who can hold that distinction clearly is not the same person as a PM who just knows Agile.

## Why is this wave different from previous automation cycles?

This wave is different because it targets cognitive work rather than routine physical labor, and the ceiling on which cognitive tasks still need human oversight turns out to be higher than anyone forecast. Previous automation waves mostly targeted routine physical tasks: manufacturing work, data entry, scripted call center scripts. AI targets cognitive tasks, but the more capable the AI, the more important it becomes to have humans who can evaluate it, direct it, and catch its specific failure modes. Oversight scales with capability, which is counterintuitive.

There's also a multiplication effect I didn't expect. AI adoption has gone mainstream fast — McKinsey's 2025 State of AI survey found that 78% of organizations now use AI in at least one business function, up from 55% a year earlier ([mckinsey.com](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)), and every one of those deployments needs people to build, evaluate, and supervise it. When one developer can ship what a team of ten used to ship, you'd think demand for developers would drop. What actually happened in the product-building communities I move in is that the bar for what a small team could attempt rose dramatically. Projects that would have been too expensive for a bootstrapped founder to build are now viable, so more of them get started, and they all need builders. Demand went up, not down.

This doesn't mean everyone benefits. It means the people who adapt their skill set toward working with AI systems rather than competing against them are in a better position than people waiting for the old job market to return.

## Can you get these AI jobs remotely from outside the US or Europe?

Yes for many of them, especially evaluation and RAG contract work, but geography still limits the senior, high-trust roles. It matters less than it used to and more than the optimists want to admit. This is the question I think about most honestly, because the people asking me about this are mostly in Dhaka, Nairobi, Manila, not in San Francisco.

Remote work normalization means an AI evaluator in Dhaka can genuinely work for a company in London. The RAG engineer doing contract work from Nairobi is real, not hypothetical. But the high-trust, high-judgment roles, the ones that compound into careers rather than gig income, still tend to cluster around networks, and those networks remain geographically concentrated.

What I've observed is that the path in from the periphery almost always runs through demonstrable work. Not credentials, not institutional prestige, but actual shipped products, actual public evaluations, actual open-source contributions to AI tooling. The barrier to producing that kind of portfolio has dropped enough that it's genuinely possible without institutional access. Whether it's sufficient to overcome network gaps is a different and harder question.

## Which of these roles are here to stay?

Not all of them — the durable roles are the ones tied to oversight, trust, and domain expertise: AI red teamers, AI evaluators, and human-AI interaction designers. "Prompt Engineer" as a standalone title is already being absorbed into every other role, the same way "knows how to use Google" stopped being a distinguishing skill on a resume.

Red teamers aren't going away as long as AI systems are deployed in contexts where getting it wrong carries legal or physical consequences. That's a large and growing list of contexts. AI evaluators will evolve, but the function of applying human judgment to model outputs isn't going to disappear, because the cost of not doing it is too high for the companies that get it wrong publicly.

Human-AI interaction design is going to get more rigorous, not less, as more products reach market and companies learn what actually causes harm versus what merely looked bad in a demo.

The roles I'd bet against are the ones that exist because the model currently can't do something. Wherever the model improves enough, that job shrinks. The roles I'd bet on are the ones where humans provide signal the model can't generate for itself: domain expertise, ethical judgment, cultural context, accountability for outcomes. These are the roles where being human is actually load-bearing, not just a historical artifact of the current capability ceiling. A job that fills a gap in what the model can do will shrink as the model improves. A job that holds someone accountable for the model's output will grow along with it.

---

The narrative that AI destroys jobs is accurate but incomplete. It's the half that triggers anxiety, so it gets the most airtime. I'm not trying to argue that everything works out fine, because displacement is real and the transitions are genuinely hard and unevenly distributed.

But I'd rather spend my energy on the new map than mourning the old one. The new titles are strange. The career paths are non-linear. Nobody has a clean ten-year plan. That feels about right, honestly. That matches how every previous technology wave actually landed when you were inside it, not reading about it afterward.