# SEO & AEO Brief — robatdasorvi.com

## Site Identity
- **Live domain:** https://www.robatdasorvi.com (canonical — non-www redirects to www)
- **Repo:** https://github.com/orvi2014/my-website
- **Stack:** Astro v5.9.0, static output, deployed on Vercel
- **Author:** Robat Das Orvi (Orvi), born 1994
- **Brand:** The Book of Life — personal essay collection

## Analytics & Search
- **GA4 Measurement ID:** G-8MDK069LNK
- **GSC Property:** Domain property for `robatdasorvi.com` (covers all subdomains and both www/non-www)
- **Sitemap:** https://www.robatdasorvi.com/sitemap-index.xml
- **Robots:** https://www.robatdasorvi.com/robots.txt
- **LLMs.txt (AEO):** https://www.robatdasorvi.com/llms.txt

## Content Structure
| Chapter | Slug | Topics |
|---------|------|--------|
| I | `ai-automation` | AI, automation, presence, engineering |
| II | `extensions` | Browser extensions, Tailwind, CSS tools |
| III | `future` | Future tech, speculation |
| IV | `human` | Human behaviour, psychology |
| V | `philosophy` | Philosophy, systems, meaning |
| VI | `technology` | Technology, building, judgment |

**Story count:** ~5 published (classcatch, love-never-dies, race, sample-post, why-does-universe-have-laws)

**Traffic goal:** 3,000 visitors within 2–3 months (from ~May 2026)

## SEO Implementation (done)
- [x] Canonical URLs → `https://www.robatdasorvi.com`
- [x] `robots.txt` — AI crawlers explicitly allowed (GPTBot, PerplexityBot, Claude-Web, anthropic-ai, etc.)
- [x] `sitemap-index.xml` — all pages + dynamic story/category routes
- [x] `manifest.webmanifest` — PWA signal
- [x] Open Graph + Twitter Card meta on all pages
- [x] `robots` meta: `index,follow,max-image-preview:large,max-snippet:-1`
- [x] Article `pubDate`, `author`, `section`, `tags` meta

## AEO Implementation (done)
- [x] `llms.txt` — LLM-readable site brief at `/llms.txt`
- [x] **Person schema** (`@id: /#orvi`) — author entity with `knowsAbout` array on every page
- [x] **Blog schema** — site-level entity
- [x] **Article schema** — on all story pages with `speakable` CSS selectors
- [x] **BreadcrumbList** — on all story pages
- [x] **ItemList** — on `/chapters` (6 chapters listed)
- [x] **DefinedTermSet + DefinedTerm** — on `/glossary` (8 terms, great for Perplexity snippets)
- [x] `speakable` schema pointing to `.art-kicker`, `.art-title`, `.art-pull`

## Monitoring
- **Daily script:** `scripts/seo-monitor.sh` — checks sitemap, robots, llms.txt, page load, key pages
- **GSC API:** not yet connected (requires service account key — see `.env.example`)
- **Cron:** set up in Claude session to run at 8:17am daily

## What to Audit (run this checklist when asked to review)

### Technical SEO
- [ ] Are all sitemap URLs returning 200? (`curl` each `<loc>`)
- [ ] Is canonical tag correct on every page? (should be `https://www.robatdasorvi.com/...`)
- [ ] Any 404s in GSC Coverage report?
- [ ] Core Web Vitals — GSC Experience tab (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- [ ] Are new stories being indexed? (GSC → Pages → Indexed)
- [ ] Internal linking — does every story link to at least one related story?
- [ ] Image alt text on all images
- [ ] Any duplicate title/description warnings in GSC

### Domain Authority / DR (Ahrefs / Moz)
- Check DA at: https://moz.com/domain-analysis?site=www.robatdasorvi.com
- Check DR at: https://ahrefs.com/website-authority-checker/?target=www.robatdasorvi.com
- **Current baseline:** not yet measured (check and record first reading)
- **Target DR:** 20+ within 6 months
- **To improve DR:** earn backlinks from travel blogs, tech newsletters, startup communities

### Backlink Opportunities
- Submit essays to: Hacker News (Show HN), Indie Hackers, Medium (cross-post)
- Travel chapters → pitch to travel blog roundups
- Philosophy/startup chapters → link from AgencyHandy blog, OneThread blog
- Guest post on topics: AI automation (high-authority tech blogs), founder psychology

### Content Strategy (to hit 3k visitors)
- **Publish cadence:** minimum 2 new essays/month
- **Target keywords per chapter:**
  - Travel: "slow travel tips", "travel without itinerary", "Kathmandu travel"
  - AI/Tech: "AI automation presence", "building with AI tools"
  - Startups: "founder psychology", "startup pivot examples"
  - Philosophy: "why does the universe have laws", "systems thinking"
- **Long-tail AEO:** write FAQ-style answers at the end of each essay (gets picked up by Perplexity)
- **Content gap:** no stories in future/human chapters — fill these first

### AEO Health
- [ ] Is `llms.txt` accessible? (curl https://www.robatdasorvi.com/llms.txt)
- [ ] Do article pages have `speakable` schema? (check with Google Rich Results Test)
- [ ] Is `DefinedTermSet` schema valid on /glossary?
- [ ] Are AI crawlers getting through? (check server logs for GPTBot, PerplexityBot)
- [ ] Try asking Perplexity: "Who is Robat Das Orvi?" — is the site cited?

### Quick Wins (do these next)
1. Add 2–3 more stories (especially in under-populated chapters)
2. Add an FAQ section to each story (2–3 questions at the bottom)
3. Write a "About the Author" blurb that answers "Who is Orvi?" directly — Perplexity will index it
4. Submit site to: Indie Hackers, Product Hunt (as a project), Hacker News
5. Add internal links between related stories
6. Request indexing in GSC for each new story after publishing

## Key Files
| File | Purpose |
|------|---------|
| `src/layouts/BaseLayout.astro` | All SEO meta, structured data, GA4 |
| `src/layouts/StoryLayout.astro` | Article schema, speakable, book page style |
| `src/pages/sitemap-index.xml.ts` | Dynamic sitemap generator |
| `public/robots.txt` | Crawler rules inc. AI bots |
| `public/llms.txt` | LLM-readable site brief |
| `public/manifest.webmanifest` | PWA manifest |
| `scripts/seo-monitor.sh` | Daily health check script |
| `.env.example` | All required env vars documented |
