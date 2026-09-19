import { hexToRgb, normalizeHexColor, rgbToHex } from '../colors.js';
import type { ColorPair } from '../colors.js';

/** Resolve the article accent pair for a `data-color` value. */
export function resolveArticleColorPair(
  color: string | undefined,
): ColorPair | null {
  const normalized = normalizeHexColor(color);
  if (!normalized) return null;
  return { light: normalized, dark: deriveDarkComplement(normalized) };
}

/**
 * Build a readable dark-theme accent from an authored color.
 *
 * Dark surfaces need brighter accents for contrast, so this blends toward white.
 */
function deriveDarkComplement(lightHex: string): string {
  const [r, g, b] = hexToRgb(lightHex);
  const blend = (channel: number) =>
    Math.round(channel + (255 - channel) * 0.45);
  return rgbToHex(blend(r), blend(g), blend(b));
}
