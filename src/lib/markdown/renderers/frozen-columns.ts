import type { Attachment } from 'svelte/attachments';

/**
 * Pin the leftmost columns of a table so they stay in view while it scrolls
 * horizontally, the way Excel's frozen panes behave.
 *
 * Sticky cells need a `left` offset in pixels, and a column's width is only
 * known once the browser has laid the table out, so the offsets are measured
 * from the header row rather than derived at parse time. This also keeps the
 * behavior available to authored HTML tables, whose column widths the AST
 * cannot see. A `ResizeObserver` re-measures when the table reflows.
 *
 * Rows whose first cell spans several columns — subheader bands — are skipped,
 * since there is no single column to pin.
 * Teardown disconnects the observer and restores every touched cell's previous
 * left style and frozen-column attribute, including when the count changes.
 */
export function freezeLeftColumns(
  count: number | undefined,
): Attachment<HTMLElement> {
  return (root) => {
    const table =
      root instanceof HTMLTableElement ? root : root.querySelector('table');
    if (!table || !count || count < 1) return;
    const originals = new Map<
      HTMLTableCellElement,
      { left: string; priority: string; frozen: string | null }
    >();

    const pin = () => {
      const header = table.tHead?.rows[0] ?? table.rows[0];
      if (!header) return;

      const offsets: number[] = [];
      let left = 0;
      for (let i = 0; i < count && i < header.cells.length; i++) {
        offsets.push(left);
        left += header.cells[i].getBoundingClientRect().width;
      }

      for (const row of table.rows) {
        if ((row.cells[0]?.colSpan ?? 1) > 1) continue;
        offsets.forEach((offset, i) => {
          const cell = row.cells[i];
          if (!cell) return;
          if (!originals.has(cell)) {
            originals.set(cell, {
              left: cell.style.getPropertyValue('left'),
              priority: cell.style.getPropertyPriority('left'),
              frozen: cell.getAttribute('data-frozen-column'),
            });
          }
          cell.style.left = `${offset}px`;
          cell.dataset.frozenColumn =
            i === offsets.length - 1 ? 'last' : 'true';
        });
      }
    };

    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(table);
    return () => {
      observer.disconnect();
      for (const [cell, previous] of originals) {
        cell.style.setProperty('left', previous.left, previous.priority);
        if (previous.frozen === null)
          cell.removeAttribute('data-frozen-column');
        else cell.setAttribute('data-frozen-column', previous.frozen);
      }
      originals.clear();
    };
  };
}
