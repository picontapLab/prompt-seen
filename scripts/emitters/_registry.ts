import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Emitter } from './_types';

export const EMITTERS_DIR = path.dirname(fileURLToPath(import.meta.url));

const isEmitterFile = (file: string) =>
  file.endsWith('.ts') && !file.startsWith('_') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts');

function assertEmitter(value: unknown, file: string): asserts value is Emitter {
  const e = value as Partial<Emitter> | undefined;
  if (!e || typeof e.name !== 'string' || typeof e.description !== 'string' || typeof e.run !== 'function') {
    throw new Error(`${file}: default export must be an Emitter (use defineEmitter from ./_types)`);
  }
}

/** Discovers every emitter in a directory, ordered by `order` then name. */
export async function loadEmitters(dir: string = EMITTERS_DIR): Promise<Emitter[]> {
  const files = fs.readdirSync(dir).filter(isEmitterFile).sort();
  const emitters: Emitter[] = [];
  for (const file of files) {
    const mod = (await import(pathToFileURL(path.join(dir, file)).href)) as { default?: unknown };
    assertEmitter(mod.default, file);
    emitters.push(mod.default);
  }
  const names = new Set<string>();
  for (const e of emitters) {
    if (names.has(e.name)) throw new Error(`duplicate emitter name "${e.name}"`);
    names.add(e.name);
  }
  return emitters.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
}
