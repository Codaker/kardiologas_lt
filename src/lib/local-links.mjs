/** Apply local base paths and new-tab behavior to Markdown and embedded HTML links. */
export function localLinks({
  base = '/',
  site = 'https://codaker.github.io',
} = {}) {
  const prefix = base.replace(/\/$/, '');
  const origin = new URL(site).origin;
  return (tree) => {
    function visit(node) {
      if (node.properties) {
        const href = node.properties.href;
        if (
          node.tagName === 'a' &&
          typeof href === 'string' &&
          /^(https?:)?\/\//i.test(href.trim()) &&
          new URL(href, site).origin !== origin
        ) {
          const rel = Array.isArray(node.properties.rel)
            ? node.properties.rel
            : String(node.properties.rel || '')
                .split(/\s+/)
                .filter(Boolean);
          node.properties.target = '_blank';
          node.properties.rel = [
            ...new Set([...rel, 'noopener', 'noreferrer']),
          ];
        }
        for (const key of ['href', 'src', 'poster']) {
          const value = node.properties[key];
          if (
            typeof value === 'string' &&
            value.startsWith('/') &&
            !value.startsWith('//') &&
            !(prefix && value.startsWith(prefix + '/'))
          )
            node.properties[key] = prefix + value;
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
