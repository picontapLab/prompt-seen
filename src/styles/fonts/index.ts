import localFont from 'next/font/local';

// Self-hosted web fonts (design doc §11.1.2, §11.1.9): Fira Sans Extra Condensed 600/700 for
// display, IBM Plex Sans 400/500/600 for text, IBM Plex Mono 400/500 for metadata, IBM Plex Sans
// Arabic 400/500/600 for Arabic. Files: files/, from Fontsource 5.3.0 (SIL OFL 1.1, see OFL.txt).
//
// Each subset is its own @font-face with the subset's unicode-range, so a page downloads only
// the subsets its text uses: latin, latin-ext, cyrillic (and arabic). font-family is set
// explicitly, so every subset joins one family that src/styles/tokens/type.css names directly.
// Only the latin files of body text and the bold display face are preloaded. The size-adjusted
// "… Fallback" faces (local Arial with metrics from the latin file) keep swapping from moving text.
//
// "… for CJK" families reuse the same files with U+2014, U+2018–U+201F and U+2026 left out of
// the range, so Chinese and Japanese pages render those with full-width CJK glyphs (§11.1.2).
// next/font names a file after its preload and size-adjust settings, so the CJK faces of the two
// preloaded files (body 400, display 700) repeat the Latin faces' settings: the same file then has
// one address and CJK pages fetch the preloaded copy instead of a second one (step 6, §17.3).
// Their "… Fallback" faces are unused.
//
// next/font needs literal arguments, hence the repetition. Never call these from client code.

// IBM Plex Sans
export const plexSansLatin = localFont({
  src: './files/ibm-plex-sans-latin-400-normal.woff2',
  weight: '400',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const plexSansLatinHeavier = localFont({
  src: [
    { path: './files/ibm-plex-sans-latin-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const plexSansLatinExt = localFont({
  src: [
    { path: './files/ibm-plex-sans-latin-ext-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-sans-latin-ext-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-latin-ext-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
});
export const plexSansCyrillic = localFont({
  src: [
    { path: './files/ibm-plex-sans-cyrillic-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-sans-cyrillic-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-cyrillic-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans' },
    { prop: 'unicode-range', value: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
  ],
});
export const plexSansForCjk = localFont({
  src: './files/ibm-plex-sans-latin-400-normal.woff2',
  weight: '400',
  display: 'swap',
  preload: true, // as plexSansLatin: one address for the file
  adjustFontFallback: 'Arial',
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-2013,U+2015-2017,U+2020-2025,U+2027-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const plexSansForCjkHeavier = localFont({
  src: [
    { path: './files/ibm-plex-sans-latin-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-2013,U+2015-2017,U+2020-2025,U+2027-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const plexSansLatinExtForCjk = localFont({
  src: [
    { path: './files/ibm-plex-sans-latin-ext-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-sans-latin-ext-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-latin-ext-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
});

// Fira Sans Extra Condensed
export const firaLatin = localFont({
  src: './files/fira-sans-extra-condensed-latin-700-normal.woff2',
  weight: '700',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const firaLatinSemibold = localFont({
  src: './files/fira-sans-extra-condensed-latin-600-normal.woff2',
  weight: '600',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const firaLatinExt = localFont({
  src: [
    { path: './files/fira-sans-extra-condensed-latin-ext-600-normal.woff2', weight: '600' },
    { path: './files/fira-sans-extra-condensed-latin-ext-700-normal.woff2', weight: '700' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
});
export const firaCyrillic = localFont({
  src: [
    { path: './files/fira-sans-extra-condensed-cyrillic-600-normal.woff2', weight: '600' },
    { path: './files/fira-sans-extra-condensed-cyrillic-700-normal.woff2', weight: '700' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed' },
    { prop: 'unicode-range', value: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
  ],
});
export const firaForCjk = localFont({
  src: './files/fira-sans-extra-condensed-latin-700-normal.woff2',
  weight: '700',
  display: 'swap',
  preload: true, // as firaLatin: one address for the file
  adjustFontFallback: 'Arial',
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-2013,U+2015-2017,U+2020-2025,U+2027-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const firaForCjkSemibold = localFont({
  src: './files/fira-sans-extra-condensed-latin-600-normal.woff2',
  weight: '600',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-2013,U+2015-2017,U+2020-2025,U+2027-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const firaLatinExtForCjk = localFont({
  src: [
    { path: './files/fira-sans-extra-condensed-latin-ext-600-normal.woff2', weight: '600' },
    { path: './files/fira-sans-extra-condensed-latin-ext-700-normal.woff2', weight: '700' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'Fira Sans Extra Condensed for CJK' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
});

// IBM Plex Mono: metadata lines are short, so no size-adjusted fallback (only Arial or Times
// New Roman can be emulated, neither is monospaced); ui-monospace follows in the stack.
export const plexMonoLatin = localFont({
  src: [
    { path: './files/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Mono' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
});
export const plexMonoLatinExt = localFont({
  src: [
    { path: './files/ibm-plex-mono-latin-ext-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-mono-latin-ext-500-normal.woff2', weight: '500' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Mono' },
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
});
export const plexMonoCyrillic = localFont({
  src: [
    { path: './files/ibm-plex-mono-cyrillic-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-mono-cyrillic-500-normal.woff2', weight: '500' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Mono' },
    { prop: 'unicode-range', value: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
  ],
});

// IBM Plex Sans Arabic: Arabic script only; Latin runs fall through to IBM Plex Sans.
export const plexSansArabic = localFont({
  src: [
    { path: './files/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
    { path: './files/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
    { path: './files/ibm-plex-sans-arabic-arabic-600-normal.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'IBM Plex Sans Arabic' },
    {
      prop: 'unicode-range',
      value:
        'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1',
    },
  ],
});
