import { describe, expect, it } from 'vitest';
import { splitQuotedMessage } from '#lib/calculator/presentation/messages.js';

function parts(message: string): [string, boolean][] {
  return splitQuotedMessage(message).map(({ text, quoted }) => [text, quoted]);
}

describe('parse message splitting', () => {
  it('sets the quoted pieces apart from the prose', () => {
    expect(parts("Unmatched ')' on line 1")).toEqual([
      ['Unmatched ', false],
      [')', true],
      [' on line 1', false],
    ]);
  });

  it('keeps every run, so the prose is never lost', () => {
    const message = "'(' on line 1 is closed by ']' on line 2; expected ')'";
    expect(
      splitQuotedMessage(message)
        .map(({ text, quoted }) => (quoted ? `'${text}'` : text))
        .join(''),
    ).toBe(message);
  });

  it('leaves a message with nothing quoted whole', () => {
    expect(
      parts('Expression ends where a value is expected on line 2'),
    ).toEqual([['Expression ends where a value is expected on line 2', false]]);
  });

  it('leaves an unclosed quotation as prose rather than dropping it', () => {
    expect(parts("Unexpected '")).toEqual([["Unexpected '", false]]);
  });

  it('handles a quoted piece at either end', () => {
    expect(parts("'x' is not declared")).toEqual([
      ['x', true],
      [' is not declared', false],
    ]);
    expect(parts("a statement declares one name, so a ';'")).toEqual([
      ['a statement declares one name, so a ', false],
      [';', true],
    ]);
  });

  it('quotes an empty name rather than failing on it', () => {
    expect(parts("'' is not declared")).toEqual([
      ['', true],
      [' is not declared', false],
    ]);
  });
});
