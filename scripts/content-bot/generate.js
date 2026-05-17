import { spawn } from 'child_process'

const CLAUDE_BIN = '/Users/orvi/.local/bin/claude'

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, ['-p', prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    child.stdin.end()

    let stdout = ''
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', () => {})

    const timer = setTimeout(() => { child.kill(); reject(new Error('Claude timed out')) }, 240_000)

    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(`Claude exited ${code}`))
      else resolve(stdout)
    })
    child.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function buildPrompt(topic) {
  return `Write a complete, deeply researched blog post for robatdasorvi.com. Output ONLY raw markdown starting with ---. No preamble.

CATEGORY: ${topic.category}
TARGET SEARCH QUERY: "${topic.query}"
TITLE: "${topic.title}"

HARD RULES — every single one must be met:

OPENING:
- First sentence drops the reader into the middle of the idea — no setup, no biography, no "I grew up in Bangladesh / I live in Dhaka". Kafka's method: the situation is already underway.
- First paragraph must contain the core insight of the entire piece

RESEARCH & DATA:
- Minimum 3 specific statistics or study findings with the year (e.g. "A 2023 Stanford study found that 78% of...")
- Minimum 3 real external citations — actual URLs to papers, reputable journalism, or official data (not invented)
- At least one counterargument addressed and defeated with evidence

SEO:
- Target keyword appears naturally in the first 100 words
- Every H2 is a question someone actually types into Google
- Title is specific enough to rank — not generic (bad: "About Football", good: "Why Morocco Will Reach the 2026 World Cup Final")
- Meta description under 160 chars, contains keyword, creates curiosity

AEO:
- Each H2 question is immediately followed by a direct 1–2 sentence answer before elaboration
- Content structured so Google can extract it as a featured snippet
- Specific numbers, names, dates stated plainly — no vague hedging

GEO:
- Genuine first-person opinions with specific reasoning, not just summaries of what others say
- At least 2 sentences that are quotable and memorable — something an AI would pull to answer a question
- Every factual claim is supported — nothing asserted without backing

VOICE:
- First-person journal, direct and honest
- Occasionally wry — not corporate, not listicle
- No "Key Takeaways", no "Frequently Asked Questions", no bullet summaries
- End with a short punchy reflection — no call-to-action

LENGTH: 1600–2000 words

OUTPUT FORMAT — produce exactly this:
---
title: "${topic.title}"
description: "<under 160 chars, keyword included, creates curiosity>"
pubDate: ${today()}
category: "${topic.category}"
author: "Orvi"
readingTime: <integer>
tags: [<6–9 relevant quoted strings>]
featured: false
---

<body>`
}

function buildRevisePrompt(content, instructions) {
  return `Here is a published blog post. Make ONLY the specific change described. Do not rewrite, restructure, or touch anything else — every other word stays exactly as written.

CHANGE REQUESTED: ${instructions}

BLOG POST:
${content}

Output ONLY the full revised markdown starting with ---, with just the requested change applied.`
}

function buildImprovePrompt(content, weaknesses) {
  return `This blog post needs improvement in specific areas. Improve ONLY those areas — preserve all voice, opinions, and structure elsewhere.

WEAKNESSES TO FIX:
${weaknesses}

IMPROVEMENT RULES:
- Add real statistics with year and source where data is missing
- Restructure any H2 that is not a genuine question someone Googles
- Ensure each H2 question has a direct 1–2 sentence answer immediately after it
- Add citations (real URLs) where claims are unsupported
- Do NOT change the opening, the personal voice, or any section that isn't a weakness
- Do NOT add "Key Takeaways" or FAQ sections
- Keep Kafka-style opening intact

BLOG POST:
${content}

Output ONLY the full improved markdown starting with ---.`
}

export async function generateStory(topic) {
  const raw = await runClaude(buildPrompt(topic))
  const idx = raw.indexOf('---')
  if (idx === -1) throw new Error('No frontmatter in Claude output')
  return raw.slice(idx).trim()
}

export async function reviseStory(content, instructions) {
  const raw = await runClaude(buildRevisePrompt(content, instructions))
  const idx = raw.indexOf('---')
  if (idx === -1) throw new Error('No frontmatter in Claude output')
  return raw.slice(idx).trim()
}

export async function improveStory(content, weaknesses) {
  const raw = await runClaude(buildImprovePrompt(content, weaknesses))
  const idx = raw.indexOf('---')
  if (idx === -1) throw new Error('No frontmatter in Claude output')
  return raw.slice(idx).trim()
}

export async function generateFromContent(userContent, category = 'human') {
  const prompt = `The author has provided raw notes or ideas. Shape them into a complete, researched blog post for robatdasorvi.com. Preserve every insight and opinion the author gave — do not invent their positions. Add research, data, and citations around their ideas.

AUTHOR'S CONTENT:
${userContent}

CATEGORY: ${category}

Apply all of these hard rules:
- Kafka opening: first sentence drops into the idea already underway. No biography, no "I grew up in Bangladesh".
- Minimum 3 real statistics with year and source
- Minimum 3 real external citations with actual working URLs
- Every H2 is a question someone Googles, followed immediately by a direct answer
- 1600–2000 words
- No Key Takeaways, no FAQ, no bullet summaries
- End with short punchy reflection, no call-to-action

Output ONLY raw markdown starting with ---:
---
title: "<derive from the content, specific enough to rank>"
description: "<under 160 chars>"
pubDate: ${today()}
category: "${category}"
author: "Orvi"
readingTime: <integer>
tags: [<relevant tags>]
featured: false
---

<body>`
  const raw = await runClaude(prompt)
  const idx = raw.indexOf('---')
  if (idx === -1) throw new Error('No frontmatter in Claude output')
  return raw.slice(idx).trim()
}
