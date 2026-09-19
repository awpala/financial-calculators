<!--
@component
Announces, in amber, why the calculator has no result to show: a lead such as Invalid input, then the message, with the pieces of input it quotes set as code.
-->
<script lang="ts">
  import { splitQuotedMessage } from '#lib/calculator/presentation/messages.js';
  import InfoIcon from '#lib/icons/status/InfoIcon.svelte';

  /** Public inputs for this component. */
  type Props = {
    /** What kind of problem this is, shown before the message and a colon. */
    lead: string;
    /** The parser's or evaluator's message, quoting pieces of input in single quotes. */
    message: string;
  };

  let { lead, message }: Props = $props();
</script>

<p
  role="status"
  class="-mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
>
  <InfoIcon class="mt-px size-3.5 shrink-0" />
  <span
    >{lead}: {#each splitQuotedMessage(message) as part, index (index)}{#if part.quoted}<code
          class="rounded bg-amber-100 px-1 font-mono dark:bg-amber-950"
          >{part.text}</code
        >{:else}{part.text}{/if}{/each}.</span
  >
</p>
