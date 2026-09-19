/** Validated HTML attributes and optional styles for an embedded article. */
export interface ArticleThemeData {
  /** Validated data attributes retained on the article wrapper. */
  attributes: Record<string, string>;
  /** Theme CSS variables for the wrapper, or undefined when no accent was authored. */
  containerStyle: string | undefined;
  /** Title styling derived from the article accent, or undefined for the default. */
  titleStyle: string | undefined;
}

/** Measured sizing hints for a dense pipe table. */
export interface DenseTableLayout {
  /** Percentage width for each column, in column order, summing to 100. */
  columnWidths: number[];
  /** Table `min-width` in ch, the sum of the measured column widths, letting the table scroll rather than compress. */
  minWidthCh: number;
}
