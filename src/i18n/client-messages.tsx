import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { pickNamespaces } from './catalog';

/** Namespaces every client component may use. Keep this small. */
export const CLIENT_COMMON_NAMESPACES = ['common', 'primitives', 'shell'] as const;

/**
 * Wrap a client island to give it the message namespaces it uses, plus the common ones.
 * Server components call getTranslations() directly and need no wrapper.
 *
 *   <ClientMessages namespaces={['feed']}><Feed … /></ClientMessages>
 */
export async function ClientMessages({
  namespaces = [],
  children,
}: {
  namespaces?: readonly string[];
  children: React.ReactNode;
}) {
  const messages = pickNamespaces(await getMessages(), [...CLIENT_COMMON_NAMESPACES, ...namespaces]);
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
