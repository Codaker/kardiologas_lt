import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ site }) => {
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const urls = (await getCollection('pages'))
    .map(
      (p) =>
        `<url><loc>${new URL(prefix + p.data.path, site).href}</loc></url>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
