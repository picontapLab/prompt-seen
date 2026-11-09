// content:build (design doc §14.2): read and validate content/, build the content model for
// this configuration, then run every emitter in scripts/emitters/ with it. Blocking findings
// (errors and publish errors, §14.3) stop the build before any output is replaced.
//
//   npm run content:build              one build
//   npm run content:build -- --watch   rebuild whenever content/ changes (used by `npm run dev`;
//                                      --no-initial skips the first build)
import fs from 'node:fs';
import path from 'node:path';
import { ConfigError, contentDir, loadConfig } from '../src/config/load';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { loadEmitters } from './emitters/_registry';
import type { EmitContext, Emitter } from './emitters/_types';
import { printFindings } from './lib/content/findings';
import { loadContent } from './lib/content/load';
import { validateBuildMessages } from './lib/localization/messages';
import { validateEnabledLocale } from './lib/localization/check';
import { OUTPUT_DIRS, ROOT, type OutputDir } from './lib/paths';

async function build(emitters: Emitter[]): Promise<boolean> {
  const config = loadConfig(ROOT);
  const url = createUrlModule(urlConfigOf(config));

  const { findings, built } = loadContent({ root: ROOT, config, url });
  validateBuildMessages(ROOT, config, findings);
  validateEnabledLocale(ROOT, findings);
  // Warnings and info are for content:validate; the build only shows what blocks it.
  const blocking = findings.list.filter((f) => f.level === 'error' || f.level === 'publish');
  if (!built || findings.blocking) {
    printFindings(blocking, 'content:build stopped');
    return false;
  }

  // Generated directories are never edited by hand (§4.1); start each build from empty.
  for (const dir of Object.values(OUTPUT_DIRS)) fs.rmSync(dir, { recursive: true, force: true });

  const written: string[] = [];
  const ctx: EmitContext = {
    config,
    locales: config.builtLocales,
    content: built,
    url,
    write(dir: OutputDir, file: string, contents: string | Uint8Array) {
      const root = OUTPUT_DIRS[dir];
      const target = path.resolve(root, file);
      if (!target.startsWith(root + path.sep)) throw new Error(`emitter wrote outside ${dir}/: ${file}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
      written.push(path.relative(ROOT, target));
    },
  };

  for (const emitter of emitters) {
    const before = written.length;
    await emitter.run(ctx);
    console.log(
      `  ${emitter.name.padEnd(16)} ${String(written.length - before).padStart(4)} file(s)  ${emitter.description}`,
    );
  }
  const counts = Object.entries(built.manifest.counts)
    .map(([code, c]) => `${code} ${c.prompt}p/${c.template}t/${c.collection}c/${c.topic}s/${c.page}pg`)
    .join(', ');
  console.log(
    `content:build ${config.buildMode} ${config.buildId}: ${written.length} file(s) from ${emitters.length} emitter(s); ${counts}`,
  );
  return true;
}

async function main() {
  const emitters = await loadEmitters();
  const ok = process.argv.includes('--no-initial') || (await build(emitters));
  if (!process.argv.includes('--watch')) {
    if (!ok) process.exit(1);
    return;
  }

  // Watch mode: rebuild after edits settle. A failed rebuild keeps the previous output, so the
  // dev server keeps serving the last good content while the problem is fixed.
  const dir = contentDir(ROOT);
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let again = false;
  const rebuild = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      console.log(`\ncontent changed; rebuilding…`);
      await build(emitters);
    } catch (error) {
      console.error(error instanceof ConfigError ? `Invalid configuration in ${error.message}` : error);
    } finally {
      running = false;
      if (again) {
        again = false;
        void rebuild();
      }
    }
  };
  fs.watch(dir, { recursive: true }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void rebuild(), 200);
  });
  console.log(`content:build watching ${path.relative(ROOT, dir) || '.'}/`);
}

main().catch((error: unknown) => {
  console.error(error instanceof ConfigError ? `Invalid configuration in ${error.message}` : error);
  process.exit(1);
});
