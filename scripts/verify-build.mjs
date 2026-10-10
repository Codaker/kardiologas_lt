import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';
import assert from 'node:assert/strict';
const base = (process.env.BASE_PATH || '/kardiologas_lt').replace(/\/$/, '');
const routes = JSON.parse(await readFile('docs/route-manifest.json', 'utf8'));
const failures = [];
let links = 0,
  images = 0;
for (const route of routes) {
  assert(
    existsSync(resolve('dist', '.' + route.path, 'index.html')),
    `Missing route ${route.path}`,
  );
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
for (const file of (await files('dist')).filter((f) => f.endsWith('.html'))) {
  const $ = load(await readFile(file, 'utf8'));
  if (!$('title').text() || !$('meta[name="description"]').attr('content'))
    failures.push(`${file}: missing metadata`);
  if ($('html').attr('lang') !== 'lt')
    failures.push(`${file}: missing language`);
  if ($('h1').length !== 1)
    failures.push(`${file}: expected one h1, found ${$('h1').length}`);
  for (const element of $(
    'a[href],img[src],script[src],link[rel="stylesheet"],source[src]',
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
    }
  }
}
assert.equal(failures.length, 0, failures.join('\n'));
console.log(
  `Verified ${routes.length} preserved routes, ${links} local references, ${images} images, metadata and GitHub Pages base paths.`,
);
