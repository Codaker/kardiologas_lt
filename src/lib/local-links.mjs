import { readFileSync, existsSync } from 'node:fs';
const unavailable = JSON.parse(
  readFileSync(
    new URL('../../docs/unavailable-media.json', import.meta.url),
    'utf8',
  ),
);
/** Localize both Markdown and embedded HTML assets at build time. */
export function localLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/$/, '');
  return (tree) => {
    function visit(node) {
      // Keep original references editable in Markdown. Omit only documented,
      // unrecoverable media from HTML. Restoring the file automatically restores it.
      if (node.children)
        node.children = node.children.filter((child) => {
          const source =
            child.properties?.src ||
            (child.tagName === 'video'
              ? child.children?.find((c) => c.tagName === 'source')?.properties
                  ?.src
              : null);
          const href = child.tagName === 'a' ? child.properties?.href : null;
          const value = source || href;
          const path =
            typeof value === 'string'
              ? value
                  .replace(/^https?:\/\/(www\.)?kardiologas\.lt(?=\/)/, '')
                  .split('?')[0]
              : '';
          return !unavailable.some(
            (asset) =>
              asset.path === path &&
              !existsSync(new URL('../../public' + path, import.meta.url)),
          );
        });
      if (node.properties) {
        for (const key of ['href', 'src', 'poster']) {
          const value = node.properties[key];
          if (typeof value !== 'string') continue;
          const path = value.replace(
            /^https?:\/\/(www\.)?kardiologas\.lt(?=\/)/,
            '',
          );
          if (
            path.startsWith('/') &&
            !path.startsWith('//') &&
            !(prefix && path.startsWith(prefix + '/'))
          )
            node.properties[key] = prefix + path;
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
