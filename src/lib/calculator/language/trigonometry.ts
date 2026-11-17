import type { BuiltInFunction } from '#lib/calculator/language/syntax.js';

const RADIANS_PER_DEGREE = Math.PI / 180;

function inDegrees(radians: number): number {
  return radians / RADIANS_PER_DEGREE;
}

function sineDegrees(degrees: number): number {
  const angle = degrees % 360;
  if (angle % 180 === 0) return 0;
  if (angle === 90 || angle === -270) return 1;
  if (angle === -90 || angle === 270) return -1;
  return Math.sin(angle * RADIANS_PER_DEGREE);
}

function cosineDegrees(degrees: number): number {
  const angle = degrees % 360;
  if (angle === 0) return 1;
  if (angle === 180 || angle === -180) return -1;
  if (angle === 90 || angle === -90 || angle === 270 || angle === -270)
    return 0;
  return Math.cos(angle * RADIANS_PER_DEGREE);
}

/**
 * Circular and hyperbolic functions registered with the calculator language.
 * Circular angles use radians unless the name ends in _d; inverse _d functions
 * return degrees. Inverses use arc prefixes, with arctan2 taking (y, x).
 * Hyperbolic arguments and results are unitless. Reciprocal functions inherit
 * the calculator's floating-point and nonfinite arithmetic behavior.
 */
export const TRIGONOMETRIC_FUNCTIONS = {
  /** Sine of an angle in radians. */
  sin: { parameters: ['x'], apply: Math.sin },
  /** Cosine of an angle in radians. */
  cos: { parameters: ['x'], apply: Math.cos },
  /** Tangent of an angle in radians. */
  tan: { parameters: ['x'], apply: Math.tan },
  /** Secant of an angle in radians. */
  sec: { parameters: ['x'], apply: (x: number) => 1 / Math.cos(x) },
  /** Cosecant of an angle in radians. */
  csc: { parameters: ['x'], apply: (x: number) => 1 / Math.sin(x) },
  /** Cotangent of an angle in radians. */
  cot: { parameters: ['x'], apply: (x: number) => 1 / Math.tan(x) },
  /** Principal inverse sine in radians, between -pi/2 and pi/2. */
  arcsin: { parameters: ['x'], apply: Math.asin },
  /** Principal inverse cosine in radians, between 0 and pi. */
  arccos: { parameters: ['x'], apply: Math.acos },
  /** Principal inverse tangent in radians, between -pi/2 and pi/2. */
  arctan: { parameters: ['x'], apply: Math.atan },
  /** Principal inverse secant in radians, between 0 and pi. */
  arcsec: { parameters: ['x'], apply: (x: number) => Math.acos(1 / x) },
  /** Principal inverse cosecant in radians, between -pi/2 and pi/2. */
  arccsc: { parameters: ['x'], apply: (x: number) => Math.asin(1 / x) },
  /** Principal inverse cotangent in radians, between 0 and pi. */
  arccot: { parameters: ['x'], apply: (x: number) => Math.atan2(1, x) },
  /** Angle of the point (x, y) in radians, between -pi and pi. */
  arctan2: { parameters: ['y', 'x'], apply: Math.atan2 },
  /** Sine of an angle in degrees, exact at multiples of 90 degrees. */
  sin_d: { parameters: ['x'], apply: sineDegrees },
  /** Cosine of an angle in degrees, exact at multiples of 90 degrees. */
  cos_d: { parameters: ['x'], apply: cosineDegrees },
  /** Tangent of an angle in degrees; poles produce nonfinite results. */
  tan_d: {
    parameters: ['x'],
    apply: (x: number) => sineDegrees(x) / cosineDegrees(x),
  },
  /** Secant of an angle in degrees. */
  sec_d: { parameters: ['x'], apply: (x: number) => 1 / cosineDegrees(x) },
  /** Cosecant of an angle in degrees. */
  csc_d: { parameters: ['x'], apply: (x: number) => 1 / sineDegrees(x) },
  /** Cotangent of an angle in degrees. */
  cot_d: {
    parameters: ['x'],
    apply: (x: number) => cosineDegrees(x) / sineDegrees(x),
  },
  /** Principal inverse sine in degrees, between -90 and 90. */
  arcsin_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.asin(x)),
  },
  /** Principal inverse cosine in degrees, between 0 and 180. */
  arccos_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.acos(x)),
  },
  /** Principal inverse tangent in degrees, between -90 and 90. */
  arctan_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.atan(x)),
  },
  /** Principal inverse secant in degrees, between 0 and 180. */
  arcsec_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.acos(1 / x)),
  },
  /** Principal inverse cosecant in degrees, between -90 and 90. */
  arccsc_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.asin(1 / x)),
  },
  /** Principal inverse cotangent in degrees, between 0 and 180. */
  arccot_d: {
    parameters: ['x'],
    apply: (x: number) => inDegrees(Math.atan2(1, x)),
  },
  /** Angle of the point (x, y) in degrees, between -180 and 180. */
  arctan2_d: {
    parameters: ['y', 'x'],
    apply: (y: number, x: number) => inDegrees(Math.atan2(y, x)),
  },
  /** Hyperbolic sine. */
  sinh: { parameters: ['x'], apply: Math.sinh },
  /** Hyperbolic cosine. */
  cosh: { parameters: ['x'], apply: Math.cosh },
  /** Hyperbolic tangent. */
  tanh: { parameters: ['x'], apply: Math.tanh },
  /** Hyperbolic secant. */
  sech: { parameters: ['x'], apply: (x: number) => 1 / Math.cosh(x) },
  /** Hyperbolic cosecant. */
  csch: { parameters: ['x'], apply: (x: number) => 1 / Math.sinh(x) },
  /** Hyperbolic cotangent. */
  coth: { parameters: ['x'], apply: (x: number) => 1 / Math.tanh(x) },
  /** Inverse hyperbolic sine. */
  arcsinh: { parameters: ['x'], apply: Math.asinh },
  /** Nonnegative inverse hyperbolic cosine. */
  arccosh: { parameters: ['x'], apply: Math.acosh },
  /** Inverse hyperbolic tangent. */
  arctanh: { parameters: ['x'], apply: Math.atanh },
  /** Nonnegative inverse hyperbolic secant. */
  arcsech: { parameters: ['x'], apply: (x: number) => Math.acosh(1 / x) },
  /** Inverse hyperbolic cosecant. */
  arccsch: { parameters: ['x'], apply: (x: number) => Math.asinh(1 / x) },
  /** Inverse hyperbolic cotangent. */
  arccoth: { parameters: ['x'], apply: (x: number) => Math.atanh(1 / x) },
} as const satisfies Readonly<Record<string, BuiltInFunction>>;
