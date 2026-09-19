import { describe, expect, it } from 'vitest';
import {
  createLineLocator,
  splitStatements,
} from '#lib/calculator/parsers/statements.js';

describe('calculator statement splitting', () => {
  it('splits at semicolons and keeps the unterminated remainder', () => {
    expect(splitStatements('a = 1;\n b=2; 3')).toEqual([
      { start: 0, end: 5, terminated: true, equals: [2], contentStart: 0 },
      { start: 6, end: 11, terminated: true, equals: [9], contentStart: 8 },
      { start: 12, end: 14, terminated: false, equals: [], contentStart: 13 },
    ]);
  });

  it('ignores semicolons and equals signs inside comments', () => {
    expect(splitStatements('# a = b; c\nx = 1;')).toEqual([
      { start: 0, end: 16, terminated: true, equals: [13], contentStart: 11 },
      { start: 17, end: 17, terminated: false, equals: [] },
    ]);
  });

  it('reports statements with no content', () => {
    expect(splitStatements('')).toEqual([
      { start: 0, end: 0, terminated: false, equals: [] },
    ]);
    expect(splitStatements(' ;# note')).toEqual([
      { start: 0, end: 1, terminated: true, equals: [] },
      { start: 2, end: 8, terminated: false, equals: [] },
    ]);
  });

  it('locates lines by index', () => {
    const lineAt = createLineLocator('ab\ncd\n\nef');
    expect([0, 2, 3, 5, 6, 7, 8, 99].map(lineAt)).toEqual([
      1, 1, 2, 2, 3, 4, 4, 4,
    ]);
    expect(createLineLocator('')(0)).toBe(1);
  });
});
