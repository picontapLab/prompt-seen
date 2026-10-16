// content:build (design doc §14.2). Step 1a provides the frame: configuration, a clean set of
// output directories and the emitter registry. Step 1b adds reading, validation, the content
// index and MDX compilation before the emitters run, and passes the index in the context.
import fs from 'node:fs';
import path from 'node:path';
import { ConfigError, loadConfig } from '../src/config/load';
import { createUrlModule } from '../src/modules/url/create';
import { loadEmitters } from './emitters/_registry';
import type { EmitContext } from './emitters/_types';
import { OUTPUT_DIRS, ROOT, type OutputDir } from './lib/paths';

async function main() {
  const config = loadConfig(ROOT);

  // Generated directories are never edited by hand (§4.1); start each build from empty.
  for (const dir of Object.values(OUTPUT_DIRS)) fs.rmSync(dir, { recursive: true, force: true });

  const written: string[] = [];
  const ctx: EmitContext = {
    config,
    locales: config.builtLocales,
    url: createUrlModule({
      origin: config.origin,
      basePath: config.basePath,
      urlPattern: config.urlPattern,
      localePrefixes: config.locales.map((l) => l.pathPrefix),
    }),
    write(dir: OutputDir, file: string, contents: string | Uint8Array) {
      const root = OUTPUT_DIRS[dir];
      const target = path.resolve(root, file);
      if (!target.startsWith(root + path.sep)) throw new Error(`emitter wrote outside ${dir}/: ${file}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
      written.push(path.relative(ROOT, target));
    },
  };

  const emitters = await loadEmitters();
  for (const emitter of emitters) {
    const before = written.length;
    await emitter.run(ctx);
    console.log(
      `  ${emitter.name.padEnd(16)} ${String(written.length - before).padStart(3)} file(s)  ${emitter.description}`,
    );
  }
  console.log(
    `content:build ${config.buildMode} ${config.buildId}: ${written.length} file(s) from ${emitters.length} emitter(s)`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? `Invalid configuration in ${error.message}` : error);
  process.exit(1);
});
