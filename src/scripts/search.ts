interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
  body?: string;
}

export function initSearch() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const searchResults = document.getElementById('search-results') as HTMLDivElement;
  const resultsList = document.getElementById('results-list') as HTMLDivElement;
  const closeButton = document.getElementById('close-search') as HTMLButtonElement;

  let searchTimeout: ReturnType<typeof setTimeout>;

  searchInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    clearTimeout(searchTimeout);
    
    if (target.value.length < 2) {
      searchResults.hidden = true;
      return;
    }

    searchTimeout = setTimeout(() => {
      performSearch(target.value);
    }, 300);
  });

  closeButton?.addEventListener('click', () => {
    searchResults.hidden = true;
    searchInput.value = '';
  });

  let searchIndex: SearchResult[] | null = null;

  async function loadSearchIndex() {
    if (searchIndex) return searchIndex;
    try {
      const response = await fetch('/search-index.json');
      searchIndex = await response.json();
      return searchIndex;
    } catch (error) {
      console.error('Failed to load search index:', error);
      return [];
    }
  }

  async function performSearch(query: string) {
    const index = await loadSearchIndex();
    if (!index) {
      displayResults([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const filteredResults = index.filter(item => {
      const searchableText = [
        item.title,
        item.excerpt,
        item.body
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(queryLower);
    });
    
    displayResults(filteredResults);
  }

  function displayResults(results: SearchResult[]) {
    if (!resultsList) return;

    resultsList.innerHTML = results.length ? results.map(result => `
      <a href="${result.url}" class="result-item">
        <div class="result-title">${result.title}</div>
      </a>
    `).join('') : '<div class="result-item">No results found</div>';

    searchResults.hidden = false;
  }

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchResults?.contains(e.target as Node) && e.target !== searchInput) {
      searchResults.hidden = true;
    }
  });

  // Add keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !searchResults.hidden) {
      searchResults.hidden = true;
      searchInput.value = '';
    }
  });
} 