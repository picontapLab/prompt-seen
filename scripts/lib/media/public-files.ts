import fs from 'node:fs';
import path from 'node:path';
import { MEDIA_KEY_PATTERN } from '../content/schemas';

/** Include historical image URLs that are still public even after their YAML stops referencing them. */
export function publicMediaKeys(publicDir: string): string[] {
  const dir = path.join(publicDir, 'media');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(publicDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .filter((key) => MEDIA_KEY_PATTERN.test(key));
}
