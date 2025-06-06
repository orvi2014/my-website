import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
}

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')?.toLowerCase() || '';
  
  if (!query) {
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

    const results: SearchResult[] = [
      ...stories.map((story: CollectionEntry<'stories'>) => ({
        title: story.data.title,
        excerpt: story.data.description,
        url: `/chapters/stories/${story.slug}`,
        category: story.data.category
      })),
      ...categories.map((category: CollectionEntry<'categories'>) => ({
        title: category.data.title,
        excerpt: category.data.description,
        url: `/chapters/${category.slug}`,
        category: 'Chapter'
      }))
    ].filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.excerpt.toLowerCase().includes(query)
    );

    return new Response(JSON.stringify(results), {
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