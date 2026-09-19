# Filtering and selection policy

The `filters` module owns reusable rules for interpreting filter selections and deciding which candidate identities they admit. These rules are pure value transformations that controls and controllers can share. Callers supply the available values and apply the result to their domain data; ownership of requests, persistence, and reactive state stays with those callers.

Keep a selection rule here when its consumers must agree about the same semantics. A predicate that knows a particular resource's fields or permissions belongs to that domain, while presentation belongs in a control. This boundary can hold more than one filtering contract without making the first contract a universal representation for all filters.

## Responsibilities and boundaries

| Policy                | Responsibility                                                                                                 | Presentation boundary                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Multiselect selection | Normalize, toggle, prune, and test a selection while preserving the difference between unconstrained and empty | Selection controls present the policy; the owner supplies options and applies domain filtering |

Multiselect facets are the initial policy. The following sections describe that policy's values and operations; an owning controller decides which options exist and how they filter its data.

The [FacetMultiselect control](../components/elements/FacetMultiselect.svelte) presents these selection semantics; its owner supplies the complete option set and applies the resulting selection to domain data. The distinction between unconstrained and empty must survive both the control and persisted state.

## Unconstrained and empty are different

| `FacetSelection` value | Meaning                                 | Effect when new options arrive         |
| ---------------------- | --------------------------------------- | -------------------------------------- |
| `null`                 | Unconstrained: every option is eligible | New options are included automatically |
| `[]`                   | Explicitly select nothing               | New options remain excluded            |
| An array of IDs        | Constrain to those identities           | New IDs remain excluded until selected |

This distinction preserves intent across changing datasets. Saving today's complete ID list as “all” would exclude tomorrow's newly added option. Conversely, treating an empty list as “all” would prevent the user from expressing an empty result.

`FacetOption` supplies a stable `id`, visible `label`, and supplementary `detail` string. Labels can change without changing the selection identity. An option count belongs in the caller-provided detail; this library does not count or query records.

## Operations and boundaries

`normalizeFacetSelection(unknown)` accepts arrays, drops non-string entries and duplicates, and retains an explicitly empty array. Any non-array value becomes unconstrained. This is useful at a saved-preference boundary; it does not check whether a retained ID exists in the current options.

`facetIncludes` tests an individual ID. `facetSelectedIds(selection, ids)` produces a new array in the caller's option order, omitting selected IDs that are not currently available. `facetSelectsAll` checks whether all supplied IDs are admitted; with an empty option list this is vacuously true. `facetSelectsNone` recognizes only an explicitly empty array, not a nonempty selection whose IDs have all disappeared.

`toggleFacetOption(selection, id, ids)` materializes an unconstrained selection as the full supplied ID list before toggling. When the result covers every supplied ID, it collapses back to `null`, restoring the future-option behavior of “all.” Supply the complete current option IDs and toggle an ID from that set. Partial visible lists would redefine what “all” means.

`pruneFacetSelection(selection, ids)` drops unavailable IDs while retaining `null`. It returns the same array object when nothing changes, avoiding unnecessary state replacement. It does not turn an explicit array into `null` merely because it currently contains every available option; normalization and pruning preserve saved intent, while a user toggle can deliberately restore unconstrained selection.

```ts
import { toggleFacetOption, facetSelectedIds } from '#lib/filters/facets.js';

const options = ['alpha', 'beta'];
const selected = toggleFacetOption(null, 'beta', options); // ['alpha']
facetSelectedIds(selected, ['beta', 'alpha', 'gamma']); // ['alpha']
toggleFacetOption(selected, 'beta', options); // null: unconstrained again
```

## Ownership and extension

The caller owns immutable state replacement, account-scoped persistence, option uniqueness, and domain filtering. Do not store a mutable global selection here or add a fetch merely to obtain counts. Combine separate facets in the controller, where the intended AND/OR policy is visible.

Changing these semantics changes what a remembered selection means. Validate unconstrained, empty, unknown/stale IDs, changing option sets, and toggling the last excluded option. Run the [UI gates](../../../README.md#run-and-validate); component rendering and actual search behavior remain application checks.
