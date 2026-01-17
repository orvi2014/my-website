// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://robatdasorvi.com',
  integrations: [tailwind(), react()],
  output: 'static',
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
