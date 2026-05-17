#!/usr/bin/env node
/**
 * One-shot backlink blast — publishes all existing stories to Medium, Dev.to, Hashnode.
 * Run once after setting MEDIUM_TOKEN, DEVTO_TOKEN, HASHNODE_TOKEN (+ HASHNODE_PUBLICATION_ID).
 *
 * Usage:
 *   MEDIUM_TOKEN=xxx DEVTO_TOKEN=yyy HASHNODE_TOKEN=zzz HASHNODE_PUBLICATION_ID=ppp \
 *     node scripts/blast-backlinks.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { publishToParasites } from './content-bot/parasites.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORIES_DIR = path.resolve(__dirname, '../src/content/stories')

function fm(content, field) {
  const m = content.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?`, 'm'))
  return m ? m[1].trim() : ''
}

const files = fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.md'))

console.log(`Found ${files.length} stories to publish\n`)

let passed = 0, failed = 0

for (const file of files) {
  const slug = file.replace(/\.md$/, '')
  const content = fs.readFileSync(path.join(STORIES_DIR, file), 'utf8')
  const category = fm(content, 'category') || 'human'
  const title = fm(content, 'title')

  console.log(`→ ${title || slug} [${category}]`)

  try {
    const results = await publishToParasites(content, slug, category)
    for (const r of results) {
      if (r.skipped) {
        console.log(`   ${r.platform}: skipped — ${r.reason}`)
      } else if (r.error) {
        console.log(`   ${r.platform}: ERROR — ${r.error}`)
        failed++
      } else {
        console.log(`   ${r.platform}: ✓ ${r.url}`)
        passed++
      }
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`)
    failed++
  }

  // Polite delay between articles
  await new Promise(r => setTimeout(r, 2000))
  console.log()
}

console.log(`Done. ${passed} published, ${failed} failed.`)
