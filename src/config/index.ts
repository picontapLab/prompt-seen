// The resolved configuration for app code (server and client). Values are fixed at build
// time by scripts/config-gen.ts; nothing here reads files or the environment (§4.1).
import type { LocaleEntry } from './schema';
import { CONFIG } from './generated/config';

export type { BuiltLocalePrefix, LocaleCode, LocalePrefix } from './generated/config';
export type { BuildMode, LocaleEntry, ResolvedConfig } from './schema';

export const config = CONFIG;

/** Locales generated in this build, in registry order. */
export const builtLocales: readonly LocaleEntry[] = CONFIG.builtLocales;

export const defaultLocale: LocaleEntry = CONFIG.locales.find((l) => l.code === CONFIG.defaultLocale)!;

export function localeByPrefix(prefix: string): LocaleEntry | undefined {
  return builtLocales.find((l) => l.pathPrefix === prefix);
}

export function localeByCode(code: string): LocaleEntry | undefined {
  return builtLocales.find((l) => l.code === code);
}

/** True when pages must carry noindex: every non-production build (§15.1). */
export const isPreviewBuild = CONFIG.buildMode === 'preview';
