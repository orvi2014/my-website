import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateStory } from './generate.js'
import { qualityCheck } from './quality.js'
import { runImprovementCycle } from './improver.js'
import { sendForReview, startPolling } from './telegram.js'
import { getNextTopic } from './topics.js'
import { readState, writeState } from './state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRAFTS_DIR = path.join(__dirname, 'drafts')
const PID_FILE = path.join(__dirname, 'bot.pid')

const GENERATE_INTERVAL_MS = 60 * 60 * 1000  // 1 article per hour
const IMPROVE_EVERY_N = 6                      // improve existing content every 6th cycle
const MAX_QUALITY_ATTEMPTS = 3

// ── Single-instance lock ──────────────────────────────────────────────────────
if (fs.existsSync(PID_FILE)) {
  const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim())
  try {
    process.kill(oldPid, 0)
    console.error(`[bot] Already running as PID ${oldPid}. Exiting.`)
    process.exit(0)
  } catch { /* stale PID — overwrite */ }
}
fs.writeFileSync(PID_FILE, String(process.pid))
process.on('exit', () => { try { fs.unlinkSync(PID_FILE) } catch {} })
process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))

fs.mkdirSync(DRAFTS_DIR, { recursive: true })

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

process.on('uncaughtException', err => console.error('[bot] Uncaught:', err.message))
process.on('unhandledRejection', err => console.error('[bot] Unhandled:', err?.message))

// ── Generate one article, quality-gate it, send to Telegram ──────────────────
async function generateAndSend() {
  const state = readState()
  let topic = getNextTopic(state.usedTopics)

  if (!topic) {
    console.log('[bot] All topics used — cycling')
    state.usedTopics = []
    writeState(state)
    topic = getNextTopic([])
  }

  console.log(`[bot] Generating: "${topic.title}"`)

  let content
  let qualityResult

  for (let attempt = 1; attempt <= MAX_QUALITY_ATTEMPTS; attempt++) {
    try {
      content = await generateStory(topic)
    } catch (err) {
      console.error(`[bot] Generation attempt ${attempt} failed:`, err.message)
      if (attempt === MAX_QUALITY_ATTEMPTS) return
      continue
    }

    try {
      qualityResult = await qualityCheck(content)
      console.log(`[bot] Quality (attempt ${attempt}): SEO=${qualityResult.seo} AEO=${qualityResult.aeo} GEO=${qualityResult.geo} avg=${qualityResult.average} pass=${qualityResult.pass}`)
    } catch (err) {
      console.error('[bot] Quality check error:', err.message)
      qualityResult = { pass: true, seo: '?', aeo: '?', geo: '?', average: '?' }
    }

    if (qualityResult.pass) break

    console.log(`[bot] Failed quality (${qualityResult.average}/10) — ${qualityResult.fix}`)
    if (attempt === MAX_QUALITY_ATTEMPTS) {
      console.log(`[bot] Skipping "${topic.title}" after ${MAX_QUALITY_ATTEMPTS} failed attempts`)
      const s = readState()
      s.usedTopics.push(topic.key)
      writeState(s)
      return
    }
  }

  const slug = toSlug(topic.title)
  const draftPath = path.join(DRAFTS_DIR, `${slug}.md`)
  fs.writeFileSync(draftPath, content)

  try {
    await sendForReview(topic, content, slug, draftPath, qualityResult)
  } catch (err) {
    console.error('[bot] Telegram send failed:', err.message)
    return
  }

  const freshState = readState()
  freshState.usedTopics.push(topic.key)
  writeState(freshState)

  console.log(`[bot] Sent: ${slug} (${qualityResult.average}/10)`)
}

// ── Main loop — 1 article/hour, improvement every 6th cycle ──────────────────
async function mainLoop() {
  let cycle = 0

  while (true) {
    cycle++

    if (cycle % IMPROVE_EVERY_N === 0) {
      console.log(`[bot] Cycle ${cycle} — running improvement pass on existing content`)
      try {
        await runImprovementCycle(sendForReview)
      } catch (err) {
        console.error('[bot] Improvement cycle error:', err.message)
      }
    } else {
      await generateAndSend()
    }

    console.log(`[bot] Sleeping 1 hour until next cycle`)
    await new Promise(r => setTimeout(r, GENERATE_INTERVAL_MS))
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('[bot] Content bot started — 1 article/hour, quality gate 8.5/10, improvement every 6th cycle')
console.log(`[bot] Telegram chat: ${process.env.TELEGRAM_CHAT_ID}`)

startPolling()
mainLoop()
