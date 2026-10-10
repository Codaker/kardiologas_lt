import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';
const exec = promisify(execFile);
const queue = new Map();
const manifest = existsSync('.cache/assets.json')
  ? JSON.parse(await readFile('.cache/assets.json', 'utf8'))
  : [];
function add(value, base = 'https://kardiologas.lt/') {
  try {
    const url = new URL(value.replaceAll('&amp;', '&'), base);
    if (
      !/^https?:$/.test(url.protocol) ||
      /transparent\.png/.test(url.pathname)
    )
      return;
    const local =
      url.hostname.replace(/^www\./, '') === 'kardiologas.lt'
        ? decodeURI(url.pathname)
        : '/vendor/' + url.hostname + decodeURI(url.pathname);
    if (
      !/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|css|pdf|mp4)$/i.test(
        url.pathname,
      )
    )
      return;
    queue.set(local, url.href);
  } catch {}
}
const pages = JSON.parse(await readFile('.cache/pages.json', 'utf8'));
for (const page of pages.filter((p) => !p.error)) {
  const $ = load(await readFile(page.file, 'utf8'));
  $('img, source, link[rel="icon"], link[rel="apple-touch-icon"]').each(
    (_, el) => {
      add($(el).attr('src') || $(el).attr('href') || '');
      for (const part of ($(el).attr('srcset') || '').split(','))
        add(part.trim().split(/\s+/)[0]);
    },
  );
  $('a[href]').each((_, el) => add($(el).attr('href')));
  $('style, [style]').each((_, el) => {
    for (const match of (
      ($(el).attr('style') || '') + ($(el).is('style') ? $(el).text() : '')
    ).matchAll(/url\(['"]?([^)'"\s]+)/g))
      add(match[1]);
  });
  // Save original styles as migration evidence, including icon/font dependencies.
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (
      /themes\/medici|clever-vc-addon.*cleverfont|js_composer.*css/.test(href)
    )
      add(href);
  });
}
const done = new Set();
while ([...queue.keys()].some((k) => !done.has(k))) {
  const batch = [...queue].filter(([k]) => !done.has(k)).slice(0, 6);
  await Promise.all(
    batch.map(async ([path, url]) => {
      done.add(path);
      const file = 'public' + path;
      try {
        await mkdir(file.substring(0, file.lastIndexOf('/')), {
          recursive: true,
        });
        let record = manifest.find(
          (m) => m.path === path && m.status === 'saved',
        );
        if (!record || !existsSync(file)) {
          const { stdout } = await exec('curl.exe', [
            '-sS',
            '-L',
            '--max-time',
            '35',
            '-w',
            '%{http_code}\n%{url_effective}',
            `https://web.archive.org/web/20250810004903id_/${url}`,
            '-o',
            file,
          ]);
          if (!stdout.startsWith('200')) throw new Error(stdout.split('\n')[0]);
          const buffer = await readFile(file);
          if (
            /^\s*<!doctype html|^\s*<html/i.test(
              buffer.toString('utf8', 0, 100),
            )
          )
            throw new Error('HTML instead of asset');
          record = {
            path,
            source: url,
            archivedUrl: stdout.split('\n')[1],
            status: 'saved',
            bytes: buffer.length,
          };
          manifest.splice(
            0,
            manifest.length,
            ...manifest.filter((m) => m.path !== path),
            record,
          );
          console.log('SAVED', path);
        }
        if (path.endsWith('.css')) {
          const css = await readFile(file, 'utf8');
          for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)/g))
            add(match[1], url);
        }
      } catch (error) {
        manifest.splice(
          0,
          manifest.length,
          ...manifest.filter((m) => m.path !== path),
          {
            path,
            source: url,
            status: 'failed',
            error: String(error).slice(0, 180),
          },
        );
        console.log('FAILED', path, String(error).slice(0, 100));
      }
    }),
  );
  await writeFile('.cache/assets.json', JSON.stringify(manifest, null, 2));
}
console.log(
  'Assets',
  manifest.filter((m) => m.status === 'saved').length,
  'Missing',
  manifest.filter((m) => m.status !== 'saved').length,
);
