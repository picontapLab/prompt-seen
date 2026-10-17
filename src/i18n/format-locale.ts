// The locale next-intl formats with (design doc §8.6, §11.9). Pages are pre-rendered, and the
// browser formats the same text again when it takes over: dates, numbers and the `#` of plural
// messages. ICU versions disagree on some defaults (older ones write Arabic with Arabic-Indic
// digits, current CLDR and Node with Latin digits), and any difference makes React discard the
// server's HTML. The numbering system is therefore written into the tag, so every engine
// formats like the build. Registry code "ar" → "ar-u-nu-latn".

const EXTENSION = '-u-nu-latn';

/** The tag to give next-intl (and through it Intl) for a registry code. */
export const formatLocale = (code: string) => `${code}${EXTENSION}`;

/** The registry code back from next-intl's useLocale() / getLocale(). */
export const registryCode = (tag: string) => tag.split('-u-')[0]!;
