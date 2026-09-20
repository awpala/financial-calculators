import { describe, expect, it } from 'vitest';
import {
  DeclaredNames,
  isNumericName,
  isWordCharacter,
  normalizeName,
} from '#lib/calculator/parsers/names.js';

describe('calculator names', () => {
  it.each([
    ['total', 'total'],
    ['  gross \t pay\n', 'gross pay'],
    ['# heading\nnet (after tax) # note\n', 'net (after tax)'],
    ['# only a comment', ''],
    ['café €', 'café €'],
  ])('normalizes %j', (raw, expected) => {
    expect(normalizeName(raw)).toBe(expected);
  });

  it('recognizes names that read as numbers', () => {
    for (const name of ['1', '1,000.50', '$5', '1_000', '. $', '5%']) {
      expect(isNumericName(name)).toBe(true);
    }
    for (const name of ['1st', 'q1', '$x', '-5', 'rate %']) {
      expect(isNumericName(name)).toBe(false);
    }
  });

  it('treats letters and digits of any script and underscores as word characters', () => {
    for (const char of ['a', 'é', 'ж', '7', '_']) {
      expect(isWordCharacter(char)).toBe(true);
    }
    for (const char of [' ', '-', '€', '(', undefined]) {
      expect(isWordCharacter(char)).toBe(false);
    }
  });

  describe('DeclaredNames', () => {
    function declared(...names: string[]): DeclaredNames {
      const set = new DeclaredNames();
      names.forEach((name, index) => set.declare(name, index + 1));
      return set;
    }

    it('records the line each name was declared on', () => {
      const names = declared('a', 'b c');
      expect(names.lineOf('b c')).toBe(2);
      expect(names.lineOf('b')).toBeUndefined();
    });

    it('matches the longest name at an index, spaces matching any whitespace', () => {
      const names = declared('assets', 'assets new', 'new');
      expect(names.match('assets new', 0, 10)).toEqual({
        name: 'assets new',
        end: 10,
      });
      expect(names.match('x assets\n\t new + 1', 2, 18)).toEqual({
        name: 'assets new',
        end: 14,
      });
      expect(names.match('assets - new', 0, 12)).toEqual({
        name: 'assets',
        end: 6,
      });
    });

    it('requires a word boundary after a name ending in a word character', () => {
      const names = declared('tax', 'rate %');
      expect(names.match('taxes', 0, 5)).toBeUndefined();
      expect(names.match('tax_2', 0, 5)).toBeUndefined();
      expect(names.match('tax+1', 0, 5)).toEqual({ name: 'tax', end: 3 });
      expect(names.match('rate %2', 0, 7)).toEqual({ name: 'rate %', end: 6 });
    });

    it('matches symbols literally and stays within the limit', () => {
      const names = declared('a.b (c)', 'x*');
      expect(names.match('a.b (c)', 0, 7)).toEqual({ name: 'a.b (c)', end: 7 });
      expect(names.match('aXb (c)', 0, 7)).toBeUndefined();
      expect(names.match('x*', 0, 1)).toBeUndefined();
      expect(names.match('nothing', 0, 7)).toBeUndefined();
    });
  });
});
