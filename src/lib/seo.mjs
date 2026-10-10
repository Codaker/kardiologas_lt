export const canonicalPaths = {
  '/informacija-pacientui/': '/informacija-pacientams/',
  '/informacija-pacientui/page/2/': '/informacija-pacientams/page/2/',
  '/category/paslaugos-ir-tyrimai/': '/paslaugos-ir-tyrimai/',
};

/** @param {string} path */
export function canonicalPath(path) {
  return Object.hasOwn(canonicalPaths, path)
    ? canonicalPaths[/** @type {keyof typeof canonicalPaths} */ (path)]
    : path;
}
