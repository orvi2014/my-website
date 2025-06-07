// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://robatdasorvi.com',
  integrations: [react()],
  output: 'server', // or 'hybrid' if needed
  adapter: vercel(),
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
