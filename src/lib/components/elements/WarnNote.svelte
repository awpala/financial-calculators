<!--
@component
Pairs a warning about the owner's current input with a decorative WarnIcon. It announces politely as a status; the owner decides when it renders and owns the condition it describes.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import WarnIcon from '#lib/icons/status/WarnIcon.svelte';

  /** Warning copy and its wrapper hooks. */
  type Props = {
    /** Warning text or inline markup rendered as a paragraph. */
    children: Snippet;
    /** Optional ID so fields can reference the warning with aria-describedby; defaults to none. */
    id?: string;
    /** Optional wrapper layout classes; defaults to empty. */
    class?: string;
  };
  let { children, id, class: className = '' }: Props = $props();
</script>

<div
  {id}
  role="status"
  class={[
    'flex items-start gap-3 text-left text-xs leading-relaxed text-red-700 dark:text-red-400',
    className,
  ]}
>
  <WarnIcon class="mt-0.5 size-4 shrink-0" />
  <p class="min-w-0">{@render children()}</p>
</div>
