import { describe, expect, it } from 'vitest';
import {
  normalizeCalculatorCalculation,
  normalizeCalculatorInput,
} from '#lib/calculator/persistence/calculation.js';
import { normalizeCalculatorFlag } from '#lib/calculator/persistence/preferences.js';
import { CalculatorStore } from '#lib/calculator/calculator.svelte.js';

function createStore(rememberedSuffix: unknown = undefined) {
  const suffixed = { value: rememberedSuffix };
  return { store: new CalculatorStore({ suffixed }), suffixed };
}

describe('CalculatorStore', () => {
  it('calculates only valid input and drops the result when the input changes', () => {
    const { store } = createStore();
    expect(store.canCalculate).toBe(false);
    store.calculate();
    expect(store.calculation).toBeUndefined();

    store.source = '2 +';
    expect(store.parsed.status).toBe('invalid');
    store.calculate();
    expect(store.calculation).toBeUndefined();

    store.source = '2 + 3';
    expect(store.canCalculate).toBe(true);
    store.calculate();
    expect(store.calculation).toEqual({ value: 5, bindings: [] });

    store.source = '2 + 3';
    expect(store.calculation?.value).toBe(5);
    expect(store.calculation?.value).toBe(5);

    store.source = '2 + 3 +';
    expect(store.calculation).toBeUndefined();
  });

  it('reports a calculation stopped short, remembers no result, and forgets the error on any change', () => {
    const input = { value: 'sum_i(i, 1, 1t)' as unknown };
    const calculation = { value: null as unknown };
    const { store } = createStore();
    store.adopt({ input, calculation });

    store.calculate();
    expect(store.calculation).toBeUndefined();
    expect(store.calculationError).toBe(
      "'sum_i' on line 1 would take the sums and products past 10,000,000 terms, the most one calculation evaluates",
    );
    expect(calculation.value).toBeNull();

    store.source = 'sum_i(i, 1, 1k)';
    expect(store.calculationError).toBeUndefined();

    store.source = 'sum_i(i, 1, 1t)';
    store.calculate();
    store.source = 'sum_i(i, 1, 4)';
    store.calculate();
    expect(store.calculationError).toBeUndefined();
    expect(store.calculation?.value).toBe(10);

    store.source = 'sum_i(i, 1, 1t)';
    store.calculate();
    store.adopt({ input: { value: '' }, calculation: { value: null } });
    expect(store.calculationError).toBeUndefined();
  });

  it('treats only a stored true as an enabled preference', () => {
    expect(normalizeCalculatorFlag(true)).toBe(true);
    for (const raw of [false, 'true', 1, null, undefined, {}]) {
      expect(normalizeCalculatorFlag(raw)).toBe(false);
    }
  });

  it('clears the input and the last result together', () => {
    const { store } = createStore();
    store.source = 'x = 2;\nx * 3';
    store.calculate();

    store.clear();
    expect(store.source).toBe('');
    expect(store.parsed).toEqual({ status: 'empty' });
    expect(store.calculation).toBeUndefined();
  });

  it('adopts a remembered input and remembers every edit to it', () => {
    const { store } = createStore();
    store.source = 'unsaved = 1;';
    store.calculate();

    const cell = { value: 'x = 2;\nx * 3' as unknown };
    store.adopt({ input: cell, calculation: { value: null } });
    expect(store.source).toBe('x = 2;\nx * 3');
    expect(store.calculation).toBeUndefined();

    store.source = 'x = 2;\nx * 4';
    expect(cell.value).toBe('x = 2;\nx * 4');
    store.clear();
    expect(cell.value).toBe('');
  });

  it('drops the previous workspace’s result when another workspace’s input is adopted', () => {
    const { store } = createStore();
    store.adopt({
      input: { value: 'secret = 100;\nsecret' },
      calculation: { value: null },
    });
    store.calculate();
    expect(store.calculation?.value).toBe(100);

    const next = { value: undefined as unknown };
    store.adopt({ input: next, calculation: { value: null } });
    expect(store.source).toBe('');
    expect(store.calculation).toBeUndefined();
    store.source = '1 + 1';
    expect(next.value).toBe('1 + 1');
  });

  it('treats only stored text as an input', () => {
    expect(normalizeCalculatorInput('1 + 2')).toBe('1 + 2');
    for (const raw of [undefined, null, 3, true, {}, ['1']]) {
      expect(normalizeCalculatorInput(raw)).toBe('');
    }
  });

  it('adopts the remembered result presentation and remembers a change', () => {
    const { store, suffixed } = createStore(true);
    expect(store.suffixed).toBe(true);

    store.setSuffixed(false);
    expect(store.suffixed).toBe(false);
    expect(suffixed.value).toBe(false);
  });

  it('shows full figures unless the stored value is exactly true', () => {
    expect(createStore().store.suffixed).toBe(false);
    for (const raw of [undefined, null, false, 'true', 1, {}]) {
      expect(createStore(raw).store.suffixed).toBe(false);
    }
  });

  it('constructs and adopts without writes and keeps separate instances isolated', () => {
    const suffixed = Object.freeze({ value: true });
    const first = new CalculatorStore({ suffixed });
    first.adopt({
      input: Object.freeze({ value: 'a = 2; a * 3' }),
      calculation: Object.freeze({
        value: {
          source: 'a = 2; a * 3',
          value: 6,
          bindings: [{ name: 'a', value: 2 }],
        },
      }),
    });

    const { store: second } = createStore();
    second.source = 'b = 4; b + 1';
    second.calculate();
    expect(second.calculation).toEqual({
      value: 5,
      bindings: [{ name: 'b', value: 4 }],
    });
    expect(first.source).toBe('a = 2; a * 3');
    expect(first.calculation?.value).toBe(6);
    expect(first.suffixed).toBe(true);
    second.source = 'a';
    expect(second.parsed.status).toBe('invalid');
  });

  it('remembers a result beside its input, and drops both on a change', () => {
    const input = { value: 'x = 2;\nx * 3' as unknown };
    const calculation = { value: null as unknown };
    const { store } = createStore();
    store.adopt({ input, calculation });

    store.calculate();
    expect(store.calculation).toEqual({
      value: 6,
      bindings: [{ name: 'x', value: 2 }],
    });
    expect(calculation.value).toEqual({
      source: 'x = 2;\nx * 3',
      value: 6,
      bindings: [{ name: 'x', value: 2 }],
    });

    store.source = 'x = 2;\nx * 4';
    expect(store.calculation).toBeUndefined();
    expect(calculation.value).toBeNull();

    store.calculate();
    store.clear();
    expect(calculation.value).toBeNull();
  });

  it('restores a remembered result, so a reload keeps the figures', () => {
    const { store } = createStore();
    store.adopt({
      input: { value: 'a = 2;\na + 1' },
      calculation: {
        value: {
          source: 'a = 2;\na + 1',
          value: 3,
          bindings: [{ name: 'a', value: 2 }],
        },
      },
    });

    expect(store.source).toBe('a = 2;\na + 1');
    expect(store.calculation).toEqual({
      value: 3,
      bindings: [{ name: 'a', value: 2 }],
    });
  });

  it('keeps a remembered result only where it names the remembered input', () => {
    const stored = {
      source: 'a = 2;\na + 1',
      value: 3,
      bindings: [{ name: 'a', value: 2 }],
    };
    expect(normalizeCalculatorCalculation(stored, 'a = 2;\na + 1')).toEqual({
      value: 3,
      bindings: [{ name: 'a', value: 2 }],
    });
    expect(
      normalizeCalculatorCalculation(stored, 'a = 2;\na + 2'),
    ).toBeUndefined();
  });

  it('carries a declaration-only result and a non-finite one through storage', () => {
    const input = { value: 'broken = 1 / 0;' as unknown };
    const calculation = { value: null as unknown };
    const { store } = createStore();
    store.adopt({ input, calculation });
    store.calculate();

    // JSON has no infinity, so it is stored as null and read back as not finite.
    expect(calculation.value).toEqual({
      source: 'broken = 1 / 0;',
      bindings: [{ name: 'broken', value: null }],
    });

    const restored = normalizeCalculatorCalculation(
      calculation.value,
      'broken = 1 / 0;',
    );
    expect(restored?.value).toBeUndefined();
    expect(restored?.bindings[0]?.name).toBe('broken');
    expect(restored?.bindings[0]?.value).toBeNaN();
  });

  it.each([
    [undefined],
    [null],
    ['a result'],
    [{ source: 'x', bindings: 'nope' }],
    [{ source: 'x', bindings: [{ name: 1, value: 2 }] }],
    [{ source: 'x', bindings: [{ name: 'a' }] }],
    [{ source: 'x', bindings: [{ name: 'a', value: 'two' }] }],
    [{ source: 'x', bindings: [{ name: 'a', value: false }] }],
    [{ source: 'x', bindings: [{ name: 'a', value: {} }] }],
    [{ source: 'x', value: 'three', bindings: [] }],
  ])('refuses the malformed remembered result %j', (raw) => {
    expect(normalizeCalculatorCalculation(raw, 'x')).toBeUndefined();
  });
});
