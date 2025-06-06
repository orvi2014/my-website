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
  })
});

// Export collections
export const collections = {
  'categories': categoriesCollection,
  'stories': storiesCollection,
}; 