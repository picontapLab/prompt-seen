import { describe, expect, it } from 'vitest';
import { matchingExample } from './examples';

describe('matching a template preview to a recorded generation', () => {
  const run = { id: 'x_001', prompt: 'A red cup', template: { id: 't_001', version: 'v1', values: { color: 'red' } } };
  it('shows only a run with the same template, version, values and exact prompt', () => {
    expect(matchingExample([run], 't_001', 'v1', { color: 'red' }, 'A red cup')?.id).toBe('x_001');
    expect(matchingExample([run], 't_001', 'v2', { color: 'red' }, 'A red cup')).toBeNull();
    expect(matchingExample([run], 't_001', 'v1', { color: 'blue' }, 'A blue cup')).toBeNull();
    expect(matchingExample([run], 't_001', 'v1', { color: 'red' }, 'A red bowl')).toBeNull();
  });
});
