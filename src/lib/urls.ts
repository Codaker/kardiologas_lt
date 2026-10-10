export const withBase = (path: string) => {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
};
