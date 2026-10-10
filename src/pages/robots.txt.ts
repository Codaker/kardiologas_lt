import type { APIRoute } from 'astro';
import { withBase } from '../lib/urls';

export const GET: APIRoute = ({ site }) => {
  const sitemap =
    site?.origin === 'https://kardiologas.lt'
      ? `\nSitemap: ${new URL(withBase('/sitemap-index.xml'), site).href}\n`
      : '';
  return new Response(`User-agent: *\nAllow: /\n${sitemap}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
