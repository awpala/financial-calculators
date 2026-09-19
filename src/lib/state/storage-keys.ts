/**
 * The browser-local storage keys this application writes, and the one rule that
 * scopes them to a user.
 *
 * Every value below is per-identity. One browser serves more than one account,
 * so a key that omits the user -- or spells a prefix differently than the
 * module that reads it back -- hands one user's filters, cursor, or reading
 * position to the next. Building these in one place is what keeps a writer and
 * a reader in separate modules from disagreeing.
 *
 * REPLACE THE ENTRIES BELOW with the per-user values this project persists.
 * Keep the generic shell and scroll prefixes when their helpers remain in use.
 */

/** Prefixes for the per-user values persisted in browser storage. */
export const USER_SCOPED_STORAGE = {
  /** Element-local scroll offsets, further scoped by content and region. */
  localScrollPosition: 'local_scroll_position',
} as const;

/** One of the per-user storage prefixes. */
export type UserScopedStoragePrefix =
  (typeof USER_SCOPED_STORAGE)[keyof typeof USER_SCOPED_STORAGE];

/**
 * Build the browser-local key holding one user's copy of a value.
 *
 * The identifier is encoded so a separator inside it cannot collide with the
 * next segment; a signed-out caller passes an empty string and gets the
 * anonymous slot rather than another user's.
 */
export function userScopedKey(
  prefix: UserScopedStoragePrefix,
  userId: string,
): string {
  return `${prefix}:${encodeURIComponent(userId)}`;
}

/** Report whether a stored key holds some user's copy of this value. */
export function isUserScopedKey(
  key: string,
  prefix: UserScopedStoragePrefix,
): boolean {
  return key.startsWith(`${prefix}:`);
}
