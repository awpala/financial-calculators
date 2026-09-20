<!--
@component
Presents the contextual-rail section that turns a chart's hover response on or off. The owner holds the preference and persists it; this component only reports the requested change.
-->
<script lang="ts">
  import Switch from '#lib/components/elements/Switch.svelte';

  /** Public inputs and callback for the chart-hover preference. */
  type Props = {
    /** Whether the owner's chart currently responds to hover. */
    enabled: boolean;
    /** Requests the new preference; the owner applies and persists it. */
    onChange: (enabled: boolean) => void;
    /**
     * What this particular chart shows on hover, in one sentence. The section
     * says what turning it off costs; only the chart's own payload varies, so
     * the caller supplies that and nothing else about the control.
     */
    description: string;
  };

  let { enabled, onChange, description }: Props = $props();
</script>

<section class="w-64 max-w-full space-y-3" aria-label="Chart options">
  <h3
    class="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
  >
    Chart options
  </h3>
  <Switch label="Show chart tooltips" checked={enabled} {onChange}>
    {#snippet content()}<span class="text-sm">Show tooltips</span>{/snippet}
  </Switch>
  <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
    {description} With this off, the chart does not respond to hover at all: no tooltip
    and no highlight.
  </p>
</section>
