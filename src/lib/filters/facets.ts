/** One checkbox in a facet: a stable id, its display text, and a size hint. */
export type FacetOption = {
  /** Stable identifier for this record. */
  id: string;
  /** The label presented to the reader. */
  label: string;
  /** Supplementary text such as a count shown beside the facet option. */
  detail: string;
};

/**
 * A multiselect facet's state. `null` means unconstrained rather than empty: it
 * keeps an option added after the selection was saved eligible, which an
 * explicit id list could not. An array constrains to exactly those ids, so `[]`
 * really does match nothing.
 */
export type FacetSelection = readonly string[] | null;

/**
 * Normalize untrusted selection input: non-arrays become unconstrained, while arrays
 * retain unique string identifiers including an explicit empty selection.
 */
export function normalizeFacetSelection(raw: unknown): FacetSelection {
  if (!Array.isArray(raw)) return null;
  return [...new Set(raw.filter((id): id is string => typeof id === 'string'))];
}

/** Whether a facet admits `id`. */
export function facetIncludes(selection: FacetSelection, id: string): boolean {
  return selection === null || selection.includes(id);
}

/**
 * The ids a facet admits, in the order `ids` supplies them. An unconstrained
 * facet resolves to all of them, which is what lets a caller treat "no
 * selection saved yet" and "everything checked" as the same request.
 */
export function facetSelectedIds(
  selection: FacetSelection,
  ids: readonly string[],
): string[] {
  if (selection === null) return [...ids];
  return ids.filter((id) => selection.includes(id));
}

/** Whether a facet admits every one of `ids`, and so narrows nothing. */
export function facetSelectsAll(
  selection: FacetSelection,
  ids: readonly string[],
): boolean {
  return selection === null || ids.every((id) => selection.includes(id));
}

/** Whether a facet admits nothing at all. */
export function facetSelectsNone(selection: FacetSelection): boolean {
  return selection !== null && selection.length === 0;
}

/**
 * Flip one option. An unconstrained facet materializes into the full id list
 * before the flip, so unchecking one box means "all but this one" rather than
 * "only this one"; a selection that grows back to cover `ids` collapses to
 * unconstrained again, which is what keeps a later option eligible.
 */
export function toggleFacetOption(
  selection: FacetSelection,
  id: string,
  ids: readonly string[],
): FacetSelection {
  const current = selection ?? ids;
  const next = current.includes(id)
    ? current.filter((candidate) => candidate !== id)
    : [...current, id];
  const selected = new Set(next);
  return ids.every((candidate) => selected.has(candidate)) ? null : next;
}

/**
 * Remove unavailable identifiers while preserving unconstrained selections and
 * unchanged array identity.
 */
export function pruneFacetSelection(
  selection: FacetSelection,
  ids: readonly string[],
): FacetSelection {
  if (selection === null) return null;
  const available = new Set(ids);
  const kept = selection.filter((id) => available.has(id));
  return kept.length === selection.length ? selection : kept;
}
