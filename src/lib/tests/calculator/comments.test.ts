import { describe, expect, it } from 'vitest';
import { splitComments } from '#lib/calculator/language/comments.js';

describe('calculator comment splitting', () => {
  it.each([
    ['', []],
    ['1 + 2', [{ text: '1 + 2', comment: false }]],
    ['# only', [{ text: '# only', comment: true }]],
    [
      '# assets\n1,000\n',
      [
        { text: '# assets', comment: true },
        { text: '\n1,000\n', comment: false },
      ],
    ],
    [
      '1 + 2 # trailing\n  # indented\n- 3',
      [
        { text: '1 + 2 ', comment: false },
        { text: '# trailing', comment: true },
        { text: '\n  ', comment: false },
        { text: '# indented', comment: true },
        { text: '\n- 3', comment: false },
      ],
    ],
    ['## twice # over', [{ text: '## twice # over', comment: true }]],
  ])('splits %j', (source, expected) => {
    const segments = splitComments(source);
    expect(segments).toEqual(expected);
    expect(segments.map((segment) => segment.text).join('')).toBe(source);
  });
});
