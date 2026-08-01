import { defineCollection, z } from 'astro:content';

// Define the categories (chapters) collection
const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    icon: z.string().optional(),
  })
});

// Define the stories (posts) collection
const storiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    category: z.string(), // References the category slug
    author: z.string(),
    readingTime: z.number().optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    image: z.string().optional(),
    // Rendered on the page and emitted as FAQPage JSON-LD. Keep answers
    // self-contained: they target direct-answer and AI-citation surfaces.
    faq: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })).optional(),
  })
});

// Export collections.
//
// There is no 'chapters' collection. One was defined here but src/content/chapters/
// never existed and nothing ever called getCollection('chapters'), so every build
// logged "The base directory .../src/content/chapters/ does not exist". The pages
// under /chapters are built from 'categories' and 'stories'.
export const collections = {
  'categories': categoriesCollection,
  'stories': storiesCollection,
};
