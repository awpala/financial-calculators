import { afterEach, describe, expect, it, vi } from 'vitest';
import { freezeLeftColumns } from '#lib/markdown/renderers/frozen-columns.js';

afterEach(() => vi.unstubAllGlobals());

describe('frozen-column attachment lifetime', () => {
  it('restores previous cell presentation before reattaching with fewer columns', () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        disconnect = disconnect;
      },
    );
    const table = document.createElement('table');
    table.innerHTML =
      '<thead><tr><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>3</td></tr></tbody>';
    const cells = Array.from(table.rows).flatMap((row) =>
      Array.from(row.cells),
    );
    cells[0].style.setProperty('left', '7px', 'important');
    cells[0].setAttribute('data-frozen-column', 'original');
    const detachThree = freezeLeftColumns(3)(table);
    expect(cells[2].dataset.frozenColumn).toBe('last');
    detachThree?.();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cells[0].style.getPropertyValue('left')).toBe('7px');
    expect(cells[0].style.getPropertyPriority('left')).toBe('important');
    expect(cells[0].dataset.frozenColumn).toBe('original');
    expect(cells[2].hasAttribute('data-frozen-column')).toBe(false);
    expect(cells[2].style.left).toBe('');

    const detachOne = freezeLeftColumns(1)(table);
    expect(cells[0].dataset.frozenColumn).toBe('last');
    expect(cells[1].hasAttribute('data-frozen-column')).toBe(false);
    expect(cells[2].hasAttribute('data-frozen-column')).toBe(false);
    detachOne?.();
    expect(freezeLeftColumns(undefined)(table)).toBeUndefined();
    expect(cells[0].dataset.frozenColumn).toBe('original');
    expect(observe).toHaveBeenCalledTimes(2);
  });
});
