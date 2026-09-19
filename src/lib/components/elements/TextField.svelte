<!--
@component
Provides a labeled single-line text input with a bindable value.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import {
    FIELD_CONTROL_CLASS,
    FIELD_CONTROL_PADDING,
    FIELD_GAP_CLASS,
    FIELD_LABEL_CLASS,
    type FieldDensity,
  } from '#lib/components/elements/field.js';

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<
    HTMLInputAttributes,
    'class' | 'id' | 'value' | 'type'
  >;

  /** Public inputs and callbacks for this component. */
  type Props = SharedAttributes & {
    /** Visible label associated with the input. */
    label: string;
    /** Text shared with the owner through bind:value. */
    value: string;
    /** Identifier for the input; defaults to a generated one. */
    id?: string;
    /** Input type; defaults to text. */
    type?: 'text' | 'search';
    /** Presentation density; defaults to form. */
    density?: FieldDensity;
    /** Additional classes applied to the input. Defaults to an empty string. */
    inputClass?: string;
    /** Additional classes applied to the outer wrapper. Defaults to an empty string. */
    class?: string;
  };

  let {
    label,
    value = $bindable(),
    id,
    type = 'text',
    density = 'form',
    inputClass = '',
    class: className = '',
    ...attributes
  }: Props = $props();

  const uid = $props.id();
  const inputId = $derived(id ?? `text-${uid}`);
</script>

<div class={className}>
  <label class={FIELD_LABEL_CLASS[density]} for={inputId}>{label}</label>
  <input
    id={inputId}
    {type}
    bind:value
    class={[
      FIELD_GAP_CLASS[density],
      FIELD_CONTROL_CLASS,
      FIELD_CONTROL_PADDING,
      'w-full',
      inputClass,
    ]}
    {...attributes}
  />
</div>
