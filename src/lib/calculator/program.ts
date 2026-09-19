/**
 * Calculator grammar and parsed representation: declarations, then an optional result.
 *
 * Input is zero or more declarations, each written `name = expression;`,
 * optionally followed by a bare expression, whose value is the result. Only the
 * last statement may leave its `;` off, and only the last may be a bare
 * expression — so `1 + 2` and `1 + 2;` are the same input, and so are
 * `x = 1` and `x = 1;`. Input whose last statement is a declaration has no
 * result to show; its names are the whole of what it says. Whitespace around
 * the `=`, line breaks included, belongs to the `=` and is never part of the
 * name or the value, so `name = expression`, `name=expression`, and `name =`
 * with the value on the next line are all one declaration. A statement holds
 * only one `=`.
 *
 * The text left of `=` is the declared name and is never read as an expression:
 * it may hold spaces and any symbols but `=`, `;`, and `#` (see `parsers/names.ts`).
 * Names within an expression are references, and each must be declared by an
 * earlier statement — nothing is hoisted, so `x = x + 1;` refers to an
 * undeclared `x`. A name is declared once, which keeps every alias meaning one
 * value. Lines carry no meaning of their own: only `;` ends a statement, so one
 * line can hold several, as `assets = $100k; liabilities = $50k;`, and one
 * statement can span labeled rows and still total together.
 *
 * Within an expression, precedence, loosest first: `+ -`, then `* / %`, then
 * unary sign, then `^` (right-associative, so `-2^2` is `-4` and `2^3^2` is
 * `512`). Parentheses, brackets, and braces group interchangeably but must close
 * with their own kind. `log` (base 10), `lg` (base 2), `ln`, `sqrt`, `abs`,
 * `floor`, `ceil`, `fact` (factorial), and `inv` (`1 / x`) take one grouped
 * argument; `e` is Euler's number, `pi` is π, and `phi` is the golden ratio.
 * These twelve names are reserved: a declaration of one is refused, and one of
 * a constant says so. Names are case-sensitive and there is no implicit
 * multiplication: `2(3)` and `2pi` are missing an operator, not products.
 *
 * `sum_i(expression, start, end)` and `prod_i(expression, start, end)` add or
 * multiply the expression for each whole-number `i` from `start` through `end`.
 * The index is bound only within the expression, nested sums and products
 * included, and is never a declared name (see `language/iteration.ts`).
 *
 * Arithmetic itself is JavaScript's, so `%` is the remainder and results carry
 * ordinary floating-point rounding.
 */

import type { IteratedOperator } from '#lib/calculator/language/iteration.js';
import type {
  CalculatorConstant,
  CalculatorFunction,
  OperatorSymbol,
} from '#lib/calculator/language/syntax.js';

/** A parsed arithmetic expression tree. */
export type Expression =
  | {
      /** A number literal, including any magnitude suffix. */
      kind: 'number';
      /** The literal's numeric value after applying its suffix. */
      value: number;
    }
  | {
      /** A reference to a built-in constant. */
      kind: 'constant';
      /** The built-in constant to evaluate. */
      name: CalculatorConstant;
    }
  | {
      /** A reference to an earlier declaration. */
      kind: 'variable';
      /** The normalized name to resolve in the current evaluation. */
      name: string;
    }
  | {
      /** Unary negation. */
      kind: 'negate';
      /** The expression whose sign is reversed. */
      operand: Expression;
    }
  | {
      /** An arithmetic operation on two expressions. */
      kind: 'binary';
      /** The arithmetic operation to apply. */
      operator: OperatorSymbol;
      /** The operand before the operator. */
      left: Expression;
      /** The operand after the operator. */
      right: Expression;
    }
  | {
      /** A call to a built-in function. */
      kind: 'call';
      /** The function to evaluate. */
      name: CalculatorFunction;
      /** The grouped argument passed to the function. */
      argument: Expression;
    }
  | {
      /** A sum or product of its body over a whole-number range of its index. */
      kind: 'iteration';
      /** Whether the terms are added or multiplied. */
      operator: IteratedOperator;
      /** The index the body reads, bound only while the body is evaluated. */
      index: string;
      /** The term, evaluated once for each value of the index. */
      body: Expression;
      /** The index's first value, read outside the index's scope. */
      start: Expression;
      /** The index's last value, read outside the index's scope. */
      end: Expression;
      /** One-based line of the operator, for a calculation it cannot finish. */
      line: number;
    }
  | {
      /** A reference to the index of an enclosing sum or product. */
      kind: 'index';
      /** The index as written after its operator. */
      name: string;
    };

/** One `name = expression;` statement. */
export type Assignment = {
  /** The name the statement binds. */
  name: string;
  /** One-based source line containing the declaration's equals sign. */
  line: number;
  /** The expression whose value the name takes. */
  expression: Expression;
};

/** Parsed calculator input. */
export type Program = {
  /** Assignments in the order written. */
  assignments: Assignment[];
  /** The trailing bare expression, if the input ends with one. */
  result?: Expression;
};

/** Whether calculator input is empty, invalid, or ready to evaluate. */
export type ParseResult =
  | {
      /** No assignments or result expression were found. */
      status: 'empty';
    }
  | {
      /** The input failed to parse. */
      status: 'invalid';
      /** The first error in reading order. */
      message: string;
    }
  | {
      /** The input is ready for evaluation. */
      status: 'valid';
      /** The validated declarations and optional result. */
      program: Program;
    };
