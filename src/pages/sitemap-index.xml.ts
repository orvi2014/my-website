import { defineConfig } from 'astro/config';
import { getCollection } from 'astro:content';

interface BlogPost {
  slug: string;
  data: {
    pubDate?: Date;
  };
}

interface PageEntry {
  path: string;
  priority: string;
  changefreq: string;
  lastmod: Date;
}

export async function GET() {
  const baseUrl = 'https://robatdasorvi.com';
  
  // Static pages
  const staticPages: PageEntry[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters', priority: '0.9', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/about', priority: '0.8', changefreq: 'monthly', lastmod: new Date() },
    { path: '/chapters/technology', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/ai-automation', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/human', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/travel', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/products', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/chapters/stories', priority: '0.8', changefreq: 'weekly', lastmod: new Date() },
    { path: '/glossary', priority: '0.7', changefreq: 'monthly', lastmod: new Date() }
  ];

  // Get dynamic content (if you have any collections)
  let dynamicPages: PageEntry[] = [];
  try {
    // Get all stories if you have a stories collection
    const stories = await getCollection('stories') as BlogPost[];
    dynamicPages = stories.map(story => ({
      path: `/chapters/stories/${story.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: story.data.pubDate || new Date()
    }));
  } catch (error) {
    console.warn('No content collections found');
  }

  // Combine static and dynamic pages
  const allPages = [...staticPages, ...dynamicPages];

  // Create sitemap entries
  const sitemapEntries = allPages.map(page => ({
    loc: `${baseUrl}${page.path}`,
    lastmod: page.lastmod.toISOString(),
    changefreq: page.changefreq,
    priority: page.priority
  }));

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${sitemapEntries.map(entry => `
    <url>
      <loc>${entry.loc}</loc>
      <lastmod>${entry.lastmod}</lastmod>
      <changefreq>${entry.changefreq}</changefreq>
      <priority>${entry.priority}</priority>
    </url>
  `).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
} 