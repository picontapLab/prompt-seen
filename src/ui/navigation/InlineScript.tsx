'use client';

/**
 * An inline script that runs once, while the server HTML is parsed (Next.js guide "Preventing
 * flash before hydration"). On the client the element is rendered inert (text/plain), so React
 * never renders an executable script: client navigations do not run it again and development
 * builds do not warn. suppressHydrationWarning covers that type difference on this element only.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? undefined : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
