import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import rehypeRaw from 'rehype-raw';
import { localLinks } from './src/lib/local-links.mjs';
import { canonicalPath } from './src/lib/seo.mjs';

// Production defaults; override both values for a preview deployment.
const base = process.env.BASE_PATH || '/';
const site = process.env.SITE_URL || 'https://kardiologas.lt';
const indexableSite = new URL(site).origin === 'https://kardiologas.lt';
export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeRaw, [localLinks, { base, site }]],
    }),
  },

  integrations: indexableSite
    ? [
        sitemap({
          filter: (page) => {
            const path = new URL(page).pathname.slice(
              base.replace(/\/$/, '').length,
            );
            return path !== '/paieska/' && canonicalPath(path) === path;
          },
        }),
      ]
    : [],
});
