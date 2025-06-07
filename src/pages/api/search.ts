import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export const prerender = false;

interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
  body?: string;
}

export const POST: APIRoute = async ({ request }) => {
  console.log('Search API: Received POST request');
  
  let query = '';
  try {
    const body = await request.json();
    query = body.query?.toLowerCase() || '';
    console.log('Search API: Received query from body:', query);
  } catch (error) {
    console.error('Search API: Error parsing request body:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  
  if (!query) {
    console.log('Search API: Empty query after parsing body');
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const stories = await getCollection('stories') as CollectionEntry<'stories'>[];
    const categories = await getCollection('categories') as CollectionEntry<'categories'>[];
    console.log('Search API: Fetched stories count:', stories.length);
    console.log('Search API: Fetched categories count:', categories.length);
    console.log('Search API: Fetched stories data:', stories.map(s => ({ slug: s.slug, data: s.data})));

    const results: SearchResult[] = [
      ...stories.map((story: CollectionEntry<'stories'>) => ({
        title: story.data.title,
        excerpt: story.data.description,
        url: `/chapters/stories/${story.slug}`,
        category: story.data.category,
        body: story.body,
      })),
      ...categories.map((category: CollectionEntry<'categories'>) => ({
        title: category.data.title,
        excerpt: category.data.description,
        url: `/chapters/${category.slug}`,
        category: 'Chapter'
      }))
    ];

    console.log('Search API: Combined results before filter:', results);

    const filteredResults = results.filter(item => {
      const lowerQuery = query.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const excerptMatch = item.excerpt.toLowerCase().includes(lowerQuery);
      
      const bodyMatch = item.body ? item.body.toLowerCase().includes(lowerQuery) : false;
      
      return titleMatch || excerptMatch || bodyMatch;
    });

    console.log('Search API: Filtered results count:', filteredResults.length);
    console.log('Search API: Filtered results:', filteredResults);

    return new Response(JSON.stringify(filteredResults), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 