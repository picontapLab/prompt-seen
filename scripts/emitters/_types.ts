import type { LocaleEntry, ResolvedConfig } from '../../src/config/schema';
import type { BuiltContent } from '../lib/content/build-index';
import type { OutputDir } from '../lib/paths';

/**
 * Everything an emitter may read. Emitters never read content files themselves: they use the
 * validated content model in `content`.
 */
export type EmitContext = {
  config: ResolvedConfig;
  /** Locales generated in this build (config.builtLocales). */
  locales: readonly LocaleEntry[];
  /**
   * What this build shows (src/modules/content/types.ts): the manifest with redirects and
   * removed addresses, a summary index per locale and every detail model.
   */
  content: BuiltContent;
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
