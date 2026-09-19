/**
 * Shared vocabulary for the application's labeled form controls.
 *
 * `TextField`, `SelectField`, and `SearchField` present the same control to the
 * reader but cannot share an implementation -- one wraps its input to seat a
 * Clear button, another renders options -- so the parts they must agree on
 * live here instead. `FieldGroup`
 * and the rail's segmented toggle borrow the same border vocabulary for the
 * containers they draw around groups of choices.
 *
 * These constants are consumed by those components, never by a call site. A
 * route that imports one is writing a field by hand, which is the drift the
 * components exist to prevent.
 */

/**
 * How prominently a labeled control presents itself.
 *
 * `form` is a page form; `rail` is the compact contextual rail, where a field
 * is secondary chrome beside the content it filters.
 */
export type FieldDensity = 'form' | 'rail';

/**
 * Classes applied to the control element of a labeled field, minus its width
 * and its padding.
 *
 * Width is left to each component because a select is content-width in some
 * places and full-width in others. Padding is left out because `SearchField`
 * reserves room for its Clear button and needs asymmetric padding. A shorthand
 * such as `px-3` alongside a longhand such as `pr-10` resolves by stylesheet order
 * rather than by the order the classes are written, which is not a thing a
 * call site should have to reason about. Components that want the ordinary
 * box compose `FIELD_CONTROL_PADDING`; controls with inset buttons spell theirs
 * out.
 *
 * A control marked `aria-invalid` draws a red border and focus ring, so every
 * field flags input its owner cannot read the same way.
 *
 * The surface-dependent dark ground is absent for the same reason it is absent
 * from every card class here: it depends on the surface behind the field, so
 * the call site supplies it.
 */
export const FIELD_CONTROL_CLASS =
  'block rounded-md border border-slate-300 bg-white text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:focus:border-slate-500 dark:focus:ring-slate-800 aria-invalid:border-red-500 aria-invalid:focus:ring-red-200 dark:aria-invalid:border-red-500 dark:aria-invalid:focus:ring-red-900';

/** Padding of a field control whose box is symmetric. */
export const FIELD_CONTROL_PADDING = 'px-3 py-2';

/**
 * Classes applied to a bordered container that groups controls rather than
 * being one: the rail's choice boxes and its segmented order toggle.
 *
 * Unlike `FIELD_CONTROL_CLASS` this carries its dark ground, because every use
 * of it is inside the contextual rail, where the ground does not vary.
 */
export const FIELD_BOX_CLASS =
  'rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950';

/** Classes applied to the visible label above a control, by density. */
export const FIELD_LABEL_CLASS: Record<FieldDensity, string> = {
  /** Standard page-form presentation. */
  form: 'block text-sm font-medium',
  /** Compact contextual-rail presentation. */
  rail: 'text-xs font-medium text-slate-600 dark:text-slate-300',
};

/** Spacing between a label and the control beneath it, by density. */
export const FIELD_GAP_CLASS: Record<FieldDensity, string> = {
  /** Standard page-form presentation. */
  form: 'mt-2',
  /** Compact contextual-rail presentation. */
  rail: 'mt-1.5',
};
