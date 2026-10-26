import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../src/config/schema';
import { Findings } from './findings';
import type { Content } from './read';
import { validateHomeSettings } from './validate-home';

// home.featured in site.yaml (design doc §11.8.1): only existing, annotated prompts go on show.

const content = {
  prompts: new Map([
    ['p_001', { data: { annotations: [{ phrase: 'a red seal' }] } }],
    ['p_002', { data: { annotations: [] } }],
  ]),
} as unknown as Content;

const check = (featured: ResolvedConfig['home']['featured']) => {
  const findings = new Findings('/repo');
  validateHomeSettings(content, { home: { featured } } as ResolvedConfig, findings);
  return findings.list.map((f) => `${f.level} ${f.field}: ${f.message}`);
};

describe('validateHomeSettings', () => {
  it('accepts annotated prompts', () => {
    expect(check([{ prompt: 'p_001', from: '2026-10-01' }])).toEqual([]);
  });

  it('rejects missing and unannotated prompts, and warns about repeats', () => {
    expect(check([{ prompt: 'p_404' }, { prompt: 'p_002' }, { prompt: 'p_001' }, { prompt: 'p_001' }])).toEqual([
      'error home.featured.0.prompt: prompt p_404 does not exist',
      'error home.featured.1.prompt: the featured work p_002 has no annotations',
      'warning home.featured.3.prompt: p_001 is featured more than once; only its first entry counts',
    ]);
  });
});
