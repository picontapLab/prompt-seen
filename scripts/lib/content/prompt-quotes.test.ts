import { describe, expect, it } from 'vitest';
import { Findings } from './findings';
import { checkPromptQuotations, emptyQuotations } from './prompt-quotes';
import type { Content, PromptRecord } from './read';

// Empty quotation marks left in rendered prompts (docs/home-ux-optimization-spec.md C-3).

describe('emptyQuotations', () => {
  it('finds straight, curly and corner quotes with nothing between them, with the words around', () => {
    expect(
      emptyQuotations('Keep the bars clear. Headline text to render exactly when supplied: "". If it is empty, leave them blank.'),
    ).toEqual(['o render exactly when supplied: "". If it is empty']);
    expect(emptyQuotations('严格呈现这段文字：“”。')).toEqual(['严格呈现这段文字：“”。']);
    expect(emptyQuotations('看板の文字：「」')).toEqual(['看板の文字：「」']);
  });

  it('ignores filled quotes, apostrophes and single quotes', () => {
    expect(emptyQuotations('Render "Run lighter" and “Made slowly”; it\'s fine; \'\' stays; 「春」.')).toEqual([]);
  });
});

describe('checkPromptQuotations', () => {
  const rec = {
    file: 'content/prompts/p_024/entry.yaml',
    data: { promptSource: { type: 'literal', language: 'en' }, annotations: [] },
    promptText: 'A tin. Render exactly: "".',
    promptLocales: new Map([
      ['zh-Hans', { file: 'content/prompts/p_024/prompt-locales/zh-Hans/variant.yaml', text: '一个茶罐。呈现文字：“”。', values: {}, annotations: [] }],
    ]),
  } as unknown as PromptRecord;

  it('warns once per empty quotation, in the source and in each localized prompt, never as an error', () => {
    const findings = new Findings('/repo');
    checkPromptQuotations({ templates: new Map() } as unknown as Content, rec, rec.promptText, findings);
    expect(findings.list.map((f) => `${f.level} ${f.file}: ${f.message}`)).toEqual([
      'warning content/prompts/p_024/entry.yaml: the prompt has an empty quotation: "…A tin. Render exactly: "".…"',
      'warning content/prompts/p_024/prompt-locales/zh-Hans/variant.yaml: the zh-Hans prompt has an empty quotation: "…一个茶罐。呈现文字：“”。…"',
    ]);
    expect(findings.blocking).toBe(0);
  });
});
