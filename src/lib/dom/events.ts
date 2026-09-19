/**
 * Readers for the element that fired a DOM event.
 *
 * Svelte hands handlers a plain `Event`, so every inline handler that wants the
 * new value has to narrow `currentTarget` itself. Doing that once here keeps the
 * assertion in a single reviewable place instead of repeating it per control.
 *
 * The narrowing is an unchecked cast, and it is sound only under one condition:
 * the handler must be bound directly to the element whose value is wanted.
 * `currentTarget` is the element the listener is attached to, not the one that
 * originated the event, so on a delegated or bubbled handler these read the
 * wrong element — silently, because the cast cannot fail at runtime. Bind them
 * inline on the control itself, as every call site here does, or narrow
 * `event.target` explicitly instead.
 */

/** Read the checked state of the checkbox or radio that fired `event`. */
export function checkedFrom(event: Event): boolean {
  return (event.currentTarget as HTMLInputElement).checked;
}

/** Read the value of the input, select, or textarea that fired `event`. */
export function valueFrom(event: Event): string {
  return (
    event.currentTarget as
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ).value;
}
