import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const manifest = JSON.parse(await readFile('.cache/assets.json', 'utf8'));
for (const asset of manifest.filter(
  (a) => a.status !== 'saved' && a.path.includes('/uploads/'),
)) {
  const candidates = [];
  const clean = new URL(asset.source);
  clean.search = '';
  if (asset.source !== clean.href) candidates.push(clean.href);
  if (asset.path.endsWith('.mp4'))
    candidates.push('https://kardiologas.lt' + asset.path);
  if (asset.path.includes('medici-slider')) {
    candidates.push(
      'https://kardiologas.lt' + asset.path.replace('-300x207', ''),
    );
    candidates.push(
      'https://kardiologas.lt' +
        asset.path.replace('-e1752741478152-300x207', ''),
    );
  }
  for (const source of candidates) {
    try {
      const file = 'public' + asset.path;
      await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
      const { stdout } = await exec('curl.exe', [
        '-sS',
        '-L',
        '--retry',
        '1',
        '--max-time',
        '25',
        '-w',
        '%{http_code}\n%{url_effective}',
        `https://web.archive.org/web/20250810004903id_/${source}`,
        '-o',
        file,
      ]);
      if (!stdout.startsWith('200')) throw Error(stdout);
      const bytes = await readFile(file);
      if (/^\s*(<!doctype|<html)/i.test(bytes.toString('utf8', 0, 100)))
        throw Error('HTML');
      Object.assign(asset, {
        status: 'saved',
        archivedUrl: stdout.split('\n')[1],
        bytes: bytes.length,
        recoveredFrom: source,
      });
      delete asset.error;
      console.log('Recovered', asset.path);
      break;
    } catch (e) {
      console.log('Unavailable', asset.path, String(e).slice(0, 80));
    }
  }
}
const holter = manifest.find((a) =>
  a.path.endsWith('Holter-monitor-150x150.jpg'),
);
if (holter && holter.status !== 'saved') {
  await copyFile(
    'public/wp-content/uploads/2019/04/Holter-monitor.jpg',
    'public' + holter.path,
  );
  Object.assign(holter, {
    status: 'saved',
    recoveredFrom: '/wp-content/uploads/2019/04/Holter-monitor.jpg',
    note: 'Original full-size image retained at the old thumbnail URL.',
  });
  delete holter.error;
}
await writeFile('.cache/assets.json', JSON.stringify(manifest, null, 2));
