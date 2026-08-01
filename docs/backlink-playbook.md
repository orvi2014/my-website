# Backlink playbook

Referring domains as of 2026-08-01: **1** (dev.to). Everything below is ordered by
effort-to-value, not by ambition.

Moz DA and Ahrefs DR are third-party scores, not Google metrics, and both are driven
almost entirely by the *count of distinct referring domains*. Nothing on-page moves
them. At a count near zero the curve is steepest: 0 to 10 real domains is worth more
than 50 to 200 later.

---

## Tier 0 — properties we already own

Four domains are claimed as ours in the `sameAs` block of `src/layouts/BaseLayout.astro`
and none of them link back. Verified 2026-08-01:

| Domain | Links to robatdasorvi.com |
| --- | --- |
| agencyhandy.com | 0 |
| www.onethreadapp.com | 0 |
| noburn.dev | 0 |
| apidiffguard.com | 0 |

These are same-owner links, so Google discounts them relative to editorial links. They
still register as referring domains, and more importantly they create crawl paths into
a site where roughly 21% of articles are indexed.

**Place them editorially, not sitewide.** A sitewide footer link across four owned
domains is a recognisable link-scheme pattern and gets discounted or flagged. An author
bio is true, useful, and safe.

### Snippet — About / team page (preferred)

```html
<p>
  Built by <strong>Robat Das Orvi</strong>, who writes long-form essays on systems,
  AI, and football at <a href="https://www.robatdasorvi.com">robatdasorvi.com</a>.
</p>
```

### Snippet — blog author byline

```html
<div class="author-bio">
  <p>
    <a href="https://www.robatdasorvi.com" rel="author">Robat Das Orvi</a>
    is the co-creator of OneThread and AgencyHandy. He writes about building calm
    products at <a href="https://www.robatdasorvi.com">The Book of Life</a>.
  </p>
</div>
```

Do **not** add `rel="nofollow"` or `rel="sponsored"`. Do **not** use the same anchor
text on all four; vary between the bare domain, "The Book of Life", and the name.

### Deep links beat homepage links

Where a topic genuinely fits, link the relevant essay rather than the homepage. It
passes equity to a page that needs indexing:

- noburn.dev → `/chapters/ai-automation/why-most-ai-automation-dies-within-six-months-of-going-live`
- apidiffguard.com → `/chapters/ai-agents/hallucination-in-production-agents-the-real-risk-profile-nobody-discusses-honestly`
- agencyhandy.com → `/chapters/building/what-i-would-do-differently-if-i-started-agencyhandy-today`

---

## Tier 1 — syndication

`scripts/syndicate.mjs` drips 2 articles/day to Dev.to with `canonical_url` pointing
home. Verified: those links are **dofollow** (`rel="noopener noreferrer"`, no nofollow)
from a DR ~90 domain.

The ceiling is structural. One hundred Dev.to posts is still **one** referring domain.
Breadth beats depth.

| Channel | Status | Link value |
| --- | --- | --- |
| dev.to | live, 10 posts | dofollow, best current link |
| hashnode.com | `HASHNODE_TOKEN` unset | dofollow, worth wiring up |
| medium.com | `MEDIUM_TOKEN` unset | **nofollow** — traffic only, not authority |

**The football gap.** `DEVTO_CATEGORIES` in `scripts/syndicate.mjs` covers
`technology`, `ai-automation`, `future`, `ai-agents`. Football is excluded, correctly,
because Dev.to is a developer community. That leaves ~27 football articles, the
strongest content on the site and the source of most impressions, with no syndication
channel at all.

---

## Tier 2 — earned links

The linkable assets are the football data pieces, not the essays. Original data gets
cited; opinion does not.

- `does-high-pressing-actually-win-trophies-ten-years-of-ppda-data-have-an-answer`
- `penalty-shootouts-are-not-random-the-psychology-data-from-500-shootouts-proves-it`
- `was-the-1970-brazil-side-actually-the-greatest-team-ever-assembled-the-data-says-yes-but`

Distribution that fits them: r/soccer, r/FootballTactics, football stats Twitter,
tactics newsletters.

For the AI cluster: Hacker News, Lobste.rs, Indie Hackers. The honest framing in
`why-most-ai-automation-dies-within-six-months-of-going-live` suits that audience.

---

## Do not

Paid link packages, PBNs, directory blasts, comment links. At this domain strength they
earn a manual action faster than they earn authority, and a manual action is far harder
to undo than a slow start.

---

## Note on priority

Referring domains are not the binding constraint on clicks right now. Indexation is:
roughly 21% of articles are indexed, so most of the library cannot rank at any authority
level. Tier 0 helps both, because crawl budget follows links, which is why it goes first.
