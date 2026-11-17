import type { Expression } from '#lib/calculator/program.js';
import {
  countWord,
  describeArguments,
  FUNCTIONS,
  isCalculatorConstant,
  isCalculatorFunction,
  isReservedName,
  MATCHING_BRACKET,
  type CalculatorFunction,
  type BuiltInFunction,
  type OperatorSymbol,
} from '#lib/calculator/language/syntax.js';
import {
  ARGUMENT_SEPARATOR,
  ITERATION_PARAMETERS,
  iteratedOperatorOf,
  readIterationHead,
  type IterationHead,
} from '#lib/calculator/language/iteration.js';
import type { Token } from '#lib/calculator/parsers/tokens.js';
import { ParseError } from '#lib/calculator/parsers/parse-error.js';

type OpenToken = Extract<Token, { kind: 'open' }>;

/** A sum or product whose arguments are being read, and whether its index is in scope. */
type OpenIteration = {
  /** The head as written, such as `sum_i`. */
  head: string;
  /** The index the head binds. */
  index: string;
  /** Whether its first argument, the only place the index is bound, is being read. */
  inBody: boolean;
};

function describe(token: Token): string {
  switch (token.kind) {
    case 'number':
      return `'${token.text}'`;
    case 'operator':
      return `'${token.symbol}'`;
    case 'open':
    case 'close':
      return `'${token.bracket}'`;
    case 'name':
      return `'${token.name}'`;
    case 'separator':
      return `'${ARGUMENT_SEPARATOR}'`;
  }
}

/**
 * Parse one token sequence using arithmetic precedence and matching groups,
 * resolving each sum's or product's index within its first argument only.
 */
export class ExpressionParser {
  #tokens: Token[];
  #index = 0;
  #iterations: OpenIteration[] = [];

  /** Take an ordered token sequence for one expression; each parser is consumed once. */
  constructor(tokens: Token[]) {
    this.#tokens = tokens;
  }

  /** Consume the complete expression, throwing ParseError on the first error. */
  parse(): Expression {
    const expression = this.#sum();
    const next = this.#peek();
    if (!next) return expression;
    if (next.kind === 'close') {
      throw new ParseError(`Unmatched '${next.bracket}' on line ${next.line}`);
    }
    throw new ParseError(
      `Missing operator before ${describe(next)} on line ${next.line}`,
    );
  }

  #peek(): Token | undefined {
    return this.#tokens[this.#index];
  }

  #lastLine(): number {
    return this.#tokens.at(-1)?.line ?? 1;
  }

  #operator(symbols: readonly OperatorSymbol[]): OperatorSymbol | undefined {
    const token = this.#peek();
    if (token?.kind !== 'operator' || !symbols.includes(token.symbol)) {
      return undefined;
    }
    this.#index += 1;
    return token.symbol;
  }

  #sum(): Expression {
    return this.#binary(['+', '-'], () => this.#product());
  }

  #product(): Expression {
    return this.#binary(['*', '/'], () => this.#unary());
  }

  #binary(
    symbols: readonly OperatorSymbol[],
    operand: () => Expression,
  ): Expression {
    let left = operand();
    for (let op = this.#operator(symbols); op; op = this.#operator(symbols)) {
      left = { kind: 'binary', operator: op, left, right: operand() };
    }
    return left;
  }

  #unary(): Expression {
    const sign = this.#operator(['+', '-']);
    if (sign === '+') return this.#unary();
    if (sign === '-') return { kind: 'negate', operand: this.#unary() };
    return this.#power();
  }

  #power(): Expression {
    const base = this.#primary();
    if (!this.#operator(['^'])) return base;
    return { kind: 'binary', operator: '^', left: base, right: this.#unary() };
  }

  #primary(): Expression {
    const token = this.#peek();
    if (!token) {
      throw new ParseError(
        `Expression ends where a value is expected on line ${this.#lastLine()}`,
      );
    }

    switch (token.kind) {
      case 'number':
        this.#index += 1;
        return { kind: 'number', value: token.value };
      case 'open':
        return this.#group();
      case 'name':
        this.#index += 1;
        if (this.#isBoundIndex(token.name)) {
          return { kind: 'index', name: token.name };
        }
        if (token.declared) return { kind: 'variable', name: token.name };
        return this.#named(token.name, token.line);
      case 'close':
      case 'operator':
      case 'separator':
        throw new ParseError(
          `Expected a value before ${describe(token)} on line ${token.line}`,
        );
    }
  }

  #named(name: string, line: number): Expression {
    if (isCalculatorConstant(name)) return { kind: 'constant', name };
    if (isCalculatorFunction(name)) return this.#call(name, line);
    const head = readIterationHead(name);
    if (head) return this.#iteration(head, name, line);

    const operator = iteratedOperatorOf(name);
    if (operator && this.#peek()?.kind === 'open') {
      throw new ParseError(
        `'${name}' needs an index that starts with a letter, as '${describeArguments({ head: `${operator}_i`, parameters: ITERATION_PARAMETERS })}', on line ${line}`,
      );
    }
    const outOfScope = this.#iterations.find(({ index }) => index === name);
    if (outOfScope) {
      throw new ParseError(
        `'${name}' is bound only within the first argument of '${outOfScope.head}' on line ${line}`,
      );
    }
    throw new ParseError(
      `'${name}' is not declared by an earlier statement on line ${line}`,
    );
  }

  /**
   * Read a call's bracketed arguments, each in the scope around it, and refuse
   * a count its function does not take. One trailing comma is allowed before
   * the closing bracket. A function of one argument keeps the message naming
   * a single parenthesized argument, since its brackets divide
   * at no comma to explain. Variadic functions require at least one argument.
   */
  #call(name: CalculatorFunction, line: number): Expression {
    const { parameters, variadic }: BuiltInFunction = FUNCTIONS[name];
    const list = { head: name, parameters, variadic };
    const open = this.#peek();
    if (open?.kind !== 'open') {
      throw new ParseError(
        parameters.length > 1 || variadic
          ? `'${name}' must be followed by its arguments in brackets, as '${describeArguments(list)}', on line ${line}`
          : `'${name}' must be followed by a parenthesized argument on line ${line}`,
      );
    }
    this.#index += 1;

    if (variadic && this.#peek()?.kind === 'close') {
      throw new ParseError(
        `'${name}' on line ${line} takes at least one argument, as '${describeArguments(list)}'`,
      );
    }

    const argumentsRead = [this.#sum()];
    while (this.#peek()?.kind === 'separator') {
      this.#index += 1;
      if (this.#peek()?.kind === 'close') break;
      argumentsRead.push(this.#sum());
    }
    this.#close(open);

    if (!variadic && argumentsRead.length !== parameters.length) {
      throw new ParseError(
        `'${name}' on line ${line} takes ${countWord(parameters.length)} arguments, as '${describeArguments(list)}'`,
      );
    }
    return { kind: 'call', name, arguments: argumentsRead };
  }

  /** Whether a name is the index of a sum or product whose first argument is being read. */
  #isBoundIndex(name: string): boolean {
    return this.#iterations.some(
      ({ index, inBody }) => inBody && index === name,
    );
  }

  /**
   * Read a sum's or product's three arguments. The index is bound while the
   * first is read, which is what lets a nested one's arguments read it too, and
   * released before the bounds, which are read in the enclosing scope. One
   * trailing comma may follow the last bound without adding an argument.
   */
  #iteration(
    { operator, index }: IterationHead,
    head: string,
    line: number,
  ): Expression {
    if (isReservedName(index)) {
      throw new ParseError(
        `'${index}' is built in and cannot be an index on line ${line}`,
      );
    }
    const list = { head, parameters: ITERATION_PARAMETERS };
    const open = this.#peek();
    if (open?.kind !== 'open') {
      throw new ParseError(
        `'${head}' must be followed by its arguments in brackets, as '${describeArguments(list)}', on line ${line}`,
      );
    }
    this.#index += 1;

    const iteration: OpenIteration = { head, index, inBody: true };
    this.#iterations.push(iteration);
    const body = this.#sum();
    iteration.inBody = false;
    const bounds: Expression[] = [];
    while (this.#peek()?.kind === 'separator') {
      this.#index += 1;
      if (this.#peek()?.kind === 'close') break;
      bounds.push(this.#sum());
    }
    this.#iterations.pop();
    this.#close(open);

    const [start, end] = bounds;
    if (!start || !end || bounds.length > 2) {
      throw new ParseError(
        `'${head}' on line ${line} takes ${countWord(ITERATION_PARAMETERS.length)} arguments, as '${describeArguments(list)}'`,
      );
    }
    return { kind: 'iteration', operator, index, body, start, end, line };
  }

  #group(): Expression {
    const open = this.#peek();
    if (open?.kind !== 'open') {
      throw new ParseError('Expected an opening bracket');
    }
    this.#index += 1;
    const inner = this.#sum();
    this.#close(open);
    return inner;
  }

  /** Consume the bracket that closes `open`, throwing ParseError unless it is next. */
  #close(open: OpenToken): void {
    const close = this.#peek();
    const expected = MATCHING_BRACKET[open.bracket];

    if (!close) {
      throw new ParseError(
        `'${open.bracket}' on line ${open.line} is never closed`,
      );
    }
    if (close.kind !== 'close') {
      throw new ParseError(
        `Missing operator before ${describe(close)} on line ${close.line}`,
      );
    }
    if (close.bracket !== expected) {
      throw new ParseError(
        `'${open.bracket}' on line ${open.line} is closed by '${close.bracket}' on line ${close.line}; expected '${expected}'`,
      );
    }
    this.#index += 1;
  }
}
