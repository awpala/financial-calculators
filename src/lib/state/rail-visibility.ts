/** The browser-local key holding the contextual rail's collapse state. */
export const RAIL_VISIBILITY_STORAGE_KEY = 'contextual_rail_open';

/** Whether the rail starts expanded when nothing has been remembered yet. */
export const RAIL_OPEN_BY_DEFAULT = true;

/**
 * Read the remembered collapse state out of untrusted storage.
 *
 * There is one state for the rail itself, not one per route: collapsing it is a
 * statement about how much chrome the member wants, so it carries across views
 * rather than being re-decided every time a route lends the shell its content.
 * Anything that is not a boolean degrades to the default rather than to a rail
 * that cannot be reopened.
 */
export function normalizeRailOpen(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : RAIL_OPEN_BY_DEFAULT;
}
