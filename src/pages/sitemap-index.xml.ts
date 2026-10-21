import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const BASE = 'https://www.robatdasorvi.com';
  const staticPaths = ['/', '/chapters', '/about', '/profile', '/contact', '/store', '/screenguard', '/hatswap', '/glossary'];
  const categories = await getCollection('categories');
  const stories = await getCollection('stories');
  const pages: Array<{ path: string; lastmod?: string }> = [
    ...staticPaths.map((path) => ({ path })),
    ...categories.map((cat) => ({ path: `/chapters/${cat.slug}` })),
    ...stories.map((story) => ({
      path: `/chapters/${story.data.category}/${story.slug}`,
      ...(story.data.updatedDate ? { lastmod: story.data.updatedDate.toISOString() } : {}),
    })),
  ];
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ path, lastmod }) => `  <url><loc>${escapeXml(BASE + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
