import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';

const exec = promisify(execFile);
const snapshot = '20250810004903';
const origin = 'https://kardiologas.lt';
await mkdir('.cache/archive', { recursive: true });
export async function download(url, target) {
  await mkdir(target.replace(/[/\\][^/\\]+$/, ''), { recursive: true });
  const { stdout } = await exec(
    'curl.exe',
    [
      '-sS',
      '-L',
      '--retry',
      '1',
      '--max-time',
      '60',
      '-w',
      '%{http_code}\n%{url_effective}',
      `https://web.archive.org/web/${snapshot}id_/${url}`,
      '-o',
      target,
    ],
    { maxBuffer: 1024 * 1024 },
  );
  if (!stdout.startsWith('200')) throw new Error(stdout);
  return stdout.split('\n')[1];
}
const queue = ['/'];
const seen = new Set();
const pages = [];
while (queue.length && seen.size < 100) {
  const batch = queue.splice(0, 4).filter((path) => !seen.has(path));
  batch.forEach((path) => seen.add(path));
  await Promise.all(
    batch.map(async (path) => {
      const file = `.cache/archive/${createHash('sha1').update(path).digest('hex')}.html`;
      try {
        let archivedUrl = `https://web.archive.org/web/${snapshot}/${origin}${path}`;
        if (!existsSync(file)) {
          if (path === '/' && existsSync('archive-home.html'))
            await writeFile(file, await readFile('archive-home.html'));
          else archivedUrl = await download(origin + path, file);
        }
        const html = await readFile(file, 'utf8');
        const $ = load(html);
        if (!$('body').length || !$('title').text().includes('kardiologas'))
          throw new Error('Not a captured site page');
        const links = new Set();
        $('a[href]').each((_, a) => {
          try {
            const url = new URL($(a).attr('href'), origin + path);
            if (
              url.hostname.replace(/^www\./, '') !== 'kardiologas.lt' ||
              url.search
            )
              return;
            if (
              /\.(jpg|png|gif|jpeg|pdf|webp|svg|mp4|zip)$/i.test(url.pathname)
            )
              return;
            if (
              /^\/(wp-|feed|comments|xmlrpc|cart|checkout|my-account)/.test(
                url.pathname,
              ) ||
              /\/feed\/$/.test(url.pathname)
            )
              return;
            links.add(decodeURI(url.pathname));
          } catch {}
        });
        for (const link of links)
          if (!seen.has(link) && !queue.includes(link)) queue.push(link);
        pages.push({
          path,
          file,
          archivedUrl,
          title: $('title').text(),
          links: [...links],
        });
        console.log(path, $('title').text(), 'links:', links.size);
      } catch (error) {
        pages.push({ path, file, error: String(error) });
        console.log('FAILED', path, String(error).slice(0, 160));
      }
    }),
  );
  await writeFile('.cache/pages.json', JSON.stringify(pages, null, 2));
}
console.log(
  'Captured',
  pages.filter((p) => !p.error).length,
  'Failed',
  pages.filter((p) => p.error).length,
);
