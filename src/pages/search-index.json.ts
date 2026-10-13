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

// The index only feeds substring matching, so markdown syntax and link targets
// are dead weight: strip them before shipping the body to the browser.
function plainText(markdown: string = ''): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, ' ')
    .replace(/[#>*_`|~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const stories = await getCollection('stories');
  const categories = await getCollection('categories');

  const results: SearchResult[] = [
    ...stories.map((story: CollectionEntry<'stories'>) => ({
      title: story.data.title,
      excerpt: story.data.description || '',
      url: `/chapters/${story.data.category}/${story.slug}`,
      category: story.data.category,
      body: plainText(story.body)
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
