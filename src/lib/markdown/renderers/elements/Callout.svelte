<!--
@component
Renders a titled callout in one of the supported kinds, with its icon and accent color.
-->
<script lang="ts">
  import type { CalloutKind, CalloutNode } from '../../types.js';

  import CautionIcon from '#lib/icons/status/CautionIcon.svelte';
  import ImportantIcon from '#lib/icons/status/ImportantIcon.svelte';
  import NoteIcon from '#lib/icons/status/NoteIcon.svelte';
  import TipIcon from '#lib/icons/status/TipIcon.svelte';
  import WarningIcon from '#lib/icons/status/WarningIcon.svelte';
  import BlockRenderer from '../BlockRenderer.svelte';

  const calloutToneClass: Record<CalloutKind, string> = {
    note: 'border-sky-300 bg-sky-50/70 text-sky-900 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-100',
    important:
      'border-violet-300 bg-violet-50/70 text-violet-900 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-100',
    warning:
      'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100',
    caution:
      'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-100',
    tip: 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100',
  };

  /** Public inputs for this component. */
  type Props = {
    /** The callout, whose kind selects the icon and color treatment. */
    node: CalloutNode;
    /** Dotted path identifying this node's position in the document, used to key popups. */
    scope: string;
    /** Nesting depth of the surrounding lists, which drives marker and indent classes. */
    depth: number;
  };

  let { node, scope, depth }: Props = $props();
</script>

<section
  class={`my-4 rounded-r-lg border-l-4 px-4 py-3 ${calloutToneClass[node.kind]}`}
>
  <p
    class="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase"
  >
    {#if node.kind === 'note'}
      <NoteIcon />
    {:else if node.kind === 'important'}
      <ImportantIcon />
    {:else if node.kind === 'warning'}
      <WarningIcon />
    {:else if node.kind === 'caution'}
      <CautionIcon />
    {:else}
      <TipIcon />
    {/if}
    <span>{node.kind.toUpperCase()}</span>
  </p>
  <div class="space-y-0 text-slate-700 dark:text-slate-200">
    <BlockRenderer nodes={node.children} {depth} scope={`${scope}.callout`} />
  </div>
</section>
