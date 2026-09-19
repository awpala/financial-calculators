import { describe, expect, it, beforeEach } from 'vitest';
import { persisted } from '#lib/state/storage.svelte.js';

describe('persisted', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to the initial value when nothing is stored', () => {
    expect(persisted('absent', 'fallback').value).toBe('fallback');
  });

  it('reads a previously stored value', () => {
    localStorage.setItem('present', JSON.stringify({ count: 2 }));
    expect(persisted<{ count: number }>('present', { count: 0 }).value).toEqual(
      {
        count: 2,
      },
    );
  });

  it('writes through to localStorage', () => {
    const cell = persisted('written', 0);
    cell.value = 7;
    expect(cell.value).toBe(7);
    expect(localStorage.getItem('written')).toBe('7');
  });

  it('degrades to the initial value when the stored JSON is malformed', () => {
    localStorage.setItem('broken', '{not json');
    expect(persisted('broken', 'fallback').value).toBe('fallback');
  });
});
