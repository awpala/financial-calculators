/**
 * Shared class strings for the application's bordered surfaces.
 *
 * `Card` composes these into its variants. They live outside that component
 * because `Modal` renders a native `<dialog>` whose element it must hold a
 * reference to in order to call `showModal` and `close`; it therefore cannot
 * delegate its element to `Card`, and composes the same tokens alongside its
 * own dialog chrome instead.
 */

/** Border applied to every bordered surface in the application. */
export const SURFACE_BORDER_CLASS =
  'border border-slate-200 dark:border-slate-800';

/** Ground applied to a filled surface, over the application's page background. */
export const SURFACE_FILL_CLASS = 'bg-white dark:bg-slate-900';
