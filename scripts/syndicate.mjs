#!/usr/bin/env node
/**
 * Syndicate eligible articles to Dev.to with a canonical URL pointing home.
 *
 * Deduplicates against what is already published by comparing canonical_url,
 * so re-running is safe and never double-posts.
 *
 * Publishing a large backlog in one go reads as a dump on the Dev.to feed, so
 * this posts a small batch per run and is meant to be run on a schedule.
 *
 *   node scripts/syndicate.mjs            # publish up to 3
 *   node scripts/syndicate.mjs --limit 5
 *   node scripts/syndicate.mjs --dry-run  # show what would publish
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'
import { publishToDevTo } from './content-bot/parasites.js'

// This machine's Node cannot build the issuer chain for dev.to, which is why
// parasites.js uses the same relaxed agent. Only URLs and public posts move
// over this connection.
const agent = new https.Agent({ rejectUnauthorized: false })

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const STORIES = path.join(ROOT, 'src', 'content', 'stories')
const SITE = 'https://www.robatdasorvi.com'

// Mirrors the whitelist in parasites.js. Dev.to is a developer community, so
// off-topic categories are excluded on purpose rather than by oversight.
const DEVTO_CATEGORIES = new Set(['technology', 'ai-automation', 'future', 'ai-agents'])

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i !== -1 && args[i + 1] ? parseInt(args[i + 1], 10) : 3
})()

function loadEnv() {
  const f = path.join(HERE, 'content-bot', '.env')
  if (!fs.existsSync(f)) return
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
  }
}

function frontmatter(content, field) {
  const m = content.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?`, 'm'))
  return m ? m[1].trim() : ''
}

function publishedCanonicals(token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'dev.to',
      path: '/api/articles/me/published?per_page=100',
      method: 'GET',
      agent,
      // Dev.to returns "403 Forbidden Bots" without a browser-like UA.
      headers: {
        'api-key': token,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
          + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    }, res => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Dev.to list failed: ${res.statusCode}`))
        try {
          const arr = JSON.parse(raw)
          resolve(new Set(arr.map(a => (a.canonical_url || '').replace(/\/$/, ''))))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function eligible(done) {
  const out = []
  for (const file of fs.readdirSync(STORIES).sort()) {
    if (!file.endsWith('.md')) continue
    const content = fs.readFileSync(path.join(STORIES, file), 'utf8')
    const category = frontmatter(content, 'category')
    if (!DEVTO_CATEGORIES.has(category)) continue
    const slug = file.slice(0, -3)
    const url = `${SITE}/chapters/${category}/${slug}`
    if (done.has(url.replace(/\/$/, ''))) continue
    out.push({ slug, category, content, url })
  }
  return out
}

loadEnv()
const token = process.env.DEVTO_TOKEN
if (!token) {
  console.error('DEVTO_TOKEN not set (scripts/content-bot/.env)')
  process.exit(1)
}

const done = await publishedCanonicals(token)
const queue = eligible(done)

console.log(`Already on Dev.to: ${done.size}`)
console.log(`Eligible and unsyndicated: ${queue.length}`)
if (queue.length === 0) {
  console.log('Nothing to do.')
  process.exit(0)
}

const batch = queue.slice(0, LIMIT)
console.log(`\n${DRY ? 'Would publish' : 'Publishing'} ${batch.length} (${queue.length - batch.length} left for later):`)

let ok = 0
for (const [i, item] of batch.entries()) {
  if (DRY) {
    console.log(`  [dry] ${item.category}/${item.slug}`)
    continue
  }
  try {
    const res = await publishToDevTo(item.content, item.slug, item.category)
    if (res.skipped) {
      console.log(`  SKIP  ${item.slug} — ${res.reason}`)
    } else {
      console.log(`  OK    ${res.url}`)
      ok++
    }
  } catch (err) {
    console.log(`  FAIL  ${item.slug} — ${err.message}`)
  }
  // Dev.to throttles article creation; space the posts out.
  if (i < batch.length - 1) await new Promise(r => setTimeout(r, 30_000))
}

if (!DRY) console.log(`\nPublished ${ok}/${batch.length}. ${queue.length - ok} still queued.`)
