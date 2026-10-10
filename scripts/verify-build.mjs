import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';
import assert from 'node:assert/strict';
const base = (process.env.BASE_PATH || '/kardiologas_lt').replace(/\/$/, '');
const site = new URL(process.env.SITE_URL || 'https://codaker.github.io');
const indexableSite = site.origin === 'https://kardiologas.lt';
const routes = JSON.parse(await readFile('docs/route-manifest.json', 'utf8'));
const failures = [];
let links = 0,
  images = 0,
  externalLinks = 0;
for (const route of routes) {
  assert(
    existsSync(resolve('dist', '.' + route.path, 'index.html')),
    `Missing route ${route.path}`,
  );
}
const sitemapPages = [];
if (indexableSite) {
  const sitemapIndex = load(await readFile('dist/sitemap-index.xml', 'utf8'), {
    xml: true,
  });
  const sitemapFiles = sitemapIndex('sitemap > loc').toArray();
  assert(sitemapFiles.length > 0, 'Sitemap index contains no sitemaps');
  for (const entry of sitemapFiles) {
    const url = new URL(sitemapIndex(entry).text());
    assert.equal(url.origin, site.origin, 'Incorrect sitemap origin');
    assert(url.pathname.startsWith(base + '/'), 'Incorrect sitemap base path');
    const file = resolve('dist', '.' + url.pathname.slice(base.length));
    const sitemap = load(await readFile(file, 'utf8'), { xml: true });
    sitemapPages.push(
      ...sitemap('url > loc')
        .toArray()
        .map((entry) => sitemap(entry).text()),
    );
  }
  assert.deepEqual(
    sitemapPages.sort(),
    routes.map((route) => new URL(base + route.path, site).href).sort(),
    'Sitemap must contain exactly the published content routes',
  );
}
for (const path of ['feed', 'feed.xml', 'sitemap.xml']) {
  assert(!existsSync(resolve('dist', path)), `Obsolete output: ${path}`);
}
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(dir + '/' + e.name) : dir + '/' + e.name,
      ),
    )
  ).flat();
}
const outputFiles = await files('dist');
if (!indexableSite)
  assert(
    !outputFiles.some((file) => /\/sitemap[^/]*\.xml$/.test(file)),
    'Non-production builds must not publish a sitemap',
  );
const obsoleteResources =
  /wp-content|wp-includes|wordpress|cleversoft|clever-icon|wp-image-|wp-video|zootemplate/i;
for (const file of outputFiles) {
  if (obsoleteResources.test(file))
    failures.push(`${file}: obsolete resource path`);
  if (
    /\.(html|css|js|xml)$/.test(file) &&
    obsoleteResources.test(await readFile(file, 'utf8'))
  )
    failures.push(`${file}: obsolete CMS resource reference`);
}
for (const file of outputFiles.filter((f) => f.endsWith('.html'))) {
  const $ = load(await readFile(file, 'utf8'), { scriptingEnabled: false });
  if (!$('title').text() || !$('meta[name="description"]').attr('content'))
    failures.push(`${file}: missing metadata`);
  if ($('html').attr('lang') !== 'lt')
    failures.push(`${file}: missing language`);
  if ($('h1').length !== 1)
    failures.push(`${file}: expected one h1, found ${$('h1').length}`);
  const sitemapLink = $('link[rel="sitemap"]');
  if (indexableSite) {
    if (sitemapLink.attr('href') !== base + '/sitemap-index.xml')
      failures.push(`${file}: missing or incorrectly based sitemap link`);
  } else if (sitemapLink.length) {
    failures.push(`${file}: non-production page advertises a sitemap`);
  }
  const noindexPage = ['dist/404.html', 'dist/paieska/index.html'].includes(
    file,
  );
  const expectedRobots =
    indexableSite && !noindexPage ? 'index,follow' : 'noindex,follow';
  if ($('meta[name="robots"]').attr('content') !== expectedRobots)
    failures.push(`${file}: expected robots directive ${expectedRobots}`);
  for (const element of $('a[href]').toArray()) {
    const el = $(element);
    const href = el.attr('href');
    const target = new URL(href, site);
    if (
      ['http:', 'https:'].includes(target.protocol) &&
      target.origin !== site.origin
    ) {
      externalLinks++;
      const rel = new Set((el.attr('rel') || '').split(/\s+/));
      if (
        el.attr('target') !== '_blank' ||
        !rel.has('noopener') ||
        !rel.has('noreferrer')
      )
        failures.push(
          `${file}: external link must open safely in a new tab: ${href}`,
        );
    }
  }
  for (const element of $(
    'a[href],img[src],script[src],link[rel="stylesheet"],link[rel="icon"],link[rel="sitemap"],source[src]',
  ).toArray()) {
    const el = $(element),
      url = el.attr('href') || el.attr('src');
    if (!url || /^(https?:|mailto:|tel:|data:|#|\/\/)/.test(url)) continue;
    links++;
    if (base && !url.startsWith(base + '/')) {
      failures.push(`${file}: missing base prefix: ${url}`);
      continue;
    }
    const path = decodeURI(url.split(/[?#]/)[0].slice(base.length));
    const target = resolve('dist', '.' + path);
    if (!existsSync(target)) {
      failures.push(`${file}: missing ${url}`);
      continue;
    }
    if (
      (await stat(target)).isDirectory() &&
      !existsSync(target + '/index.html')
    )
      failures.push(`${file}: no index for ${url}`);
    if (element.tagName === 'img') {
      images++;
      const buffer = await readFile(target);
      if (/^\s*(<!doctype|<html)/i.test(buffer.toString('utf8', 0, 100)))
        failures.push(`${file}: image contains HTML: ${url}`);
      if (!el.attr('alt')) failures.push(`${file}: image has no alt: ${url}`);
      if (!(Number(el.attr('width')) > 0 && Number(el.attr('height')) > 0))
        failures.push(`${file}: image has no intrinsic dimensions: ${url}`);
      if (!url.startsWith(base + '/_astro/'))
        failures.push(`${file}: image bypasses Astro asset processing: ${url}`);
    }
  }
  for (const el of $('img[srcset],source[srcset]').toArray()) {
    for (const candidate of $(el).attr('srcset').split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      links++;
      if (
        !url.startsWith(base + '/_astro/') ||
        !existsSync(resolve('dist', '.' + decodeURI(url.slice(base.length))))
      )
        failures.push(
          `${file}: missing or incorrectly based image variant: ${url}`,
        );
    }
  }
  for (const el of $('[style]').toArray()) {
    for (const match of $(el)
      .attr('style')
      .matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const url = match[1];
      links++;
      if (
        !url.startsWith(base + '/_astro/') ||
        !existsSync(resolve('dist', '.' + decodeURI(url.slice(base.length))))
      )
        failures.push(
          `${file}: missing or incorrectly based background: ${url}`,
        );
    }
  }
}
assert.equal(failures.length, 0, failures.join('\n'));
console.log(
  `Verified ${routes.length} content routes, ${sitemapPages.length} sitemap entries, ${indexableSite ? 'production' : 'noindex'} indexing policy, ${links} local references, ${images} optimized images, ${externalLinks} external links opening in new tabs, metadata, base paths and clean asset output.`,
);
