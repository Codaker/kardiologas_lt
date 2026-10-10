import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';
const exec = promisify(execFile);
const pages = JSON.parse(await readFile('.cache/pages.json', 'utf8'));
await Promise.all(
  pages
    .filter((p) => p.error)
    .map(async (p) => {
      try {
        const { stdout } = await exec('curl.exe', [
          '-sS',
          '-L',
          '--max-time',
          '50',
          '-w',
          '%{http_code}\n%{url_effective}',
          `https://web.archive.org/web/20250810004903id_/https://www.kardiologas.lt${p.path}`,
          '-o',
          p.file,
        ]);
        const $ = load(await readFile(p.file, 'utf8'));
        if (
          !stdout.startsWith('200') ||
          !$('title').text().includes('kardiologas')
        )
          throw new Error(stdout);
        delete p.error;
        p.archivedUrl = stdout.split('\n')[1];
        p.title = $('title').text();
        p.links = [];
        console.log('Recovered', p.path);
      } catch (e) {
        console.log('Still unavailable', p.path, String(e).slice(0, 120));
      }
    }),
);
await writeFile('.cache/pages.json', JSON.stringify(pages, null, 2));
