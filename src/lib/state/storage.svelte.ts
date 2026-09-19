import { browser } from '$app/env';

/** A reactive value whose changes are mirrored to `localStorage`. */
export interface Persisted<T> {
  /** Current value; replacing it persists in the browser and throws during SSR. */
  value: T;
}

/**
 * Recursively freezes `value` so that neither it nor anything reachable from
 * it can be mutated in place. Already-frozen objects terminate the walk, which
 * also makes the traversal safe against cycles.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  return value;
}

/**
 * Create a `$state.raw`-backed value that persists to `localStorage`.
 *
 * The value is read from `localStorage` on construction (if running in the
 * browser and an entry under `key` exists and parses as JSON); otherwise it
 * falls back to `initial`. Subsequent writes update both the reactive cell and
 * the underlying storage. Reads inside reactive scopes (`$derived`, `$effect`,
 * components) track the value as usual.
 *
 * On the server there is no cell at all. The caller chooses the lifetime: a
 * module-scoped instance would be shared by every request the Node process
 * serves, while an instance created during component initialization stays in
 * that component tree. Server renders therefore read a deep-frozen `initial`,
 * and a write throws rather than silently corrupting shared process state.
 * That throw is a tripwire, not a supported path: keep state getters pure and
 * confine writes to client effects and event handlers.
 *
 * The cell is `$state.raw`, not `$state`: every caller replaces the whole value
 * rather than mutating it. Deep reactivity would proxy every object and nested
 * field on read to buy change tracking these whole-value payloads do not use.
 * Raw also makes the spread-and-replace rule structural -- an in-place mutation
 * simply will not publish, instead of appearing to work in the browser and
 * potentially leaking when a caller chooses module scope.
 *
 * Persistence is otherwise best-effort: storage failures (private-mode quota,
 * denied access) are swallowed silently. Versioning, migrations, and cross-tab
 * synchronization are out of scope -- they can be layered on later without
 * changing the call sites.
 */
export function persisted<T>(key: string, initial: T): Persisted<T> {
  if (!browser) {
    const frozen = deepFreeze(initial);
    return {
      get value() {
        return frozen;
      },
      set value(next: T) {
        throw new Error(
          `persisted(${key}): refused a write during SSR. This cell is shared ` +
            `by every request in the process, so writing it would leak state ` +
            `across requests. Move the write into an effect or event handler.`,
        );
      },
    };
  }

  let current = $state.raw<T>(initial);

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      current = JSON.parse(raw) as T;
    }
  } catch {
    // malformed JSON or storage denied -- fall back to initial
  }

  return {
    get value() {
      return current;
    },
    set value(next: T) {
      current = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // quota exceeded or storage denied -- value still updates in memory
      }
    },
  };
}
