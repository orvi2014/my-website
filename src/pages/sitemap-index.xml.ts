import { defineConfig } from 'astro/config';
import { getCollection } from 'astro:content';

export async function GET() {
  const baseUrl = 'https://robatdasorvi.com';
  
  // Get all pages from the pages directory
  const pages = [
    '/',
    '/chapters',
    '/chapters/about',
    '/chapters/technology',
    '/chapters/ai-automation',
    '/chapters/human',
    '/chapters/travel',
    '/chapters/products',
    '/stories',
    '/glossary'
  ];

  // Create sitemap entries
  const sitemapEntries = pages.map(page => ({
    loc: `${baseUrl}${page}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: page === '/' ? '1.0' : '0.8'
  }));

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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