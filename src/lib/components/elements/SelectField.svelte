<!--
@component
Provides a labeled select with a bindable value; the sibling of TextField for choosing from a fixed set.
-->
<script lang="ts" generics="TValue extends string">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import {
    FIELD_CONTROL_CLASS,
    FIELD_CONTROL_PADDING,
    FIELD_GAP_CLASS,
    FIELD_LABEL_CLASS,
    type FieldDensity,
  } from '#lib/components/elements/field.js';

  /**
   * One choice offered by the select. Callers that need to name this type
   * declare it structurally; the component is generic over the value union so
   * a caller binding a string-literal union keeps that type end to end.
   */
  type SelectOption = {
    /** Value bound when this choice is selected. */
    value: TValue;
    /** Text shown for this choice. */
    label: string;
  };

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<
    HTMLSelectAttributes,
    'class' | 'id' | 'value' | 'multiple'
  >;

  /** Public inputs and callbacks for this component. */
  type Props = SharedAttributes & {
    /** Visible label associated with the select. */
    label: string;
    /** Choices offered, in the order they are shown. */
    options: ReadonlyArray<SelectOption>;
    /** Selected value, shared with the owner through bind:value. */
    value: TValue;
    /** Identifier for the select; defaults to a generated one. */
    id?: string;
    /** Presentation density; defaults to form. */
    density?: FieldDensity;
    /** Whether the select fills the available width; defaults to true. */
    fullWidth?: boolean;
    /** Additional classes applied to the select. Defaults to an empty string. */
    selectClass?: string;
    /** Additional classes applied to the outer wrapper, such as its layout. Defaults to an empty string. */
    class?: string;
  };

  let {
    label,
    options,
    value = $bindable(),
    id,
    density = 'form',
    fullWidth = true,
    selectClass = '',
    class: className = '',
    ...attributes
  }: Props = $props();

  const uid = $props.id();
  const selectId = $derived(id ?? `select-${uid}`);
</script>

<div class={className}>
  <label class={FIELD_LABEL_CLASS[density]} for={selectId}>{label}</label>
  <select
    id={selectId}
    bind:value
    class={[
      FIELD_GAP_CLASS[density],
      FIELD_CONTROL_CLASS,
      FIELD_CONTROL_PADDING,
      fullWidth ? 'w-full' : 'w-auto',
      selectClass,
    ]}
    {...attributes}
  >
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
