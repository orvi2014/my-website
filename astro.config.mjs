// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { readdirSync, readFileSync } from 'node:fs';

// Essays used to live at /stories/<slug> (and briefly /chapters/stories/<slug>)
// before moving to /chapters/<category>/<slug>. Old URLs are still out there in
// dev.to canonicals and reposts, so every essay gets a permanent redirect from
// both legacy paths. Built from the content files so new essays are covered
// without editing vercel.json; the hand-written entries there still win.
function legacyStoryRedirects() {
  const dir = new URL('./src/content/stories/', import.meta.url);
  const handled = new Set(
    JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
      .redirects.map((r) => r.source),
  );
  const redirects = {};
  for (const file of readdirSync(dir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const slug = file.replace(/\.mdx?$/, '');
    const category = readFileSync(new URL(file, dir), 'utf8')
      .match(/^category:\s*["']?([\w-]+)["']?\s*$/m)?.[1];
    if (!category) continue;
    for (const source of [`/stories/${slug}`, `/chapters/stories/${slug}`]) {
      if (!handled.has(source)) {
        redirects[source] = { status: 301, destination: `/chapters/${category}/${slug}` };
      }
    }
  }
  return redirects;
}

export default defineConfig({
  site: 'https://www.robatdasorvi.com',
  redirects: legacyStoryRedirects(),
  integrations: [],
  // Static by default. Individual routes opt into on-demand rendering with
  // `export const prerender = false` — currently only /api/subscribe, which
  // needs a server so the Buttondown API key never reaches the browser.
  output: 'static',
  adapter: vercel(),
  build: {
    // Inline every stylesheet rather than linking it. Pages need different
    // bundles (an article pulls _slug_.css that /about never loads), so on a
    // ClientRouter navigation the new HTML could swap in before its
    // stylesheet arrived, showing unstyled content for a beat. The previous
    // code hid that behind an opacity gate; inlining removes the gap itself.
    // Total CSS here is ~14 KB uncompressed, a few KB gzipped, so carrying it
    // per page costs less than the flash did.
    inlineStylesheets: 'always',
  },
  trailingSlash: 'never',
  vite: {
    ssr: {
      noExternal: ['astro']
    }
  }
});


// https://astro.build/config
// export default defineConfig({
//   site: 'http://localhost:3000',
//   base: '/',
//   vite: {
//     ssr: {
//       noExternal: ['astro']
//     }
//   }
// });
