/** A display suffix and its numeric multiplier. */
export type Magnitude = readonly [suffix: string, scale: number];

/** Shared input and output magnitudes, largest first and with uppercase display suffixes. */
export const MAGNITUDES: readonly Magnitude[] = [
  ['T', 1e12], // trillion
  ['B', 1e9], // billion
  ['M', 1e6], // million
  ['K', 1e3], // thousand
];

const scales = new Map(
  MAGNITUDES.map(([suffix, scale]) => [suffix.toLowerCase(), scale]),
);

/** Look up an input suffix case-insensitively; unknown or absent suffixes have no scale. */
export function magnitudeScale(suffix: string | undefined): number | undefined {
  return scales.get((suffix ?? '').toLocaleLowerCase());
}
