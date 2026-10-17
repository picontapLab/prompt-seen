import { describe, expect, it } from 'vitest';
import type { RichBlock } from '@/modules/content/types';
import { codeBlock, codeSpan, richText, type MarkdownContext } from './markdown';

const ctx: MarkdownContext = {
  absoluteUrl: (path) => `https://example.com/prompt-seen${path}`,
  absoluteImageUrl: (v) => `https://example.com/prompt-seen/${v.key}`,
  t: (key) => key,
  languageName: (tag) => tag,
};

describe('code', () => {
  it('fences any prompt, including one that contains a fence', () => {
    expect(codeBlock('plain')).toBe('```text\nplain\n```');
    expect(codeBlock('a ```js b``` c')).toBe('````text\na ```js b``` c\n````');
  });

  it('wraps a span around backticks', () => {
    expect(codeSpan('{{product}}')).toBe('`{{product}}`');
    expect(codeSpan('a `b` c')).toBe('``a `b` c``');
    expect(codeSpan('`x')).toBe('`` `x ``');
  });
});

describe('richText', () => {
  it('keeps headings, emphasis and absolute links', () => {
    const blocks: RichBlock[] = [
      { t: 'h2', id: 'how', c: [{ t: 'text', v: 'How do I adjust it?' }] },
      {
        t: 'p',
        c: [
          { t: 'text', v: 'Start from the ' },
          {
            t: 'link',
            href: '/en/templates/ink-scroll/',
            internal: true,
            c: [{ t: 'text', v: 'ink scroll template' }],
          },
          { t: 'text', v: ', or read ' },
          {
            t: 'link',
            href: 'https://example.org/a (b)',
            internal: false,
            c: [{ t: 'em', c: [{ t: 'text', v: 'this' }] }],
          },
          { t: 'text', v: '.' },
        ],
      },
    ];
    expect(richText(blocks, ctx)).toBe(
      '## How do I adjust it?\n\nStart from the [ink scroll template](https://example.com/prompt-seen/en/templates/ink-scroll/), or read [*this*](<https://example.org/a (b)>).',
    );
  });

  it('escapes text that would otherwise read as Markdown', () => {
    expect(richText([{ t: 'p', c: [{ t: 'text', v: 'Use *two* [brackets] and a_b | c' }] }], ctx)).toBe(
      'Use \\*two\\* \\[brackets\\] and a\\_b \\| c',
    );
  });

  it('writes tight and loose lists with nested content lined up', () => {
    const item = (text: string): RichBlock[] => [{ t: 'p', c: [{ t: 'text', v: text }] }];
    expect(richText([{ t: 'ul', start: null, tight: true, items: [item('one'), item('two')] }], ctx)).toBe(
      '- one\n- two',
    );
    expect(
      richText(
        [
          {
            t: 'ol',
            start: 3,
            tight: false,
            items: [[...item('three'), { t: 'pre', lang: null, v: 'x' }], item('four')],
          },
        ],
        ctx,
      ),
    ).toBe('3. three\n\n   ```\n   x\n   ```\n\n4. four');
  });

  it('turns tables, callouts and figures into their Markdown forms', () => {
    const blocks: RichBlock[] = [
      {
        t: 'table',
        align: [null, 'right'],
        head: [[{ t: 'text', v: 'Ratio' }], [{ t: 'text', v: 'Seed' }]],
        rows: [[[{ t: 'text', v: '4:5' }], [{ t: 'text', v: '7919' }]]],
      },
      { t: 'callout', c: [{ t: 'p', c: [{ t: 'text', v: 'Place the seal.' }] }] },
      {
        t: 'figure',
        caption: 'Seal at top right',
        image: {
          alt: 'A red [seal]',
          variants: { detail: { key: 'media/a_015/d.webp', width: 10, height: 10, mimeType: 'image/webp' } },
        } as never,
      },
    ];
    expect(richText(blocks, ctx)).toBe(
      [
        '| Ratio | Seed |\n| --- | ---: |\n| 4:5 | 7919 |',
        '> Place the seal.',
        '![A red \\[seal\\]](https://example.com/prompt-seen/media/a_015/d.webp)\n*Seal at top right*',
      ].join('\n\n'),
    );
  });
});
