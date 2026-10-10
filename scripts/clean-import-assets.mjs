import { readFile, writeFile, rm, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
const root = resolve('public');
const manifest = JSON.parse(await readFile('.cache/assets.json', 'utf8'));
for (const asset of manifest) {
  const file = resolve('public', '.' + asset.path);
  if (!file.startsWith(root + sep))
    throw Error('Asset outside public: ' + file);
  if (asset.status !== 'saved' && existsSync(file)) await rm(file); // exact failed downloads only
  // Theme CSS is inspection evidence; it is not a runtime dependency of the rebuild.
  if (
    asset.status === 'saved' &&
    asset.path.endsWith('.css') &&
    existsSync(file)
  ) {
    const target = resolve('.cache/original-styles', '.' + asset.path);
    await mkdir(target.slice(0, target.lastIndexOf(sep)), { recursive: true });
    await rename(file, target);
  }
}
await mkdir('docs', { recursive: true });
await writeFile(
  'docs/asset-manifest.json',
  JSON.stringify(
    manifest.filter((a) => a.status === 'saved' && !a.path.endsWith('.css')),
    null,
    2,
  ),
);
console.log(
  'Removed failed downloads; original CSS retained in .cache for inspection.',
);
