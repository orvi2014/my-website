import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

// This is required for Vercel serverless functions
export const prerender = false;

interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
  body?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const query = body.query?.toLowerCase() || '';
    
    if (!query) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const stories = await getCollection('stories');
    const categories = await getCollection('categories');

    const results: SearchResult[] = [
      ...stories.map((story: CollectionEntry<'stories'>) => ({
        title: story.data.title,
        excerpt: story.data.description || '',
        url: `/chapters/stories/${story.slug}`,
        category: story.data.category,
        body: story.body
      })),
      ...categories.map((category: CollectionEntry<'categories'>) => ({
        title: category.data.title,
        excerpt: category.data.description || '',
        url: `/chapters/${category.slug}`,
        category: 'Chapter'
      }))
    ];

    const filteredResults = results.filter(item => {
      const searchableText = [
        item.title,
        item.excerpt,
        item.body
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });

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