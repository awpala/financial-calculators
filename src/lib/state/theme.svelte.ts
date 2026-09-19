import { createContext } from 'svelte';
import { persisted } from '#lib/state/storage.svelte.js';

/** Supported color themes stored by the context-owned ThemeStore. */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * ThemeStore is a reactive holder for the active color theme.
 *
 * It is installed on the component context by the root layout rather than
 * living at module scope: a module-scoped cell in a `.svelte.ts` file is one
 * object shared by every SSR request the Node process serves, which would make
 * one visitor's theme the next visitor's theme.
 */
export class ThemeStore {
  #current;

  /** Creates a theme store seeded from the provided initial theme. */
  constructor(initial: Theme) {
    this.#current = persisted<Theme>(STORAGE_KEY, initial);
  }

  /** Returns the current theme value. */
  get current(): Theme {
    return this.#current.value;
  }

  /** Updates the current theme value. */
  set current(next: Theme) {
    this.#current.value = next;
  }

  /** Toggles between light and dark themes. */
  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
  }
}

/**
 * Type-safe context accessors for the active ThemeStore. `setThemeContext`
 * installs a store and returns it; `getThemeContext` reads the store installed
 * by the nearest ancestor, throwing if none was installed.
 */
export const [getThemeContext, setThemeContext] = createContext<ThemeStore>();

/**
 * Reads the theme that the inline init script in app.html committed to the
 * DOM. Defaults to 'light' for SSR or when called before that script runs.
 */
export function detectInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
