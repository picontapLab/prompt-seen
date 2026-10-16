import Link from 'next/link';
import type { PromptDetail } from '@/lib/content';

/** Shared by the full detail page and the popup (design doc §11.3). */
export function PromptDetailBody({
  detail,
  headingId,
  as: Heading = 'h1',
}: {
  detail: PromptDetail;
  headingId?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <article className="detail" data-testid="detail-body" data-slug={detail.slug}>
      <div
        className="art"
        style={{ aspectRatio: detail.ratio, background: `hsl(${detail.hue} 55% 50%)` }}
        role="img"
        aria-label={detail.title}
      />
      <Heading id={headingId}>{detail.title}</Heading>
      <div dangerouslySetInnerHTML={{ __html: detail.bodyHtml }} />
      <pre data-testid="prompt-text">{detail.prompt}</pre>
      <p>
        {/* Soft navigation to another route from inside the popup (memo §3.5). */}
        <Link href={detail.templatesPath} data-testid="open-template">
          Open in template editor
        </Link>
      </p>
    </article>
  );
}
