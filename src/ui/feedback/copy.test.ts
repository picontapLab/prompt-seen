import { describe, expect, it } from 'vitest';
import { normalizeCopyText } from './copy';

describe('normalizeCopyText', () => {
  it('uses LF line breaks and trims the ends only', () => {
    expect(normalizeCopyText('  line one\r\nline two\r\n\r\n  indented\n')).toBe('line one\nline two\n\n  indented');
    expect(normalizeCopyText('old\rmac')).toBe('old\nmac');
  });
});
