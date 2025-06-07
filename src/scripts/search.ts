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

  async function performSearch(query: string) {
    console.log('Search Component Script: Sending query to API:', query);
    // Temporarily use a hardcoded query for testing
    // const testQuery = 'testquery'; 
    const searchUrl = `/api/search`; // Remove query from URL
    console.log('Search Component Script: Fetching URL:', searchUrl);
    try {
      const response = await fetch(searchUrl, {
        method: 'POST', // Change to POST request
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }), // Send query in the request body
      });
      const results: SearchResult[] = await response.json();
      
      displayResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
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