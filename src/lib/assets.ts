import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { withBase } from './urls';

/** Decorative source assets are optional because some archive captures are missing. */
export function backgroundFor(path: string) {
  return existsSync(resolve('public', `.${path}`))
    ? `background-image: url("${withBase(path)}")`
    : undefined;
}
