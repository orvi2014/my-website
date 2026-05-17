import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { publishToParasites } from './parasites.js'

const exec = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_DIR = path.resolve(__dirname, '../..')

export async function publishStory(draftPath, slug, category) {
  const dest = path.join(SITE_DIR, 'src/content/stories', `${slug}.md`)
  const content = fs.readFileSync(draftPath, 'utf8')

  // 1. Push to Vercel via git
  fs.copyFileSync(draftPath, dest)
  fs.unlinkSync(draftPath)

  await exec('git', ['-C', SITE_DIR, 'add', dest])
  await exec('git', ['-C', SITE_DIR, 'commit', '-m', `content: auto-publish ${slug}`])
  await exec('git', ['-C', SITE_DIR, 'push'])

  // 2. Publish to parasite platforms (non-blocking — don't fail the whole publish if one platform fails)
  let parasiteResults = []
  try {
    parasiteResults = await publishToParasites(content, slug, category || 'human')
  } catch (err) {
    console.error('[publisher] Parasite publish error:', err.message)
  }

  return { dest, parasiteResults }
}

export function discardDraft(draftPath) {
  try { fs.unlinkSync(draftPath) } catch {}
}
