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

    const timer = setTimeout(() => { child.kill(); reject(new Error('Quality check timed out')) }, 120_000)

    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(`Claude exited ${code}`))
      else resolve(stdout)
    })
    child.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

const QUALITY_PROMPT = (content) => `You are a content quality evaluator for a personal blog (robatdasorvi.com). Score this article on three dimensions. Be strict — most content scores 6–7. Only genuinely excellent content earns 8.5+.

SCORING DIMENSIONS:

SEO (Search Engine Optimisation):
- Title is specific and matches a real search query people type
- Meta description is compelling, under 160 chars, includes keyword
- H2 headings are natural questions people actually search
- Body is 1300+ words with real depth, not filler
- 2–3 real external citations with actual working URLs
- No keyword stuffing, no thin sections

AEO (Answer Engine Optimisation):
- Each H2 question is followed by a direct, clear answer in the first 1–2 sentences
- Content would work as a featured snippet source
- Specific facts, numbers, or positions stated clearly
- A reader can skim and extract answers without reading every word

GEO (Generative Engine Optimisation):
- Authoritative first-person voice with genuine opinions
- Content is quotable — has specific, memorable sentences
- Factual claims backed by citations
- Structured so an AI system can extract clear Q&A pairs
- No vague hedging like "it depends" without explanation

CONTENT TO EVALUATE:
${content.slice(0, 8000)}

Respond with ONLY valid JSON, no explanation, no markdown:
{
  "seo": <number 1-10>,
  "aeo": <number 1-10>,
  "geo": <number 1-10>,
  "average": <number 1-10>,
  "pass": <true if average >= 8.5, else false>,
  "weakest": "<the single weakest dimension: seo, aeo, or geo>",
  "fix": "<one specific actionable sentence on what would most improve the score>"
}`

export async function qualityCheck(content) {
  const raw = await runClaude(QUALITY_PROMPT(content))

  // Extract JSON from response
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Quality check returned no JSON')

  const result = JSON.parse(match[0])

  // Recalculate average in case Claude rounded oddly
  result.average = Math.round(((result.seo + result.aeo + result.geo) / 3) * 10) / 10
  result.pass = result.average >= 8.5

  return result
}
