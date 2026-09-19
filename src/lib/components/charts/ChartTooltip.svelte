<!--
@component
Displays a pointer-anchored chart value using the reference calculator's floating bubble presentation. Svelte owns the size and viewport subscriptions; the caller owns visibility and content.
-->
<script lang="ts">
  import { innerHeight, innerWidth } from 'svelte/reactivity/window';

  /** Public content and viewport anchor for a noninteractive chart tooltip. */
  type Props = {
    /** Plain text describing the hovered chart value. */
    text: string;
    /** Pointer position in viewport pixels on the horizontal axis. */
    clientX: number;
    /** Pointer position in viewport pixels on the vertical axis. */
    clientY: number;
  };

  let { text, clientX, clientY }: Props = $props();
  let width = $state(0);
  let height = $state(0);
  const left = $derived(
    Math.max(
      8,
      Math.min(clientX + 12, (innerWidth.current ?? 1024) - width - 8),
    ),
  );
  const top = $derived(
    clientY + height + 20 > (innerHeight.current ?? 768)
      ? Math.max(8, clientY - height - 12)
      : clientY + 12,
  );
</script>

<div
  role="tooltip"
  bind:offsetWidth={width}
  bind:offsetHeight={height}
  style:left={`${left}px`}
  style:top={`${top}px`}
  class="pointer-events-none fixed z-50 w-max max-w-[min(16rem,calc(100vw-1rem))] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
>
  {text}
</div>
