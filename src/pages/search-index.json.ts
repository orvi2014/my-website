import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export const prerender = true;

interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  category: string;
  body?: string;
}

export async function GET() {
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

  return new Response(JSON.stringify(results), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
