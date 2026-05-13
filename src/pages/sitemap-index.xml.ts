import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const BASE = 'https://www.robatdasorvi.com';
  const now  = new Date().toISOString();

  const staticPages = [
    { path: '/',          priority: '1.0', changefreq: 'weekly',  lastmod: now },
    { path: '/chapters',  priority: '0.9', changefreq: 'weekly',  lastmod: now },
    { path: '/about',     priority: '0.7', changefreq: 'monthly', lastmod: now },
    { path: '/store',     priority: '0.6', changefreq: 'monthly', lastmod: now },
    { path: '/glossary',  priority: '0.6', changefreq: 'monthly', lastmod: now },
  ];

  const dynamicPages: Array<{ path: string; priority: string; changefreq: string; lastmod: string }> = [];

  try {
    const categories = await getCollection('categories');
    for (const cat of categories) {
      dynamicPages.push({
        path: `/chapters/${cat.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: now,
      });
    }

    const stories = await getCollection('stories');
    for (const story of stories) {
      const d = story.data.pubDate instanceof Date
        ? story.data.pubDate.toISOString()
        : String(story.data.pubDate);
      dynamicPages.push({
        path: `/chapters/stories/${story.slug}`,
        priority: '0.8',
        changefreq: 'monthly',
        lastmod: d,
      });
    }
  } catch {
    // no collections
  }

  const all = [...staticPages, ...dynamicPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${all.map(p => `  <url>
    <loc>${BASE}${p.path}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
