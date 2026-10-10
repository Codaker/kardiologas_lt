import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import rehypeRaw from 'rehype-raw';
import { localLinks } from './src/lib/local-links.mjs';
import { canonicalPath } from './src/lib/seo.mjs';

// Set SITE_URL=https://kardiologas.lt and BASE_PATH=/ for the original domain.
const base = process.env.BASE_PATH || '/kardiologas_lt';
const site = process.env.SITE_URL || 'https://codaker.github.io';
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
