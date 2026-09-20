import type { Expression, Program } from '#lib/calculator/program.js';
import {
  CONSTANTS,
  FUNCTIONS,
  type BuiltInFunction,
} from '#lib/calculator/language/syntax.js';
import {
  ITERATED_OPERATORS,
  TERM_LIMIT,
  termCount,
} from '#lib/calculator/language/iteration.js';

/** A name and the value it holds after the last statement that bound it. */
export type Binding = {
  /** The bound name. */
  name: string;
  /** Its final value; not finite when its arithmetic is undefined. */
  value: number;
};

/** The value of a program's result and every name it bound. */
export type Evaluation = {
  /** The result expression's value, if the program has one; not finite when its arithmetic is undefined. */
  value?: number;
  /** Each bound name with its final value, in the order first bound. */
  bindings: Binding[];
};

/** A program's evaluation, or why it was stopped short of one. */
export type EvaluationResult =
  | {
      /** The program was evaluated in full. */
      ok: true;
      /** Its result and bindings. */
      evaluation: Evaluation;
    }
  | {
      /** The program's sums and products would evaluate more than the term limit. */
      ok: false;
      /** Which sum or product would pass the limit, and on what line. */
      message: string;
    };

type Iteration = Extract<Expression, { kind: 'iteration' }>;

/** The one way evaluation stops short, converted to a result at the boundary. */
class TermLimitError extends Error {}

/**
 * Evaluate a program's assignments in order, then its result, with JavaScript's
 * own arithmetic and `Math`. The program must come from the program parser,
 * which guarantees every name and index is bound before it is read.
 *
 * Undefined arithmetic is a value rather than a failure. Evaluation stops short
 * only when its sums and products together would pass `TERM_LIMIT` terms, and
 * it stops before evaluating any term of the one that would, so a mistyped
 * bound answers at once instead of stalling the page.
 */
export function evaluateProgram(program: Program): EvaluationResult {
  try {
    return { ok: true, evaluation: new ProgramEvaluator().evaluate(program) };
  } catch (error) {
    if (error instanceof TermLimitError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/** Evaluate one program with a fresh scope and term budget; use a new evaluator for each. */
class ProgramEvaluator {
  #scope = new Map<string, number>();
  #indices = new Map<string, number>();
  #termsLeft = TERM_LIMIT;

  /** Evaluate every statement in order, throwing TermLimitError past the limit. */
  evaluate({ assignments, result }: Program): Evaluation {
    for (const { name, expression } of assignments) {
      this.#scope.set(name, this.#evaluate(expression));
    }

    return {
      value: result && this.#evaluate(result),
      bindings: [...this.#scope].map(([name, value]) => ({ name, value })),
    };
  }

  #evaluate(expression: Expression): number {
    switch (expression.kind) {
      case 'number':
        return expression.value;
      case 'constant':
        return CONSTANTS[expression.name];
      case 'variable':
        return this.#read(this.#scope, expression.name);
      case 'index':
        return this.#read(this.#indices, expression.name);
      case 'negate':
        return -this.#evaluate(expression.operand);
      case 'call': {
        const { apply }: BuiltInFunction = FUNCTIONS[expression.name];
        return apply(
          ...expression.arguments.map((argument) => this.#evaluate(argument)),
        );
      }
      case 'iteration':
        return this.#iterate(expression);
      case 'binary': {
        const left = this.#evaluate(expression.left);
        const right = this.#evaluate(expression.right);
        switch (expression.operator) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            return left / right;
          case '^':
            return left ** right;
        }
      }
    }
  }

  #read(scope: ReadonlyMap<string, number>, name: string): number {
    const value = scope.get(name);
    if (value === undefined) {
      throw new Error(`'${name}' was read before it was bound`);
    }
    return value;
  }

  /**
   * Fold the body over each index value from the start through the end, which
   * are evaluated first and in the enclosing scope. The index is bound only
   * while the body is evaluated, and an outer index of the same spelling is
   * restored afterward.
   */
  #iterate({ operator, index, body, start, end, line }: Iteration): number {
    const first = this.#evaluate(start);
    const last = this.#evaluate(end);
    const terms = termCount(first, last);
    if (terms === undefined) return Number.NaN;
    if (terms > this.#termsLeft) {
      throw new TermLimitError(
        `'${operator}_${index}' on line ${line} would take the sums and products past ${TERM_LIMIT.toLocaleString('en-US')} terms, the most one calculation evaluates`,
      );
    }
    this.#termsLeft -= terms;

    const { empty, combine } = ITERATED_OPERATORS[operator];
    const outer = this.#indices.get(index);
    let total: number = empty;
    for (let value = first; value <= last; value += 1) {
      this.#indices.set(index, value);
      total = combine(total, this.#evaluate(body));
    }
    if (outer === undefined) this.#indices.delete(index);
    else this.#indices.set(index, outer);
    return total;
  }
}
