import https from 'https'
import fs from 'fs'
import { readState, writeState } from './state.js'
import { publishStory, discardDraft } from './publisher.js'
import { reviseStory, generateFromContent } from './generate.js'

const agent = new https.Agent({ rejectUnauthorized: false })

function token() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set')
  return process.env.TELEGRAM_BOT_TOKEN
}

function chatId() {
  if (!process.env.TELEGRAM_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID not set')
  return process.env.TELEGRAM_CHAT_ID
}

function tg(method, body = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token()}/${method}`,
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }
    const req = https.request(options, res => {
      let raw = ''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw)
          if (!parsed.ok) reject(new Error(`Telegram ${method}: ${parsed.description}`))
          else resolve(parsed.result)
        } catch (e) {
          reject(new Error(`JSON parse: ${e.message}`))
        }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// Use a short random ID in callback_data to stay under Telegram's 64-byte limit
function shortId() {
  return Math.random().toString(36).slice(2, 8)
}

function reviewKeyboard(id) {
  return {
    inline_keyboard: [[
      { text: '✅ Publish', callback_data: `pub:${id}` },
      { text: '✏️ Revise',  callback_data: `rev:${id}` },
      { text: '🗑 Discard', callback_data: `dis:${id}` },
    ]],
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function chunkText(text, max = 4000) {
  const paragraphs = text.split(/\n\n+/)
  const chunks = []
  let current = ''
  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para
    if (candidate.length > max) {
      if (current) chunks.push(current)
      current = para.length > max ? para.slice(0, max) : para
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export async function sendForReview(topic, content, slug, draftPath, quality) {
  const id = shortId()

  // Header with quality scores
  const scoreLine = quality
    ? `\n✦ SEO ${quality.seo} · AEO ${quality.aeo} · GEO ${quality.geo} · avg ${quality.average}/10`
    : ''

  try {
    await tg('sendMessage', {
      chat_id: chatId(),
      text: `📝 NEW DRAFT\n\n${topic.title}\nCategory: ${topic.category}${scoreLine}`,
    })
  } catch (e) {
    console.warn('[telegram] Header failed:', e.message)
  }

  // Full body as plain text chunks
  const body = content.replace(/^---[\s\S]*?---\n/, '').trim()
  const chunks = chunkText(body)
  for (const chunk of chunks) {
    try {
      await tg('sendMessage', { chat_id: chatId(), text: chunk })
      await delay(300)
    } catch (e) {
      console.warn('[telegram] Chunk failed:', e.message)
    }
  }

  // Button message — retried 3 times, always sent
  let msgId
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await tg('sendMessage', {
        chat_id: chatId(),
        text: `— end of draft —\n\nAction for: ${topic.title}`,
        reply_markup: reviewKeyboard(id),
      })
      msgId = result.message_id
      break
    } catch (e) {
      console.warn(`[telegram] Button attempt ${attempt} failed:`, e.message)
      await delay(3000)
    }
  }

  if (!msgId) throw new Error('Button message failed after 3 attempts')

  // Store id → {slug, draftPath} in state so callback can find it
  const state = readState()
  state.ids = state.ids || {}
  state.ids[id] = { slug, draftPath, topic }
  writeState(state)

  return msgId
}

async function editMessage(messageId, text) {
  try {
    await tg('editMessageText', { chat_id: chatId(), message_id: messageId, text })
  } catch (err) {
    console.warn('[telegram] editMessage failed:', err.message)
  }
}

async function answerCallback(callbackId, text) {
  try {
    await tg('answerCallbackQuery', { callback_query_id: callbackId, text })
  } catch (e) {
    console.warn('[telegram] answerCallback failed:', e.message)
  }
}

async function handleCallback(query) {
  const parts = query.data.split(':')
  const rawAction = parts[0]
  const id = parts.slice(1).join(':')

  // Normalise action — support both old format (publish/revise/discard) and new (pub/rev/dis)
  const action = { publish: 'pub', revise: 'rev', discard: 'dis' }[rawAction] || rawAction

  const state = readState()

  // Look in new ids map first, then fall back to old pending map (keyed by message_id or slug)
  let entry = (state.ids || {})[id]
  let pendingKey = null

  if (!entry) {
    // Old format: id is the full slug, pending is keyed by message_id
    const found = Object.entries(state.pending || {}).find(([, v]) => v.slug === id)
    if (found) {
      [pendingKey, entry] = found
      entry = { slug: entry.slug, draftPath: entry.draftPath, topic: { title: entry.slug.replace(/-/g, ' '), category: entry.category, query: '' } }
    }
  }

  if (!entry) {
    await answerCallback(query.id, 'Not found — may already be handled.')
    return
  }

  const { slug, draftPath, topic } = entry

  function removeFromState(s) {
    if (pendingKey) delete s.pending[pendingKey]
    else delete s.ids[id]
  }

  if (action === 'pub') {
    try {
      const { parasiteResults } = await publishStory(draftPath, slug, topic?.category)
      removeFromState(state)
      writeState(state)
      await answerCallback(query.id, '🚀 Published!')
      await editMessage(query.message.message_id, `✅ Published: ${slug}`)

      // Build confirmation with parasite publish results
      const parasiteLines = parasiteResults.map(r => {
        if (r.skipped) return `  ⊘ ${r.platform} — ${r.reason}`
        if (r.error) return `  ✗ ${r.platform} — ${r.error}`
        return `  ✓ ${r.platform} — ${r.url}`
      }).join('\n')

      await tg('sendMessage', {
        chat_id: chatId(),
        text: `✅ PUBLISHED\n\n${topic?.title || slug}\n\nVercel: live in ~30s\n\n${parasiteLines || '  No parasite platforms configured'}`,
      })
      console.log(`[bot] Published: ${slug}`)
    } catch (err) {
      await answerCallback(query.id, `Error: ${err.message}`)
      await tg('sendMessage', { chat_id: chatId(), text: `❌ Publish failed: ${err.message}` }).catch(() => {})
      console.error('[bot] Publish failed:', err.message)
    }

  } else if (action === 'rev') {
    state.awaitingRevision = { id, slug, draftPath, msgId: query.message.message_id, topic }
    writeState(state)
    await answerCallback(query.id, 'Send revision instructions.')
    await tg('sendMessage', {
      chat_id: chatId(),
      text: `✏️ Revising: ${slug}\n\nReply with what specifically to change — e.g. "shorten the third section", "rewrite the opening sentence". Everything else stays identical.`,
    })

  } else if (action === 'dis') {
    discardDraft(draftPath)
    removeFromState(state)
    writeState(state)
    await answerCallback(query.id, '🗑 Discarded.')
    await editMessage(query.message.message_id, `Discarded: ${slug}`)
    console.log(`[bot] Discarded: ${slug}`)
  }
}

async function handleCustomWrite(userContent, state) {
  try {
    await tg('sendMessage', { chat_id: chatId(), text: `⏳ Writing from your content (~2 min)…` })
  } catch {}

  // Detect category from content keywords (rough heuristic)
  const lower = userContent.toLowerCase()
  let category = 'human'
  if (/\bai\b|claude|gpt|llm|agent|code|developer|saas|startup/i.test(lower)) category = 'ai-automation'
  else if (/football|soccer|messi|ronaldo|world cup|match|goal/i.test(lower)) category = 'football'
  else if (/future|2030|2040|technology|tech|software/i.test(lower)) category = 'future'
  else if (/philosophy|meaning|free will|ethics|stoic/i.test(lower)) category = 'philosophy'
  else if (/developer|programming|typescript|javascript|open source/i.test(lower)) category = 'technology'

  let content
  try {
    content = await generateFromContent(userContent, category)
  } catch (err) {
    await tg('sendMessage', { chat_id: chatId(), text: `❌ Generation failed: ${err.message}` }).catch(() => {})
    console.error('[bot] Custom write failed:', err.message)
    delete state.awaitingCustomWrite
    writeState(state)
    return
  }

  const slug = content.match(/^---[\s\S]*?title:\s*"([^"]+)"/)?.[1]
    ?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    || `custom-${Date.now()}`

  const { mkdirSync, writeFileSync } = await import('fs')
  const { join, dirname } = await import('path')
  const { fileURLToPath } = await import('url')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const draftsDir = join(__dirname, 'drafts')
  mkdirSync(draftsDir, { recursive: true })
  const draftPath = join(draftsDir, `${slug}.md`)
  writeFileSync(draftPath, content)

  const fakeTopic = { title: slug.replace(/-/g, ' '), category, query: 'user-provided content' }

  delete state.awaitingCustomWrite
  writeState(state)

  try {
    const msgId = await sendForReview(fakeTopic, content, slug, draftPath)
    console.log(`[bot] Custom draft sent: ${slug} (msg ${msgId})`)
  } catch (err) {
    console.error('[bot] Custom send failed:', err.message)
  }
}

async function handleMessage(message) {
  const state = readState()

  // /stats command — run SEO monitor and send results
  if (message.text?.startsWith('/stats')) {
    try {
      await tg('sendMessage', { chat_id: chatId(), text: `📊 Fetching SEO stats…` })
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(execFile)
      const { stdout } = await execAsync('bash', [
        '/Users/orvi/my-website/scripts/seo-monitor.sh'
      ], { timeout: 60_000, env: { ...process.env, PATH: process.env.PATH } })
      // Send in chunks if long
      const chunks = chunkText(stdout.trim())
      for (const chunk of chunks) {
        await tg('sendMessage', { chat_id: chatId(), text: chunk })
        await delay(300)
      }
    } catch (err) {
      await tg('sendMessage', { chat_id: chatId(), text: `❌ Stats failed: ${err.message}` }).catch(() => {})
    }
    return
  }

  // /write command — trigger custom content mode
  if (message.text?.startsWith('/write')) {
    const inlineContent = message.text.slice(6).trim()
    if (inlineContent.length > 50) {
      // Content provided inline with the command
      await handleCustomWrite(inlineContent, state)
    } else {
      state.awaitingCustomWrite = true
      writeState(state)
      await tg('sendMessage', {
        chat_id: chatId(),
        text: `✍️ Send me your content — notes, outline, rough draft, or just ideas. I'll shape it into a full post.\n\nYou can also specify a category at the start, e.g:\n[football] My notes about...\n[philosophy] Thoughts on...`,
      })
    }
    return
  }

  // Waiting for custom content
  if (state.awaitingCustomWrite) {
    const text = message.text || ''
    // Check if user specified category
    const catMatch = text.match(/^\[(\w+)\]\s*/i)
    let userContent = text
    if (catMatch) userContent = text.slice(catMatch[0].length)

    delete state.awaitingCustomWrite
    writeState(state)
    await handleCustomWrite(userContent, state)
    return
  }

  if (!state.awaitingRevision) return

  const { id, slug, draftPath, msgId, topic } = state.awaitingRevision
  const instructions = message.text

  try {
    await tg('sendMessage', { chat_id: chatId(), text: `⏳ Revising with Claude (~2 min)…` })
  } catch {}

  console.log(`[bot] Revising ${slug}: "${instructions}"`)

  try {
    const currentContent = fs.readFileSync(draftPath, 'utf8')
    const revised = await reviseStory(currentContent, instructions)
    fs.writeFileSync(draftPath, revised)
    delete state.awaitingRevision
    writeState(state)

    // Send full revised content for review (same as new draft flow)
    await sendForReview(topic, revised, slug, draftPath, null)
    console.log(`[bot] Revision complete: ${slug}`)
  } catch (err) {
    delete state.awaitingRevision
    writeState(state)
    await tg('sendMessage', { chat_id: chatId(), text: `❌ Revision failed: ${err.message}` }).catch(() => {})
    console.error('[bot] Revision failed:', err.message)
  }
}

let pollOffset = 0

async function pollOnce() {
  const updates = await tg('getUpdates', {
    offset: pollOffset,
    timeout: 25,
    allowed_updates: ['callback_query', 'message'],
  })
  for (const update of updates) {
    pollOffset = update.update_id + 1
    if (update.callback_query) await handleCallback(update.callback_query)
    if (update.message?.text) await handleMessage(update.message)
  }
}

export function startPolling() {
  async function loop() {
    while (true) {
      try {
        await pollOnce()
      } catch (err) {
        console.error('[telegram] Poll error:', err.message)
        await delay(5000)
      }
    }
  }
  loop()
}
