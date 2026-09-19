/** Return total column count represented by one `<colgroup>`. */
function htmlTableColgroupWidth(colgroup: HTMLTableColElement): number {
  const cols = Array.from(colgroup.children).filter(
    (child): child is HTMLTableColElement => child.tagName === 'COL',
  );
  if (cols.length === 0) {
    return colgroup.span > 0 ? colgroup.span : 1;
  }

  let width = 0;
  for (const col of cols) {
    width += col.span > 0 ? col.span : 1;
  }
  return width;
}

/** Compute 1-based column starts for each super-column after the first colgroup. */
function htmlTableSuperColumnStarts(table: HTMLTableElement): Set<number> {
  const groups = Array.from(table.children).filter(
    (child): child is HTMLTableColElement => child.tagName === 'COLGROUP',
  );
  const starts = new Set<number>();
  if (groups.length <= 1) return starts;

  let nextStart = 1;
  for (let i = 0; i < groups.length; i++) {
    if (i > 0) {
      starts.add(nextStart);
    }
    nextStart += htmlTableColgroupWidth(groups[i]);
  }
  return starts;
}

/** Mark cells that begin a new super-column so CSS can draw divider boundaries. */
function annotateHtmlTableSuperColumnDividers(table: HTMLTableElement): void {
  const dividerClass = 'html-table-super-divider';
  for (const cell of table.querySelectorAll<HTMLTableCellElement>('th, td')) {
    cell.classList.remove(dividerClass);
  }

  const starts = htmlTableSuperColumnStarts(table);
  if (starts.size === 0) return;

  // Columns that a `rowspan` from an earlier row still occupies, mapped to the
  // number of rows they have left to cover.
  const rowSpans = new Map<number, number>();
  for (const row of Array.from(table.rows)) {
    let column = 1;
    const opened = new Map<number, number>();
    for (const cell of Array.from(row.cells)) {
      while (rowSpans.has(column)) column++;
      if (starts.has(column)) cell.classList.add(dividerClass);
      const colSpan = cell.colSpan > 0 ? cell.colSpan : 1;
      const rowSpan = cell.rowSpan > 0 ? cell.rowSpan : 1;
      if (rowSpan > 1) {
        for (let i = 0; i < colSpan; i++) {
          opened.set(column + i, rowSpan - 1);
        }
      }
      column += colSpan;
    }

    // Age carried-over spans only once this row is placed, then take on the
    // spans this row opened. Aging before placement would free a column while
    // its cell still covers the row.
    for (const [spanColumn, remaining] of rowSpans) {
      if (remaining <= 1) rowSpans.delete(spanColumn);
      else rowSpans.set(spanColumn, remaining - 1);
    }
    for (const [spanColumn, remaining] of opened) {
      rowSpans.set(spanColumn, remaining);
    }
  }
}

/** Apply super-column divider annotations to all explicit HTML tables in the article. */
export function annotateHtmlTableDividers(root: HTMLElement): void {
  for (const table of root.querySelectorAll<HTMLTableElement>(
    '[data-html-table-content] table',
  )) {
    annotateHtmlTableSuperColumnDividers(table);
  }
}
