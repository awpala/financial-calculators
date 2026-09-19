/**
 * Browser-local storage prefixes and their identity-namespace encoding.
 *
 * Centralizing prefix spelling and segment encoding keeps preference readers
 * and writers in agreement. The scroll helpers add content and region segments
 * to isolate independently scrolling views.
 *
 * Financial Calculators has no accounts; application callers use an empty
 * identity for the anonymous namespace. Key scoping does not authenticate a
 * visitor or restrict access to browser storage.
 */

/** Prefixes for identity-namespaced values persisted in browser storage. */
export const USER_SCOPED_STORAGE = {
  /** Element-local scroll offsets, further scoped by content and region. */
  localScrollPosition: 'local_scroll_position',
} as const;

/** One of the identity-namespaced storage prefixes. */
export type UserScopedStoragePrefix =
  (typeof USER_SCOPED_STORAGE)[keyof typeof USER_SCOPED_STORAGE];

/**
 * Build the browser-local key holding one namespace's copy of a value.
 *
 * The identifier is encoded so a separator inside it cannot collide with the
 * next segment. This public application passes an empty string to select the
 * anonymous slot; other supplied identities remain isolated by the helper.
 */
export function userScopedKey(
  prefix: UserScopedStoragePrefix,
  userId: string,
): string {
  return `${prefix}:${encodeURIComponent(userId)}`;
}

/** Report whether a stored key belongs to this prefix's namespace family. */
export function isUserScopedKey(
  key: string,
  prefix: UserScopedStoragePrefix,
): boolean {
  return key.startsWith(`${prefix}:`);
}
