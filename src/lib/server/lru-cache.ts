/** A bounded least-recently-used cache backed by insertion-ordered map entries. */
export class LruCache<K, V> {
  readonly #maxEntries: number;
  readonly #values = new Map<K, V>();

  /** Create a cache that retains at most `maxEntries` values. */
  constructor(maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError('maxEntries must be a positive integer');
    }
    this.#maxEntries = maxEntries;
  }

  /** Return the cached value and mark it as most recently used. */
  get(key: K): V | undefined {
    if (!this.#values.has(key)) return undefined;
    const value = this.#values.get(key) as V;
    this.#values.delete(key);
    this.#values.set(key, value);
    return value;
  }

  /** Store a value and evict the least-recently-used entry when over capacity. */
  set(key: K, value: V): void {
    this.#values.delete(key);
    this.#values.set(key, value);
    if (this.#values.size <= this.#maxEntries) return;
    const oldestKey = this.#values.keys().next().value as K;
    this.#values.delete(oldestKey);
  }

  /** Remove one cached value and report whether it existed. */
  delete(key: K): boolean {
    return this.#values.delete(key);
  }

  /** Remove every cached value. */
  clear(): void {
    this.#values.clear();
  }

  /** Return the number of entries currently retained. */
  get size(): number {
    return this.#values.size;
  }
}
