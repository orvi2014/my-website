// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.robatdasorvi.com',
  integrations: [tailwind(), react()],
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
