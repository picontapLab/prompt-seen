import type { Alternate } from '@/modules/content/types';

/** Browse destinations are independent of search-engine language associations. */
export function LanguageLinks({ links }: { links: readonly (Alternate & { contentLocale: string })[] }) {
  return <span hidden data-language-links={JSON.stringify(links)} />;
}
