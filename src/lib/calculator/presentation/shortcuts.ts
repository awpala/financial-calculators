/**
 * Calculator input shortcuts: Shift+Enter calculates (Scratchpad only),
 * Ctrl+L clears inputs (Scratchpad, Amortization, and Cashflow), and Shift+D
 * resets inputs to their defaults — D for Defaults (Amortization and
 * Cashflow, which are the views with a Reset action). Enter and Space
 * otherwise remain text. Browsers may reserve Ctrl+L for the address bar, so
 * the Clear Inputs button is always available as well.
 */

type ShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing'
>;

/** The keycap label for the Calculate shortcut. */
export const CALCULATE_SHORTCUT_LABEL = 'Shift Enter';

/** The keycap label for the Clear Inputs shortcut. */
export const CLEAR_INPUTS_SHORTCUT_LABEL = 'Ctrl L';

/** The Clear Inputs shortcut, as `aria-keyshortcuts` spells it. */
export const CLEAR_INPUTS_KEYSHORTCUTS = 'Control+L';

/** The keycap label for the Reset shortcut. */
export const RESET_SHORTCUT_LABEL = 'Shift D';

/** The Reset shortcut, as `aria-keyshortcuts` spells it. */
export const RESET_KEYSHORTCUTS = 'Shift+D';

function isShiftOnly(event: ShortcutEvent): boolean {
  return (
    event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing
  );
}

/** Whether a keydown is Shift+Enter, which calculates. */
export function isCalculateShortcut(event: ShortcutEvent): boolean {
  return isShiftOnly(event) && event.key === 'Enter';
}

/**
 * Whether a keydown is Ctrl+L, which clears the input. The physical key is
 * matched first so another keyboard layout
 * still reaches it; the character is the fallback, and with Ctrl held some
 * layouts report no printable character at all.
 */
export function isClearInputsShortcut(event: ShortcutEvent): boolean {
  return (
    event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing &&
    (event.code === 'KeyL' || event.key.toLocaleLowerCase() === 'l')
  );
}

/**
 * Whether a keydown is Shift+D, which resets the input to its defaults — D
 * for Defaults. The physical key is matched first so another keyboard layout
 * still reaches it; the character is the fallback.
 */
export function isResetShortcut(event: ShortcutEvent): boolean {
  return (
    isShiftOnly(event) &&
    (event.code === 'KeyD' || event.key.toLocaleLowerCase() === 'd')
  );
}
