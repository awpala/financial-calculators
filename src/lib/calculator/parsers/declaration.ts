import {
  isCalculatorConstant,
  isReservedName,
} from '#lib/calculator/language/syntax.js';
import {
  ITERATED_OPERATORS,
  readIterationHead,
} from '#lib/calculator/language/iteration.js';
import {
  isNumericName,
  normalizeName,
  type DeclaredNames,
} from '#lib/calculator/parsers/names.js';
import type { RawStatement } from '#lib/calculator/parsers/statements.js';

/** A valid declaration header or its first error; the value expression is not checked. */
type DeclarationResult =
  | {
      /** Whether the statement may declare this name. */
      ok: true;
      /** Normalized name to bind after the caller accepts the value. */
      name: string;
      /** Index of the equals sign separating name and value. */
      equalsAt: number;
      /** One-based line containing the equals sign. */
      line: number;
    }
  | {
      /** Whether the statement may declare this name. */
      ok: false;
      /** The first declaration error in reading order. */
      message: string;
    };

/**
 * Validate a declaration's name and equals sign without registering the name or
 * reading its value. Parsing and incomplete-input highlighting share these rules.
 */
export function readDeclaration(
  source: string,
  { start, equals }: RawStatement,
  names: DeclaredNames,
  lineAt: (index: number) => number,
): DeclarationResult {
  const [equalsAt, second] = equals;
  if (equalsAt === undefined) {
    return { ok: false, message: `Expected '=' on line ${lineAt(start)}` };
  }
  const line = lineAt(equalsAt);
  if (second !== undefined) {
    return {
      ok: false,
      message: `Found a second '=' on line ${lineAt(second)}; a statement declares one name, so a ';' may be missing before it`,
    };
  }
  const name = normalizeName(source.slice(start, equalsAt));
  if (!name) {
    return { ok: false, message: `Expected a name before '=' on line ${line}` };
  }
  const head = readIterationHead(name);
  if (head) {
    return {
      ok: false,
      message: `'${name}' reads as a ${ITERATED_OPERATORS[head.operator].noun} over '${head.index}' and cannot be declared on line ${line}`,
    };
  }
  if (isReservedName(name)) {
    return {
      ok: false,
      message: isCalculatorConstant(name)
        ? `'${name}' is a built-in constant and cannot be redefined on line ${line}`
        : `'${name}' is built in and cannot be declared on line ${line}`,
    };
  }
  if (isNumericName(name)) {
    return {
      ok: false,
      message: `'${name}' reads as a number and cannot be declared on line ${line}`,
    };
  }
  const declaredOn = names.lineOf(name);
  if (declaredOn !== undefined) {
    return {
      ok: false,
      message: `'${name}' on line ${line} is already declared on line ${declaredOn}`,
    };
  }
  return { ok: true, name, equalsAt, line };
}
