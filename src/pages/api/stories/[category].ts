import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const categories = await getCollection('categories');
  return categories.map((category) => ({
    params: { category: category.slug },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const { category } = params;
    if (!category) {
      return new Response(JSON.stringify({ error: 'Category is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const stories = await getCollection('stories', (story) => story.data.category === category);
    
    // Sort stories by publication date
    const sortedStories = stories.sort((a, b) => 
      new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
    );

    // Create a serializable object
    const serializedStories = sortedStories.map(story => ({
      slug: story.slug,
      data: {
        title: story.data.title,
        tags: story.data.tags || [],
        readingTime: story.data.readingTime || null,
        pubDate: typeof story.data.pubDate === 'string'
          ? story.data.pubDate
          : new Date(story.data.pubDate).toISOString(),
      }
    }));

    return new Response(JSON.stringify(serializedStories), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch stories' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 