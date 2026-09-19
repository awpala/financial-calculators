/** Preserve Error messages and describe other thrown values with an optional fallback. */
export function errorMessage(error: unknown, fallback?: string): string {
  return error instanceof Error ? error.message : (fallback ?? String(error));
}
