---
title: "The Developer Tools I Actually Use in 2026 (And Why Most Lists Like This Are Wrong)"
description: "Every developer tools list is either a sponsored post or an everything-I-could-think-of dump. This is the actual stack I use daily — with the honest reason for each one."
pubDate: 2026-05-16
category: "technology"
author: "Orvi"
readingTime: 6
tags: ["developer tools", "productivity", "2026", "Claude Code", "Cursor", "tools", "software development", "tech stack", "developer productivity", "browser extensions"]
featured: false
---

Most developer tools lists are wrong in the same way. They include everything the author has ever opened, sorted by memorability rather than usefulness. They read as proof of awareness rather than as guides to what actually changes how you work.

I am going to try to write a different kind of list. Shorter. Harder to pad because I will say why each thing earns its place. These are the tools I open every day and would feel the loss of if they disappeared.

---

## The Terminal: Claude Code

The biggest shift in my workflow over the past eighteen months has been moving from a text editor with AI features to running [Claude Code](https://claude.ai/code) from the CLI. The distinction matters.

An AI feature in a text editor responds to the file you have open. Claude Code carries the full context of a codebase — the architecture decisions, the constraints, the patterns you have established across files. When I describe what needs to exist, the agent understands not just the code but the system. The difference between these two is the difference between asking someone to write a paragraph and asking someone who has read the whole book to write the next chapter.

I run multiple instances in parallel — one per active project. This works because the context-per-project model means each agent stays grounded in its specific codebase. It is not fast typing. It is a fundamentally different working relationship.

---

## The Browser: ClassCatch

I built [ClassCatch](https://robatdas.gumroad.com/l/classcatch) because I kept doing the same tedious task: inspecting an element, reading the computed CSS, translating it back to Tailwind utilities by hand. The extension does this automatically — click an element, copy its Tailwind classes. Or paste arbitrary CSS and get the Tailwind equivalent back.

I know this sounds narrow. It is narrow. That is why it works. The best tools solve one specific problem completely rather than many problems halfway. ClassCatch has one job and it does it every time without asking me to configure anything.

I have used it almost every working day since I built it. Tools you build for yourself tend to fit exactly because you built them for yourself.

---

## The Editor: Cursor

I use [Cursor](https://cursor.sh) for the cases where I want to be in a file rather than directing an agent — reading code, making surgical edits, reviewing what the agent produced. The multi-file context and inline AI features are genuinely good. The diff view for AI-suggested changes is the feature I would miss most if it disappeared.

The honest thing to say about Cursor is that its value is highest in the review phase, not the generation phase. When the agent has built something and I am evaluating it, Cursor's ability to navigate quickly and annotate what I am seeing is exactly what I need. When I am building from scratch, Claude Code in the terminal does more.

---

## Note-taking: Plain Text

I have tried every notes app. I have been persuaded by Notion, Obsidian, Bear, and several others. I keep returning to plain text files in a folder.

The reason is not that plain text is better. It is that the friction of opening a complex notes app — even the small friction — adds up to a specific kind of avoidance. I stop writing things down. Plain text files are always available, always readable, never require me to manage a database or sync architecture. The lack of features is the feature.

I use one folder. I use dated file names. I search with grep when I need to find something. This has been true for three years and I expect it to remain true.

---

## Project Management: Nothing

This is the honest entry.

I do not use a project management tool for my own work. I have used [OneThread](https://onethread.app) — which I co-created — for team projects and it is good for exactly the use case it was designed for: calm, focused team coordination without the overhead of enterprise PM tools.

For solo work, I use a text file. Daily tasks, one line each. Cross them out when done. Archive the file at the end of the month. The ritual is the point — the daily review of what I said I would do and what I actually did is more valuable than any Kanban board feature I have encountered.

---

## Communication: Asynchronous by Default

This is less a tool and more a policy, but it shapes everything.

I do not have Slack open during focused work. I respond to messages in batches. I do not attend meetings I can read the notes from. These decisions have, more than any specific tool, changed the quality of my work.

[Research on context switching](https://www.ics.uci.edu/~gmark/chi08-mark.pdf) from the University of California Irvine found that it takes an average of 23 minutes to return to a task after an interruption. Most people experience dozens of interruptions per day, which means most people never actually work — they repeatedly re-approach work. The tool is not the solution here. The policy is.

---

## What's the Real Answer to Any Tools List?

The honest version of any tools list is this: the tool matters less than the discipline around using it. Every tool I listed above has a version that would hurt rather than help — Claude Code for people who cannot evaluate its output, ClassCatch for people who never learned what Tailwind does, Cursor for people using autocomplete as a substitute for understanding.

The question is not what tools to use. The question is what problem you are actually trying to solve and whether you have the judgment to evaluate whether the tool is solving it. That judgment cannot be installed by any extension or app.

But ClassCatch comes close.

