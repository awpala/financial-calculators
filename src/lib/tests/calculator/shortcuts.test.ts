import { describe, expect, it } from 'vitest';
import {
  isCalculateShortcut,
  isClearInputsShortcut,
} from '#lib/calculator/presentation/shortcuts.js';

const plain = {
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
};
const enter = { ...plain, key: 'Enter', code: 'Enter' };
const space = { ...plain, key: ' ', code: 'Space' };
const letterC = { ...plain, key: 'c', code: 'KeyC' };
const letterL = { ...plain, key: 'l', code: 'KeyL' };
const clearChord = { ...letterL, ctrlKey: true };

describe('calculator shortcuts', () => {
  it('calculates on Shift+Enter only', () => {
    expect(isCalculateShortcut({ ...enter, shiftKey: true })).toBe(true);
    expect(isCalculateShortcut(enter)).toBe(false);
    expect(isCalculateShortcut({ ...space, shiftKey: true })).toBe(false);
    expect(isCalculateShortcut({ ...letterC, shiftKey: true })).toBe(false);
    expect(
      isCalculateShortcut({ ...enter, ctrlKey: true, shiftKey: true }),
    ).toBe(false);
  });

  it('clears on Ctrl+L only, by physical key or by character', () => {
    expect(isClearInputsShortcut({ ...clearChord, key: 'L' })).toBe(true);
    expect(isClearInputsShortcut({ ...clearChord, key: '' })).toBe(true);
    expect(
      isClearInputsShortcut({ ...clearChord, code: 'KeyJ', key: 'l' }),
    ).toBe(true);
    expect(isClearInputsShortcut(letterL)).toBe(false);
    expect(isClearInputsShortcut({ ...clearChord, shiftKey: true })).toBe(
      false,
    );
    expect(isClearInputsShortcut({ ...clearChord, altKey: true })).toBe(false);
    expect(isClearInputsShortcut({ ...clearChord, metaKey: true })).toBe(false);
    expect(isClearInputsShortcut({ ...clearChord, isComposing: true })).toBe(
      false,
    );
    expect(
      isClearInputsShortcut({ ...clearChord, code: 'KeyC', key: 'c' }),
    ).toBe(false);
    expect(
      isClearInputsShortcut({ ...letterC, ctrlKey: true, shiftKey: true }),
    ).toBe(false);
  });

  it('does not clear on a bare letter, which is ordinary text', () => {
    expect(isClearInputsShortcut({ ...letterL, shiftKey: true })).toBe(false);
    expect(isClearInputsShortcut({ ...letterC, shiftKey: true })).toBe(false);
  });

  it.each(['altKey', 'metaKey', 'isComposing'] as const)(
    'declines every chord while %s is also active',
    (extra) => {
      expect(
        isCalculateShortcut({ ...enter, shiftKey: true, [extra]: true }),
      ).toBe(false);
      expect(isClearInputsShortcut({ ...clearChord, [extra]: true })).toBe(
        false,
      );
    },
  );

  it('declines calculating while Ctrl is also held', () => {
    expect(
      isCalculateShortcut({ ...enter, shiftKey: true, ctrlKey: true }),
    ).toBe(false);
  });
});
