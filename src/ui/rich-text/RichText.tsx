import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { RichBlock, RichInline } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import { GifBadge } from '@/ui/media/GifBadge';
import styles from './RichText.module.css';

// Renders the rich text the build compiled from MDX (design doc §3.5, §5.3): a closed set of
// blocks, so pages and the detail popup render the same body without compiling anything in the
// browser. Works as a server or client component. Headings keep their build ids for anchors and
// tables of contents; question-style headings come from the content (§9.2).

function Inline({ nodes }: { nodes: readonly RichInline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text':
            return n.v;
          case 'strong':
            return (
              <strong key={i}>
                <Inline nodes={n.c} />
              </strong>
            );
          // Emphasis by weight, never italics: CJK and Arabic have no true italics (§11.1.2).
          case 'em':
            return (
              <strong key={i} className={styles.em}>
                <Inline nodes={n.c} />
              </strong>
            );
          case 'del':
            return (
              <del key={i}>
                <Inline nodes={n.c} />
              </del>
            );
          case 'code':
            return <code key={i}>{n.v}</code>;
          case 'br':
            return <br key={i} />;
          case 'link':
            return n.internal ? (
              <Link key={i} href={n.href} prefetch={false}>
                <Inline nodes={n.c} />
              </Link>
            ) : (
              // External links say so with ↗ and stay in this tab (§11.9).
              <a key={i} href={n.href} className={styles.external}>
                <Inline nodes={n.c} />
                <ArrowUpRight aria-hidden="true" />
              </a>
            );
        }
      })}
    </>
  );
}

function Block({ block }: { block: RichBlock }) {
  switch (block.t) {
    case 'p':
      return (
        <p>
          <Inline nodes={block.c} />
        </p>
      );
    case 'h2':
    case 'h3':
    case 'h4': {
      const Tag = block.t;
      return (
        <Tag id={block.id}>
          <Inline nodes={block.c} />
        </Tag>
      );
    }
    case 'ul':
    case 'ol': {
      const items = block.items.map((item, i) => (
        <li key={i}>
          {block.tight && item.length === 1 && item[0]!.t === 'p' ? (
            <Inline nodes={item[0]!.c} />
          ) : (
            item.map((b, j) => <Block key={j} block={b} />)
          )}
        </li>
      ));
      return block.t === 'ol' ? <ol start={block.start ?? undefined}>{items}</ol> : <ul>{items}</ul>;
    }
    case 'blockquote':
      return (
        <blockquote>
          {block.c.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </blockquote>
      );
    case 'pre':
      return (
        <pre dir="ltr">
          <code data-lang={block.lang ?? undefined}>{block.v}</code>
        </pre>
      );
    case 'hr':
      return <hr />;
    case 'table':
      return (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, i) => (
                  <th key={i} scope="col" style={{ textAlign: logical(block.align[i]) }}>
                    <Inline nodes={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} style={{ textAlign: logical(block.align[i]) }}>
                      <Inline nodes={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'figure': {
      const img = getImage(block.image, 'card');
      return (
        <figure className={styles.figure}>
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes="(min-width: 1024px) 40vw, 100vw"
            width={img.width}
            height={img.height}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            style={{ background: img.placeholder }}
          />
          {(block.caption || block.image.mimeType === 'image/gif') && (
            <figcaption>
              <GifBadge image={block.image} /> {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case 'callout':
      return (
        <aside className={styles.callout}>
          {block.c.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </aside>
      );
  }
}

/** Markdown alignment in logical terms, so tables mirror in right-to-left pages (§8.6). */
const logical = (a: 'left' | 'right' | 'center' | null | undefined) =>
  a === 'left' ? 'start' : a === 'right' ? 'end' : (a ?? undefined);

export function RichText({ blocks, className }: { blocks: readonly RichBlock[]; className?: string }) {
  return (
    <div className={[styles.rich, className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}
