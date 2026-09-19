<!--
@component
Displays a controlled facet selection with per-option toggles and whole-scope actions.
-->
<script lang="ts">
  import {
    facetIncludes,
    facetSelectsAll,
    facetSelectsNone,
    type FacetOption,
    type FacetSelection,
  } from '#lib/filters/facets.js';
  import FieldGroup from '#lib/components/elements/FieldGroup.svelte';
  import { FIELD_LABEL_CLASS } from '#lib/components/elements/field.js';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Accessible and visible label for this facet group. */
    legend: string;
    /** Available facet identifiers and their display labels. */
    options: FacetOption[];
    /** Controlled facet selection, including all and none states. */
    selection: FacetSelection;
    /** Message shown when no facet options are available. */
    emptyLabel: string;
    /** Optional note explaining what this facet narrows. */
    description?: string;
    /** Requests toggling the supplied facet identifier. */
    onToggle: (id: string) => void;
    /** Requests selection of every available facet. */
    onSelectAll: () => void;
    /** Requests clearing the facet selection. */
    onSelectNone: () => void;
  };

  type ScopeAction = {
    id: 'all' | 'none';
    label: string;
    disabled: boolean;
    onSelect: () => void;
  };

  let {
    legend,
    options,
    selection,
    emptyLabel,
    description,
    onToggle,
    onSelectAll,
    onSelectNone,
  }: Props = $props();

  const scopeActions: ScopeAction[] = $derived([
    {
      id: 'all',
      label: 'Select all',
      disabled: facetSelectsAll(
        selection,
        options.map((option) => option.id),
      ),
      onSelect: onSelectAll,
    },
    {
      id: 'none',
      label: 'Select none',
      disabled: facetSelectsNone(selection),
      onSelect: onSelectNone,
    },
  ]);
</script>

{#snippet scopeButton(action: ScopeAction)}
  <button
    type="button"
    onclick={action.onSelect}
    disabled={action.disabled}
    class="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40 dark:hover:text-slate-100"
  >
    {action.label}
  </button>
{/snippet}

<fieldset>
  <!--
    The legend stays the fieldset's first child, which is what makes it the
    group's accessible name; the scope buttons therefore sit on their own row
    beneath it rather than sharing one.
  -->
  <legend class={FIELD_LABEL_CLASS.rail}>{legend}</legend>
  <div class="mt-1 flex justify-end gap-3">
    {#each scopeActions as action (action.id)}
      {@render scopeButton(action)}
    {/each}
  </div>

  {#if options.length === 0}
    <p class="mt-1.5 text-xs text-slate-500">{emptyLabel}</p>
  {:else}
    <FieldGroup class="inner-scroll-region mt-1.5 max-h-44 overflow-y-auto">
      <!--
        Not a CheckboxField: each row carries its option's value and wraps a long
        facet name across lines beside a muted count hint, so its layout differs
        from the plain setting checkboxes elsewhere.
      -->
      {#each options as option (option.id)}
        <label class="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            value={option.id}
            checked={facetIncludes(selection, option.id)}
            onchange={() => onToggle(option.id)}
            class="mt-0.5"
          />
          <span class="min-w-0 flex-1 wrap-break-word">{option.label}</span>
          <span class="shrink-0 text-slate-500 dark:text-slate-400">
            {option.detail}
          </span>
        </label>
      {/each}
    </FieldGroup>
  {/if}

  {#if description}
    <p class="mt-1.5 text-xs text-slate-500">{description}</p>
  {/if}
</fieldset>
