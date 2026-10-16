import type { LocaleEntry, ResolvedConfig } from '../../src/config/schema';
import type { OutputDir } from '../lib/paths';

/**
 * Everything an emitter may read. Step 1b adds the validated content index here; emitters
 * never read content files themselves.
 */
export type EmitContext = {
  config: ResolvedConfig;
  /** Locales generated in this build (config.builtLocales). */
  locales: readonly LocaleEntry[];
  /** Same url module as the app, bound to this build's configuration. */
  url: ReturnType<typeof import('../../src/modules/url/create').createUrlModule>;
  /**
   * Writes one generated file. `dir` picks the output root (scripts/lib/paths.ts):
   * "public" is served under the base path at /generated/…, "internal" stays private,
   * "deploy" holds host configuration. Paths are relative to that root.
   */
  write: (dir: OutputDir, file: string, contents: string | Uint8Array) => void;
};

/**
 * One kind of build output (design doc §17.4). Adding an output means adding one file in
 * scripts/emitters/ whose default export is an Emitter; content-build discovers it.
 * Files starting with "_" and *.test.ts are not emitters.
 */
export type Emitter = {
  name: string;
  /** What the output is for, shown in the build log. */
  description: string;
  /** Lower runs first; default 100. Only needed when one output reads another. */
  order?: number;
  run: (ctx: EmitContext) => void | Promise<void>;
};

export function defineEmitter(emitter: Emitter): Emitter {
  return emitter;
}
