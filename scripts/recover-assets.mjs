import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const manifest = JSON.parse(await readFile('.cache/assets.json', 'utf8'));
manifest.push({
  path: '/wp-content/uploads/2024/06/Coronary-artery-anatomy-Coronary-angiogram.mp4.mp4',
  source:
    'http://www.kardiologas.lt/wp-content/uploads/2024/06/Coronary-artery-anatomy-Coronary-angiogram.mp4.mp4',
  status: 'failed',
});
for (const asset of manifest.filter(
  (m) =>
    m.status !== 'saved' &&
    (/\/uploads\//.test(m.path) || /cleversoft\.woff2/.test(m.path)),
)) {
  await mkdir(('public' + asset.path).split('/').slice(0, -1).join('/'), {
    recursive: true,
  });
  const sources = [
    asset.source,
    asset.source.replace('https://kardiologas.lt', 'http://www.kardiologas.lt'),
  ];
  for (const source of [...new Set(sources)]) {
    try {
      const { stdout } = await exec('curl.exe', [
        '-sS',
        '-L',
        '--retry',
        '2',
        '--max-time',
        '35',
        '-w',
        '%{http_code}\n%{url_effective}',
        `https://web.archive.org/web/20250810004903id_/${source}`,
        '-o',
        'public' + asset.path,
      ]);
      if (!stdout.startsWith('200')) throw new Error(stdout);
      const buffer = await readFile('public' + asset.path);
      if (/^\s*(<!doctype|<html)/i.test(buffer.toString('utf8', 0, 100)))
        throw new Error('HTML instead of asset');
      asset.status = 'saved';
      asset.bytes = buffer.length;
      asset.archivedUrl = stdout.split('\n')[1];
      delete asset.error;
      console.log('RECOVERED', asset.path);
      break;
    } catch (e) {
      console.log('RETRY', asset.path, e.stderr || String(e));
    }
  }
  await writeFile('.cache/assets.json', JSON.stringify(manifest, null, 2));
}
