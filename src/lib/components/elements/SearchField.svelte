<!--
@component
Edits one search or filter query through an owner callback, with an inline Clear control while the query is non-empty.
-->
<script lang="ts">
  import { valueFrom } from '#lib/dom/events.js';
  import { FIELD_CONTROL_CLASS } from '#lib/components/elements/field.js';

  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Identifier for the input, used to associate its visually hidden label. */
    id: string;
    /** Visually hidden label describing what this field searches. */
    label: string;
    /** Current query text supplied by the owner. */
    value: string;
    /** Placeholder shown while the query is empty. */
    placeholder: string;
    /** Requests replacement of the query; called with the empty string by Clear. */
    onChange: (value: string) => void;
    /** Additional spacing supplied by the containing panel. */
    class?: string;
  };

  let {
    id,
    label,
    value,
    placeholder,
    onChange,
    class: className,
  }: Props = $props();
</script>

<div class={['relative', className]}>
  <label class="sr-only" for={id}>{label}</label>
  <input
    {id}
    type="search"
    {value}
    oninput={(event) => onChange(valueFrom(event))}
    {placeholder}
    maxlength="128"
    class={[
      FIELD_CONTROL_CLASS,
      'w-full py-2 pl-3 dark:bg-slate-950',
      // Only reserve room for Clear while it is actually rendered, or the
      // placeholder is truncated in the rail's width for no reason. This is
      // why the shared control class carries no padding of its own.
      value ? 'pr-16' : 'pr-3',
    ]}
  />
  {#if value}
    <button
      type="button"
      onclick={() => onChange('')}
      class="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
    >
      Clear
    </button>
  {/if}
</div>
