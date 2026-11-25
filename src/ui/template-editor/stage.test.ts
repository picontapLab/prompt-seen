import { describe, expect, it } from 'vitest';
import type { LocalizedField, TemplateSample } from '@/modules/content/types';
import { dividerPosition, sampleRuns, stageMode } from './stage';

// The example stage's pure parts (design doc §11.8.4 案例舞台): which layout an example gets, which
// recorded run belongs to which sample, and where a pointer puts the compare divider. The stage
// in a browser is tested in tests/e2e/editor.browser.spec.ts.

const frame = (width: number, height: number, animated = false) => ({
  width,
  height,
  animation: animated ? { frameCount: 12, durationMs: 1200, loopCount: null } : undefined,
});

describe('the layout of an example', () => {
  it('shows a result without inputs alone', () => {
    expect(stageMode(frame(1122, 1402), [])).toBe('single');
  });
  it('lays one input over the result when both have the same frame', () => {
    expect(stageMode(frame(1536, 1024), [frame(1536, 1024)])).toBe('compare');
    // Another size of the same ratio, and a ratio within 2%, are still the same frame.
    expect(stageMode(frame(1536, 1024), [frame(768, 512)])).toBe('compare');
    expect(stageMode(frame(1154, 1363), [frame(1100, 1300)])).toBe('compare');
  });
  it('puts inputs beside the result when the frame changes or there are several', () => {
    expect(stageMode(frame(1024, 1536), [frame(1536, 1024)])).toBe('inputs');
    expect(stageMode(frame(1122, 1402), [frame(1254, 1254)])).toBe('inputs');
    expect(stageMode(frame(1086, 1448), [frame(1086, 1448), frame(1086, 1448)])).toBe('inputs');
  });
  it('never lays an animated image under a divider', () => {
    expect(stageMode(frame(1024, 1024, true), [frame(1024, 1024)])).toBe('inputs');
    expect(stageMode(frame(1024, 1024), [frame(1024, 1024, true)])).toBe('inputs');
  });
});

describe('the recorded run of each sample', () => {
  const target: LocalizedField = {
    label: 'Person to remove',
    help: null,
    groupLabel: null,
    optionLabels: {},
    name: 'target',
    type: 'string',
    required: true,
    group: 'text',
    default: 'the passerby in red',
    minLength: null,
    maxLength: null,
    multiline: false,
  };
  const spec = { body: 'Remove {{target}} and its shadow.', fields: [target] };
  const template = { id: 't_076', version: 'v1', language: 'en' };
  const run = (id: string, value: string, version = 'v1') => ({
    id,
    prompt: `Remove ${value} and its shadow.`,
    promptLanguage: 'en',
    template: { id: 't_076', version, values: { target: value } },
  });
  const red = run('x_1', 'the passerby in red');
  const blue = run('x_2', 'the passerby in blue');

  it('pairs samples with the runs of their exact values, in sample order', () => {
    const samples: TemplateSample[] = [
      { name: 'default', values: { target: 'the passerby in red' } },
      { name: 'alternate', values: { target: 'the passerby in blue' } },
    ];
    expect(sampleRuns([blue, red], samples, spec, template).map((r) => r?.id)).toEqual(['x_1', 'x_2']);
  });
  it('leaves a sample that was never run without an image', () => {
    const samples: TemplateSample[] = [
      { name: 'default', values: { target: 'the passerby in red' } },
      { name: 'green', values: { target: 'the passerby in green' } },
    ];
    expect(sampleRuns([red, blue], samples, spec, template)).toEqual([red, null]);
  });
  it('does not borrow a run of another version, language or named sample', () => {
    const samples: TemplateSample[] = [{ name: 'default', values: { target: 'the passerby in red' } }];
    expect(sampleRuns([run('x_3', 'the passerby in red', 'v0')], samples, spec, template)).toEqual([null]);
    expect(sampleRuns([red], samples, spec, { ...template, language: 'zh-Hans' })).toEqual([null]);
    const named: TemplateSample[] = [{ ...samples[0]!, exampleIds: ['x_9'] }];
    expect(sampleRuns([red], named, spec, template)).toEqual([null]);
  });
  it('fills a sample from the field defaults before matching', () => {
    const samples: TemplateSample[] = [{ name: 'default', values: {} }];
    expect(sampleRuns([red], samples, spec, template)).toEqual([red]);
  });
});

describe('the compare divider under a pointer', () => {
  const box = { left: 100, width: 400 };
  it('is the share of the frame before the pointer, as a whole percentage', () => {
    expect(dividerPosition(100, box, false)).toBe(0);
    expect(dividerPosition(300, box, false)).toBe(50);
    expect(dividerPosition(401, box, false)).toBe(75);
  });
  it('stays within the frame', () => {
    expect(dividerPosition(40, box, false)).toBe(0);
    expect(dividerPosition(900, box, false)).toBe(100);
  });
  it('counts from the other edge in right-to-left pages', () => {
    expect(dividerPosition(200, box, true)).toBe(75);
    expect(dividerPosition(100, box, true)).toBe(100);
  });
  it('rests in the middle before the frame has a size', () => {
    expect(dividerPosition(10, { left: 0, width: 0 }, false)).toBe(50);
  });
});
