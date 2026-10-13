interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
  body?: string;
}

const MAX_RESULTS = 20;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

// Every word of the query must appear somewhere; title hits outrank excerpt
// hits, which outrank body hits. A single exact-phrase match in the title
// still beats everything, so "1970 brazil" surfaces that essay first.
function score(item: SearchResult, words: string[], phrase: string): number {
  const title = item.title.toLowerCase();
  const excerpt = item.excerpt.toLowerCase();
  const body = (item.body || '').toLowerCase();
  let total = title.includes(phrase) ? 20 : 0;
  for (const word of words) {
    if (title.includes(word)) total += 6;
    else if (excerpt.includes(word)) total += 3;
    else if (body.includes(word)) total += 1;
    else return 0;
  }
  return total;
}

export function initSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const searchResults = document.getElementById('search-results') as HTMLDivElement | null;
  const resultsList = document.getElementById('results-list') as HTMLDivElement | null;
  const closeButton = document.getElementById('close-search') as HTMLButtonElement | null;
  if (!searchInput || !searchResults || !resultsList) return;

  let searchTimeout: ReturnType<typeof setTimeout>;
  let indexPromise: Promise<SearchResult[]> | null = null;

  function loadSearchIndex(): Promise<SearchResult[]> {
    indexPromise ??= fetch('/search-index.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        console.error('Failed to load search index:', error);
        indexPromise = null; // let the next keystroke retry
        return [];
      });
    return indexPromise;
  }

  // Start the download as soon as the modal opens, not on the first keystroke.
  searchInput.addEventListener('focus', () => { loadSearchIndex(); });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) {
      searchResults.hidden = true;
      return;
    }
    searchTimeout = setTimeout(() => performSearch(query), 150);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = resultsList.querySelector<HTMLAnchorElement>('a.result-item');
      if (first) window.location.href = first.href;
    }
  });

  closeButton?.addEventListener('click', () => {
    searchResults.hidden = true;
    searchInput.value = '';
    searchInput.focus();
  });

  async function performSearch(query: string) {
    const index = await loadSearchIndex();
    if (searchInput!.value.trim() !== query) return; // a newer query is in flight

    const phrase = query.toLowerCase();
    const words = phrase.split(/\s+/).filter(Boolean);
    const ranked = index
      .map((item) => ({ item, score: score(item, words, phrase) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

    displayResults(ranked, query);
  }

  function displayResults(results: SearchResult[], query: string) {
    const shown = results.slice(0, MAX_RESULTS);
    resultsList!.innerHTML = shown.length
      ? shown.map((result) => `
        <a href="${escapeHtml(result.url)}" class="result-item">
          <span class="result-category">${escapeHtml(result.category)}</span>
          <span class="result-title">${escapeHtml(result.title)}</span>
          ${result.excerpt ? `<span class="result-excerpt">${escapeHtml(result.excerpt)}</span>` : ''}
        </a>`).join('')
      : `<p class="result-empty">Nothing matches “${escapeHtml(query)}”.</p>`;

    const count = searchResults!.querySelector('.results-count');
    if (count) {
      count.textContent = results.length > MAX_RESULTS
        ? `Top ${MAX_RESULTS} of ${results.length}`
        : `${results.length} result${results.length === 1 ? '' : 's'}`;
    }
    searchResults!.hidden = false;
  }
}
