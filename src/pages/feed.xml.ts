import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
const xml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export const GET: APIRoute = async ({ site }) => {
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const home = new URL(prefix + '/', site).href;
  const items = (await getCollection('pages'))
    .filter((p) => p.data.type === 'article')
    .map((p) => {
      const url = new URL(prefix + p.data.path, site).href;
      return `<item><title>${xml(p.data.title)}</title><link>${xml(url)}</link><guid>${xml(url)}</guid><description>${xml(p.data.description)}</description></item>`;
    })
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>kardiologas.lt</title><link>${xml(home)}</link><description>Kardiologijos kabinetas Pulsas</description><language>lt</language>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml' } },
  );
};
