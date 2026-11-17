import { describe, expect, it } from 'vitest';
import { isSearchChord, singleKeyAction, type KeyLike } from './keys';

const key: KeyLike & Pick<KeyboardEvent, 'code'> = {
  key: 'л',
  code: 'KeyK',
  keyCode: 75,
  ctrlKey: true,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  repeat: false,
  defaultPrevented: false,
};

describe('search chord across keyboard layouts', () => {
  it('accepts either the Latin character or physical KeyK with Ctrl or Meta', () => {
    expect(isSearchChord(key)).toBe(true);
    expect(isSearchChord({ ...key, ctrlKey: false, metaKey: true })).toBe(true);
    expect(isSearchChord({ ...key, key: 'K', code: 'Unidentified' })).toBe(true);
    expect(isSearchChord({ ...key, key: 'л', code: 'Unidentified' })).toBe(false);
  });
  it.each(['altKey', 'shiftKey', 'isComposing', 'repeat', 'defaultPrevented'] as const)(
    'does not intercept an event with %s',
    (flag) => {
      expect(isSearchChord({ ...key, [flag]: true })).toBe(false);
    },
  );
  it('does not intercept ordinary Cyrillic typing or Safari composition', () => {
    expect(isSearchChord({ ...key, ctrlKey: false })).toBe(false);
    expect(isSearchChord({ ...key, keyCode: 229 })).toBe(false);
    expect(singleKeyAction({ ...key, key: 'с', ctrlKey: false })).toBeNull();
    expect(singleKeyAction({ ...key, key: 'ы', ctrlKey: false })).toBeNull();
    expect(singleKeyAction({ ...key, key: 'c', ctrlKey: false })).toBe('copy');
  });
});
