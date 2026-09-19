<!--
@component
Frames a set of related choices in the bordered box the rail's grouped controls share.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { FIELD_BOX_CLASS } from '#lib/components/elements/field.js';

  /** Native attributes forwarded to the component root, excluding properties it owns. */
  type SharedAttributes = Omit<HTMLAttributes<HTMLDivElement>, 'class'>;

  /** Public inputs and content for this component. */
  type Props = SharedAttributes & {
    /**
     * Optional attachment applied to the box, for local scroll persistence and
     * similar behavior.
     */
    attach?: Attachment<HTMLElement> | undefined;
    /** Spacing, height, and scrolling supplied by the containing panel. Defaults to an empty string. */
    class?: string;
    /** The choices this box groups. */
    children: Snippet;
  };

  let {
    attach,
    class: className = '',
    children,
    ...attributes
  }: Props = $props();
</script>

<div
  class={[FIELD_BOX_CLASS, 'space-y-1 p-2', className]}
  {...attributes}
  {@attach attach}
>
  {@render children()}
</div>
