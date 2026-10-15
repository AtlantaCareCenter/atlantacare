// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.atlantacare.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // sitemap-index.xml for search engines (linked from public/robots.txt); the editor is left out.
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
});
