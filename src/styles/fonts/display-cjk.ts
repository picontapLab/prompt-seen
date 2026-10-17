// CJK display faces (design doc §11.1.2, §11.1.9): bold Noto Sans per script, subset at build
// time to the characters the build knows (titles and interface text) by the `display-fonts`
// emitter, and named in the --font-display stacks of src/styles/tokens/type.css. Shared by the
// emitter and the stylesheet link, so the two agree on which locales have one.

export type DisplayFace = {
  /** font-family in type.css. */
  family: string;
  /** Fontsource variable package with the source slices (SIL OFL 1.1). */
  package: string;
  /** File prefix inside the package's files/ directory. */
  id: string;
};

/** By registry code; locales not listed use the Latin display face only. */
export const DISPLAY_CJK: Readonly<Record<string, DisplayFace>> = {
  'zh-Hans': { family: 'Noto Sans SC', package: '@fontsource-variable/noto-sans-sc', id: 'noto-sans-sc' },
  'zh-Hant': { family: 'Noto Sans TC', package: '@fontsource-variable/noto-sans-tc', id: 'noto-sans-tc' },
  ja: { family: 'Noto Sans JP', package: '@fontsource-variable/noto-sans-jp', id: 'noto-sans-jp' },
  ko: { family: 'Noto Sans KR', package: '@fontsource-variable/noto-sans-kr', id: 'noto-sans-kr' },
};

/**
 * Interface messages set in the display face, by key prefix ("namespace.path"). Entry titles
 * are always included. A step that puts other interface text in `var(--font-display)` adds its
 * keys here, so the subsets hold those characters too and stay small otherwise.
 */
export const DISPLAY_MESSAGE_KEYS: readonly string[] = [
  'shell.nav', // section links in the narrow-screen menu
];

/** The generated stylesheet of a locale, relative to public/generated/. */
export const displayFontCss = (code: string) => `fonts/${code}.css`;
