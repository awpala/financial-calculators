/**
 * Where comments sit in calculator input.
 *
 * A comment runs from `#` to the end of its line, whether it fills the row or
 * trails a figure. The tokenizer skips them; the editor shades them. Both read
 * the rule from here so the two cannot disagree about what is a comment.
 */

/** The character that opens a comment. */
export const COMMENT_MARKER = '#';

/** Find a comment's ending newline, or the exclusive scan limit when it has none. */
export function commentEnd(
  source: string,
  start: number,
  limit = source.length,
): number {
  const newline = source.indexOf('\n', start);
  return newline === -1 || newline > limit ? limit : newline;
}

/** A run of calculator input that is either entirely comment or entirely not. */
export type SourceSegment = {
  /** The run's text, newlines included, exactly as it appears in the input. */
  text: string;
  /** Whether the run is comment text, marker included. */
  comment: boolean;
};

/**
 * Split input into alternating comment and non-comment runs that concatenate
 * back to the original text. The newline ending a comment belongs to the run
 * after it.
 */
export function splitComments(source: string): SourceSegment[] {
  const segments: SourceSegment[] = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf(COMMENT_MARKER, index);
    if (start === -1) {
      segments.push({ text: source.slice(index), comment: false });
      break;
    }
    if (start > index) {
      segments.push({ text: source.slice(index, start), comment: false });
    }
    const end = commentEnd(source, start);
    segments.push({ text: source.slice(start, end), comment: true });
    index = end;
  }

  return segments;
}
