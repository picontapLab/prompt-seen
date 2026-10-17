import { serializeJsonLd, type JsonLdNode } from './structured-data';

/**
 * Structured data in the page body (design doc §9.6). A plain script element, not next/script:
 * JSON-LD is data, not code to run (Next.js JSON-LD guide). Rendered by pages on the server.
 */
export function JsonLd({ data }: { data: JsonLdNode }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
