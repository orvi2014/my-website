import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { qualityCheck } from './quality.js'
import { improveStory } from './generate.js'

const exec = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_DIR = path.resolve(__dirname, '../..')
const STORIES_DIR = path.join(SITE_DIR, 'src/content/stories')
const IMPROVED_LOG = path.join(__dirname, 'improved.json')

function readImprovedLog() {
  try { return JSON.parse(fs.readFileSync(IMPROVED_LOG, 'utf8')) } catch { return {} }
}

function writeImprovedLog(log) {
  fs.writeFileSync(IMPROVED_LOG, JSON.stringify(log, null, 2))
}

function getPublishedStories() {
  return fs.readdirSync(STORIES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      file: f,
      slug: f.replace('.md', ''),
      path: path.join(STORIES_DIR, f),
      content: fs.readFileSync(path.join(STORIES_DIR, f), 'utf8'),
    }))
}

function pickCandidate(stories, improvedLog) {
  // Sort: never-improved first, then by last improved date (oldest first)
  return stories
    .filter(s => s.content.length > 500) // skip stubs
    .sort((a, b) => {
      const aDate = improvedLog[a.slug] || '1970-01-01'
      const bDate = improvedLog[b.slug] || '1970-01-01'
      return aDate.localeCompare(bDate)
    })[0]
}

export async function runImprovementCycle(sendForReview) {
  const stories = getPublishedStories()
  if (stories.length === 0) return

  const log = readImprovedLog()
  const candidate = pickCandidate(stories, log)
  if (!candidate) return

  console.log(`[improver] Checking: ${candidate.slug}`)

  let score
  try {
    score = await qualityCheck(candidate.content)
  } catch (err) {
    console.error('[improver] Quality check failed:', err.message)
    return
  }

  console.log(`[improver] Score: SEO=${score.seo} AEO=${score.aeo} GEO=${score.geo} avg=${score.average}`)

  // Only improve if below 9.0 — existing content has a higher bar
  if (score.average >= 9.0) {
    console.log(`[improver] Already excellent — skipping`)
    log[candidate.slug] = new Date().toISOString().split('T')[0]
    writeImprovedLog(log)
    return
  }

  const weaknesses = [
    score.seo < 8.5 ? `SEO (${score.seo}/10): ${score.weakest === 'seo' ? score.fix : 'strengthen keyword targeting and citation links'}` : null,
    score.aeo < 8.5 ? `AEO (${score.aeo}/10): ${score.weakest === 'aeo' ? score.fix : 'add direct answers immediately after each H2 question'}` : null,
    score.geo < 8.5 ? `GEO (${score.geo}/10): ${score.weakest === 'geo' ? score.fix : 'add specific quotable sentences and more data points'}` : null,
    score.fix,
  ].filter(Boolean).join('\n')

  console.log(`[improver] Improving ${candidate.slug} (avg ${score.average}/10)`)

  let improved
  try {
    improved = await improveStory(candidate.content, weaknesses)
  } catch (err) {
    console.error('[improver] Improvement failed:', err.message)
    return
  }

  // Verify improvement
  let newScore
  try {
    newScore = await qualityCheck(improved)
    console.log(`[improver] New score: ${newScore.average}/10`)
  } catch {
    newScore = { average: 8.5, seo: 8.5, aeo: 8.5, geo: 8.5 }
  }

  if (newScore.average < score.average) {
    console.log(`[improver] Improvement made it worse — discarding`)
    return
  }

  // Commit the improved version
  fs.writeFileSync(candidate.path, improved)
  try {
    await exec('git', ['-C', SITE_DIR, 'add', candidate.path])
    await exec('git', ['-C', SITE_DIR, 'commit', '-m', `content: improve ${candidate.slug} (${score.average}→${newScore.average})`])
    await exec('git', ['-C', SITE_DIR, 'push'])

    log[candidate.slug] = new Date().toISOString().split('T')[0]
    writeImprovedLog(log)

    console.log(`[improver] Pushed improvement: ${candidate.slug}`)

    // Notify via Telegram
    await sendForReview(
      { title: `IMPROVED: ${candidate.slug.replace(/-/g, ' ')}`, category: 'update', query: 'existing content' },
      improved,
      candidate.slug,
      candidate.path,
      newScore
    ).catch(() => {})
  } catch (err) {
    console.error('[improver] Git push failed:', err.message)
  }
}
