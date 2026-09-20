<!--
@component
Renders caller-owned magnitudes as SVG pie wedges, sized and labeled by each slice's share of their total, and reports optional slice hover to the owner.
-->
<script lang="ts">
  import { arc as d3Arc, pie as d3Pie, type PieArcDatum } from 'd3-shape';
  import {
    DIMMED_MARK_OPACITY,
    paletteColor,
    type PieSlice,
    type PieSliceHoverInfo,
  } from '#lib/components/charts/types.js';

  /** Public data, presentation options, and callbacks for this component. */
  type Props = {
    /** Caller-owned slices with stable unique IDs; required and never mutated. */
    slices: PieSlice[];
    /** Optional description of what the values measure, used in the accessible chart label. */
    valueLabel?: string;
    /** Formats a slice value for hover text; defaults to String(value). */
    formatValue?: (v: number) => string;
    /** Formats a share from 0 through 1; defaults to a percentage with one decimal. */
    formatShare?: (share: number) => string;
    /** Total chart height in pixels; defaults to 320. */
    height?: number;
    /** Pixels reserved around the pie so its stroke is not clipped; defaults to 8. */
    padding?: number;
    /** Whether to display the slice legend; defaults to true. */
    showLegend?: boolean;
    /** Horizontal alignment of legend items below the chart; defaults to start. */
    legendAlign?: 'start' | 'center';
    /** Optional zero-based slice indexes after which to divide the legend into groups; none by default. */
    legendDividerAfterIndexes?: readonly number[];
    /** Empty-state text; defaults to No data to display. */
    emptyMessage?: string;
    /** Optional owner callback on wedge entry and pointer movement; receives null on pointer leave. */
    onSliceHover?: (info: PieSliceHoverInfo | null) => void;
  };

  const sharePercent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  });

  let {
    slices,
    valueLabel,
    formatValue = (v) => String(v),
    formatShare = (share) => sharePercent.format(share),
    height = 320,
    padding = 8,
    showLegend = true,
    legendAlign = 'start',
    legendDividerAfterIndexes,
    emptyMessage = 'No data to display.',
    onSliceHover,
  }: Props = $props();

  let containerWidth = $state(640);

  // A pie cannot draw a negative or nonfinite magnitude, and treating one as a
  // wedge would silently change every other slice's share. Such values weigh
  // nothing here; deciding whether they mean zero or a missing observation is
  // the caller's policy, as it is for the other charts in this module.
  const weights = $derived(
    slices.map((slice) =>
      Number.isFinite(slice.value) && slice.value > 0 ? slice.value : 0,
    ),
  );
  const total = $derived(weights.reduce((sum, weight) => sum + weight, 0));
  const hasData = $derived(total > 0);

  const radius = $derived(
    Math.max(20, Math.min(containerWidth, height) / 2 - padding),
  );

  const layout = $derived(
    d3Pie<number>()
      // Both comparators must be cleared to keep the caller's slice order:
      // d3 still sorts by descending value when only the data comparator is null.
      .sort(null)
      .sortValues(null)
      .value((weight) => weight)(weights),
  );

  const arcPath = $derived(
    d3Arc<PieArcDatum<number>>().innerRadius(0).outerRadius(radius),
  );

  /** One drawn wedge, resolved against the measured radius. */
  type ResolvedWedge = {
    /** Stable slice key used as the keyed-each identity. */
    id: string;
    /** Legend and hover label. */
    label: string;
    /** Resolved CSS color. */
    color: string;
    /** Weight this wedge was drawn from. */
    value: number;
    /** Share of the total, from 0 through 1. */
    share: number;
    /** SVG path data for the wedge. */
    path: string;
  };

  const wedges = $derived.by((): ResolvedWedge[] => {
    if (!hasData) return [];
    const out: ResolvedWedge[] = [];
    slices.forEach((slice, index) => {
      const weight = weights[index];
      if (weight <= 0) return;
      const path = arcPath(layout[index]);
      if (path === null) return;
      out.push({
        id: slice.id,
        label: slice.label,
        color: slice.color ?? paletteColor(index),
        value: weight,
        share: weight / total,
        path,
      });
    });
    return out;
  });

  // Every slice keeps a legend entry, including one weighing nothing, so a
  // caller's category does not disappear from the key on the day it reads zero.
  const legendEntries = $derived(
    slices.map((slice, index) => ({
      id: slice.id,
      label: slice.label,
      color: slice.color ?? paletteColor(index),
      share: hasData ? weights[index] / total : 0,
    })),
  );

  // Which wedge reads as accented is a drawing decision, so it stays here even
  // when an owner also tracks the hover for a tooltip. It is presentation only:
  // a stale ID simply matches nothing once the slices are replaced.
  let hoveredId = $state.raw<string | null>(null);

  /** Opacity that recedes every wedge except the hovered one. */
  function wedgeOpacity(id: string): number {
    return hoveredId === null || hoveredId === id ? 1 : DIMMED_MARK_OPACITY;
  }

  function reportHover(wedge: ResolvedWedge, event: PointerEvent): void {
    hoveredId = wedge.id;
    onSliceHover?.({
      sliceId: wedge.id,
      label: wedge.label,
      value: wedge.value,
      share: wedge.share,
      color: wedge.color,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function endHover(): void {
    hoveredId = null;
    onSliceHover?.(null);
  }
</script>

<div
  class="w-full min-w-0 text-slate-600 dark:text-slate-400"
  bind:clientWidth={containerWidth}
>
  {#if !hasData}
    <div
      class="flex items-center justify-center rounded-md border border-dashed border-slate-200 px-4 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500"
      style="height: {height}px;"
    >
      {emptyMessage}
    </div>
  {:else}
    <svg
      role="img"
      aria-label={valueLabel ? `Pie chart of ${valueLabel}` : 'Pie chart'}
      viewBox="0 0 {containerWidth} {height}"
      width={containerWidth}
      {height}
      class="block"
    >
      <g transform="translate({containerWidth / 2},{height / 2})">
        {#each wedges as wedge (wedge.id)}
          <path
            d={wedge.path}
            fill={wedge.color}
            opacity={wedgeOpacity(wedge.id)}
            class="stroke-2 stroke-white transition-opacity duration-150 hover:cursor-pointer dark:stroke-slate-900"
            role="img"
            aria-label={`${wedge.label}, ${formatValue(wedge.value)}, ${formatShare(wedge.share)}`}
            onpointerenter={(event: PointerEvent) => reportHover(wedge, event)}
            onpointermove={(event: PointerEvent) => reportHover(wedge, event)}
            onpointerleave={endHover}
          >
            {#if !onSliceHover}
              <title>
                {wedge.label}: {formatValue(wedge.value)} ({formatShare(
                  wedge.share,
                )})
              </title>
            {/if}
          </path>
        {/each}
      </g>
    </svg>

    {#if showLegend}
      <ul
        class={[
          'mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs',
          legendAlign === 'center' && 'justify-center',
        ]}
      >
        {#each legendEntries as entry, index (entry.id)}
          <li class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm transition-opacity duration-150"
              style="background-color: {entry.color}; opacity: {wedgeOpacity(
                entry.id,
              )};"
            ></span>
            <span
              class={hoveredId === entry.id
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-300'}>{entry.label}</span
            >
            <span class="tabular-nums text-slate-500 dark:text-slate-400">
              {formatShare(entry.share)}
            </span>
          </li>
          <!-- Decorative: the entries it separates carry their own labels. -->
          {#if legendDividerAfterIndexes?.includes(index) && index < legendEntries.length - 1}
            <li
              aria-hidden="true"
              class="text-slate-300 select-none dark:text-slate-600"
            >
              |
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  {/if}
</div>
