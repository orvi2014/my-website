// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.robatdasorvi.com',
  // No integrations. Tailwind had no config file, no @tailwind directives and
  // no utility classes in any template. React had no .jsx/.tsx components left
  // after the newsletter modal was removed, yet still emitted a 144 KB bundle
  // that no page referenced. Both were pure build cost.
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
