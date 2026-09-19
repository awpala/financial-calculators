/**
 * Track independent request scopes for one view. A new request supersedes the
 * previous request in its scope; invalidation and destruction discard results
 * without canceling the underlying transport. The owning view calls destroy().
 */
export class LatestRequests<Scope extends string> {
  #tokens = new Map<Scope, object>();
  #destroyed = false;

  /** Whether this view has permanently stopped accepting results and actions. */
  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** Start a scope and return a predicate that accepts only its current result. */
  begin(scope: Scope): () => boolean {
    const token = {};
    if (!this.#destroyed) this.#tokens.set(scope, token);
    return () => !this.#destroyed && this.#tokens.get(scope) === token;
  }

  /** Discard pending results when their parent selection changes. */
  invalidate(...scopes: Scope[]): void {
    for (const scope of scopes) this.#tokens.delete(scope);
  }

  /** Permanently discard all pending and future results for this view. */
  destroy(): void {
    this.#destroyed = true;
    this.#tokens.clear();
  }
}
