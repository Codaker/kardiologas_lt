import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import { localLinks } from './src/lib/local-links.mjs';

// Set SITE_URL=https://kardiologas.lt and BASE_PATH=/ for the original domain.
const base = process.env.BASE_PATH || '/kardiologas_lt';
export default defineConfig({
  site: process.env.SITE_URL || 'https://codaker.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeRaw, [localLinks, { base }]] }),
  },
});
