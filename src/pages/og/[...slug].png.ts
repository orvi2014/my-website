import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

// One 1200×630 share image per story, rendered at build time. Every page used
// to share /images/default-og.jpg, which gave social cards and AI answer
// surfaces nothing page-specific. Satori reads woff, not woff2, so these use
// the static @fontsource packages rather than the variable ones the site loads.

const fontFile = (pkg: string, file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'node_modules/@fontsource', pkg, 'files', file));

const FONTS = [
  { name: 'EB Garamond', data: fontFile('eb-garamond', 'eb-garamond-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Inter', data: fontFile('inter', 'inter-latin-500-normal.woff'), weight: 500 as const, style: 'normal' as const },
];

export async function getStaticPaths() {
  const stories = await getCollection('stories');
  const categories = await getCollection('categories');
  return stories.map((story: CollectionEntry<'stories'>) => ({
    params: { slug: `${story.data.category}/${story.slug}` },
    props: {
      title: story.data.title,
      kicker: categories.find((c: CollectionEntry<'categories'>) => c.slug === story.data.category)?.data.title ?? story.data.category,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker } = props as { title: string; kicker: string };
  const size = title.length > 70 ? 58 : title.length > 45 ? 66 : 76;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '72px 80px', background: '#faf7f2', borderTop: '14px solid #c0392b', fontFamily: 'Inter',
        },
        children: [
          { type: 'div', props: { style: { fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#c0392b' }, children: kicker } },
          { type: 'div', props: { style: { fontFamily: 'EB Garamond', fontSize: size, lineHeight: 1.12, color: '#1a1208' }, children: title } },
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#736760', borderTop: '2px solid #e4ddd5', paddingTop: 28 },
              children: [
                { type: 'div', props: { children: 'Robat Das Orvi' } },
                { type: 'div', props: { children: 'robatdasorvi.com' } },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: FONTS },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
