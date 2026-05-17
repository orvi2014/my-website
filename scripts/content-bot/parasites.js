import https from 'https'

const agent = new https.Agent({ rejectUnauthorized: false })

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(hostname, path, method, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const opts = {
      hostname,
      path,
      method,
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    }
    const req = https.request(opts, res => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, body: raw }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

// Extract frontmatter field
function fm(content, field) {
  const m = content.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?`, 'm'))
  return m ? m[1].trim() : ''
}

// Strip frontmatter, return body only
function body(content) {
  return content.replace(/^---[\s\S]*?---\n/, '').trim()
}

// Convert markdown headings + links to minimal HTML for Medium
function mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|p])(.+)$/gm, '<p>$1</p>')
    .trim()
}

// ── Medium ────────────────────────────────────────────────────────────────────

export async function publishToMedium(content, slug, category) {
  const token = process.env.MEDIUM_TOKEN
  if (!token) return { platform: 'Medium', skipped: true, reason: 'MEDIUM_TOKEN not set' }

  // Get user ID
  const meRes = await request('api.medium.com', '/v1/me', 'GET', null, {
    Authorization: `Bearer ${token}`,
  })
  if (meRes.status !== 200) throw new Error(`Medium /me failed: ${meRes.status}`)
  const userId = meRes.body.data.id

  const title = fm(content, 'title')
  const canonicalUrl = `https://www.robatdasorvi.com/chapters/${category}/${slug}`
  const tags = fm(content, 'tags')
    .replace(/[\[\]"]/g, '')
    .split(',')
    .map(t => t.trim())
    .slice(0, 5)

  const bodyHtml = `<p><em>Originally published on <a href="${canonicalUrl}">robatdasorvi.com</a></em></p>\n` +
    mdToHtml(body(content))

  const res = await request('api.medium.com', `/v1/users/${userId}/posts`, 'POST', {
    title,
    contentFormat: 'html',
    content: bodyHtml,
    canonicalUrl,
    tags,
    publishStatus: 'public',
  }, {
    Authorization: `Bearer ${token}`,
  })

  if (res.status !== 201) throw new Error(`Medium publish failed: ${res.status} ${JSON.stringify(res.body)}`)

  return {
    platform: 'Medium',
    url: res.body.data.url,
  }
}

// ── Dev.to ────────────────────────────────────────────────────────────────────

export async function publishToDevTo(content, slug, category) {
  const token = process.env.DEVTO_TOKEN
  if (!token) return { platform: 'Dev.to', skipped: true, reason: 'DEVTO_TOKEN not set' }

  // Dev.to only makes sense for tech/ai categories
  const techCategories = ['technology', 'ai-automation', 'future']
  if (!techCategories.includes(category)) {
    return { platform: 'Dev.to', skipped: true, reason: `category '${category}' not suited for Dev.to` }
  }

  const title = fm(content, 'title')
  const description = fm(content, 'description')
  const canonicalUrl = `https://www.robatdasorvi.com/chapters/${category}/${slug}`
  const tags = fm(content, 'tags')
    .replace(/[\[\]"]/g, '')
    .split(',')
    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 4)

  const bodyMd = `*Originally published on [robatdasorvi.com](${canonicalUrl})*\n\n` + body(content)

  const res = await request('dev.to', '/api/articles', 'POST', {
    article: {
      title,
      body_markdown: bodyMd,
      published: true,
      canonical_url: canonicalUrl,
      description,
      tags,
    },
  }, {
    'api-key': token,
  })

  if (res.status !== 201) throw new Error(`Dev.to publish failed: ${res.status} ${JSON.stringify(res.body)}`)

  return {
    platform: 'Dev.to',
    url: res.body.url,
  }
}

// ── Hashnode ──────────────────────────────────────────────────────────────────

export async function publishToHashnode(content, slug, category) {
  const token = process.env.HASHNODE_TOKEN
  const publicationId = process.env.HASHNODE_PUBLICATION_ID
  if (!token || !publicationId) {
    return { platform: 'Hashnode', skipped: true, reason: 'HASHNODE_TOKEN or HASHNODE_PUBLICATION_ID not set' }
  }

  const title = fm(content, 'title')
  const canonicalUrl = `https://www.robatdasorvi.com/chapters/${category}/${slug}`
  const tags = fm(content, 'tags')
    .replace(/[\[\]"]/g, '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 5)

  const bodyMd = `*Originally published on [robatdasorvi.com](${canonicalUrl})*\n\n` + body(content)

  const mutation = {
    query: `mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post { url }
      }
    }`,
    variables: {
      input: {
        title,
        contentMarkdown: bodyMd,
        originalArticleURL: canonicalUrl,
        publicationId,
        tags: tags.map(t => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]/g, '-') })),
      },
    },
  }

  const res = await request('gql.hashnode.com', '/', 'POST', mutation, {
    Authorization: token,
  })

  if (res.status !== 200 || res.body.errors) {
    throw new Error(`Hashnode failed: ${JSON.stringify(res.body.errors || res.body)}`)
  }

  return {
    platform: 'Hashnode',
    url: res.body.data.publishPost.post.url,
  }
}

// ── Run all platforms ─────────────────────────────────────────────────────────

export async function publishToParasites(content, slug, category) {
  const results = await Promise.allSettled([
    publishToMedium(content, slug, category),
    publishToDevTo(content, slug, category),
    publishToHashnode(content, slug, category),
  ])

  return results.map((r, i) => {
    const platform = ['Medium', 'Dev.to', 'Hashnode'][i]
    if (r.status === 'fulfilled') return r.value
    return { platform, error: r.reason?.message || 'Unknown error' }
  })
}
