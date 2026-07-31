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
