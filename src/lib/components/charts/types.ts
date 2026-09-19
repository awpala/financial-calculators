// Shared chart prop types. Charts are intentionally dumb renderers:
// callers shape their data into these structures so the same component
// can serve many different domain questions.

/** Pointer location and data for one hovered line point. */
export type PointHoverInfo = {
  /** Stable key of the hovered series. */
  seriesId: string;
  /** Display label of the hovered series. */
  seriesLabel: string;
  /** Resolved CSS color of the hovered series. */
  color: string;
  /** Original numeric point supplied by the chart owner. */
  point: {
    /** Numeric position along the horizontal axis. */
    x: number;
    /** Numeric position along the vertical axis. */
    y: number;
  };
  /** Pointer x coordinate in the viewport. */
  clientX: number;
  /** Pointer y coordinate in the viewport. */
  clientY: number;
};

/** Data for one line in a line chart. */
export type LineSeries = {
  /** Stable unique series key. */
  id: string;
  /** Legend and hover label. */
  label: string;
  /** Caller-owned finite points, ordered by x for path interpolation. */
  points: Array<{
    /** Numeric position along the horizontal axis. */
    x: number;
    /** Numeric position along the vertical axis. */
    y: number;
  }>;
  /** Optional CSS color; defaults to the categorical palette. */
  color?: string;
  /** Whether to use the default dash pattern; defaults to false. */
  dashed?: boolean;
  /** Optional SVG dash pattern overriding dashed. */
  dashArray?: string;
  /** Optional line width in pixels; defaults to 1.75. */
  strokeWidth?: number;
  /** Optional point radius overriding the chart default. */
  pointRadius?: number;
};

/** Data for one grouped-bar series. */
export type BarSeries = {
  /** Stable unique series key. */
  id: string;
  /** Legend label. */
  label: string;
  /** Caller-owned numeric values aligned with groupLabels indices. */
  values: number[];
  /** Optional CSS color; defaults to the categorical palette. */
  color?: string;
};

/** One stacked-bar segment value within a group. */
export type BarStackSegment = {
  /** Stable segment key within its group and series. */
  id: string;
  /** Display label included in hover information. */
  label: string;
  /** Signed value contributing to its positive or negative stack. */
  value: number;
  /** Optional CSS color overriding the series color. */
  color?: string;
};

/** Data for one stacked-bar series where each x-group can contain many segments. */
export type StackedBarSeries = {
  /** Stable unique series key. */
  id: string;
  /** Legend and hover label. */
  label: string;
  /** Optional CSS color; defaults to the categorical palette. */
  color?: string;
  /** Segments per group, aligned with groupLabels indices. */
  stacks: BarStackSegment[][];
};

/** Hover payload for a single stacked-bar segment. */
export type BarSegmentHoverInfo = {
  /** Stable key of the hovered series. */
  seriesId: string;
  /** Display label of the hovered series. */
  seriesLabel: string;
  /** Group key identifying the hovered stack. */
  groupLabel: string;
  /** Original segment supplied by the chart owner. */
  segment: BarStackSegment;
  /** Resolved CSS color of the segment. */
  color: string;
  /** Pointer x coordinate in the viewport. */
  clientX: number;
  /** Pointer y coordinate in the viewport. */
  clientY: number;
};

/** Pixel margins around the chart drawing area. */
export type ChartMargin = {
  /** Space above the plot in pixels. */
  top: number;
  /** Space to the right of the plot in pixels. */
  right: number;
  /** Space below the plot for axis content, in pixels. */
  bottom: number;
  /** Space to the left of the plot for axis content, in pixels. */
  left: number;
};

/** Default chart margins used by shared chart components. */
export const DEFAULT_MARGIN: ChartMargin = {
  /** Default top inset in pixels. */
  top: 16,
  /** Default right inset in pixels. */
  right: 24,
  /** Default bottom axis allowance in pixels. */
  bottom: 40,
  /** Default left axis allowance in pixels. */
  left: 56,
};

/** Extended categorical palette (12) — readable in both light and dark modes. */
export const DEFAULT_PALETTE = [
  '#4e79a7',
  '#f28e2c',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc949',
  '#af7aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ab',
  '#86bcb6',
  '#d4a6c8',
];

/** Returns a stable color choice for a zero-based series index. */
export function paletteColor(
  index: number,
  palette: readonly string[] = DEFAULT_PALETTE,
): string {
  return palette[index % palette.length];
}
