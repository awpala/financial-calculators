import type {
  Assignment,
  Expression,
  ParseResult,
} from '#lib/calculator/program.js';
import { DeclaredNames } from '#lib/calculator/parsers/names.js';
import {
  createLineLocator,
  splitStatements,
  type RawStatement,
} from '#lib/calculator/parsers/statements.js';
import { tokenize, type Token } from '#lib/calculator/parsers/tokens.js';
import { readDeclaration } from '#lib/calculator/parsers/declaration.js';
import { ExpressionParser } from '#lib/calculator/parsers/expression-parser.js';
import { ParseError } from '#lib/calculator/parsers/parse-error.js';

/** Parse calculator input, reporting the first error in reading order. */
export function parseProgram(source: string): ParseResult {
  try {
    return new ProgramParser(source).parse();
  } catch (error) {
    if (error instanceof ParseError) {
      return { status: 'invalid', message: error.message };
    }
    throw error;
  }
}

/** Parse one source with its own declaration scope; use a fresh parser for each input. */
class ProgramParser {
  #source: string;
  #lineAt: (index: number) => number;
  #names = new DeclaredNames();

  /** Start a parser for one complete calculator input. */
  constructor(source: string) {
    this.#source = source;
    this.#lineAt = createLineLocator(source);
  }

  /** Consume the statements in order, throwing ParseError on the first error. */
  parse(): ParseResult {
    const assignments: Assignment[] = [];
    let result: Expression | undefined;
    let resultLine: number | undefined;

    for (const statement of splitStatements(this.#source)) {
      if (resultLine !== undefined && statement.contentStart !== undefined) {
        throw new ParseError(
          `Only the last statement can be a bare expression; the one on line ${resultLine} must declare a name, as 'name = expression;'`,
        );
      }
      if (statement.contentStart === undefined) {
        if (statement.terminated) {
          throw new ParseError(
            `Expected a statement before ';' on line ${this.#lineAt(statement.end)}`,
          );
        }
        continue;
      }
      if (statement.equals.length > 0) {
        assignments.push(this.#declaration(statement));
        continue;
      }
      const tokens = this.#tokens(statement.start, statement.end);
      if (tokens.length === 0) continue;
      result = new ExpressionParser(tokens).parse();
      resultLine = this.#lineAt(statement.contentStart);
    }

    if (assignments.length === 0 && result === undefined) {
      return { status: 'empty' };
    }
    return { status: 'valid', program: { assignments, result } };
  }

  #declaration(statement: RawStatement): Assignment {
    const declaration = readDeclaration(
      this.#source,
      statement,
      this.#names,
      this.#lineAt,
    );
    if (!declaration.ok) throw new ParseError(declaration.message);
    const { name, equalsAt, line } = declaration;
    const { end } = statement;

    const tokens = this.#tokens(equalsAt + 1, end);
    if (tokens.length === 0) {
      throw new ParseError(`Expected a value after '=' on line ${line}`);
    }
    const expression = new ExpressionParser(tokens).parse();
    this.#names.declare(name, line);
    return { name, line, expression };
  }

  /** Tokenize the text between `start` and `end`; empty when it holds no tokens. */
  #tokens(start: number, end: number): Token[] {
    const lexed = tokenize(this.#source, {
      start,
      end,
      names: this.#names,
      lineAt: this.#lineAt,
    });
    if (!lexed.ok) throw new ParseError(lexed.message);
    return lexed.tokens;
  }
}
