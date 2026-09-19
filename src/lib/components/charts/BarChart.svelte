<!--
@component
Renders caller-owned values as grouped SVG bars, with configurable axes, legend, and empty state.
-->
<script lang="ts">
  import { scaleBand, scaleLinear } from 'd3-scale';
  import {
    DEFAULT_MARGIN,
    paletteColor,
    type BarSeries,
    type ChartMargin,
  } from '#lib/components/charts/types.js';

  /** Public data, presentation options, and callbacks for this component. */
  type Props = {
    /** Required ordered group keys; values and stacks align with these indices. */
    groupLabels: string[];
    /** Caller-owned data with stable unique series IDs; required and never mutated. */
    series: BarSeries[];
    /** Optional y-axis extent; defaults to a padded extent including zero. */
    yDomain?: [number, number];
    /** Optional text describing the horizontal axis. */
    xLabel?: string;
    /** Optional vertical-axis description, also used in the accessible chart label. */
    yLabel?: string;
    /** Approximate number of y ticks; defaults to 5. */
    yTickCount?: number;
    /** Formats y-axis ticks; defaults to String(value). */
    formatY?: (v: number) => string;
    /** Total chart height in pixels; defaults to 320. */
    height?: number;
    /** Optional per-edge pixel overrides merged with DEFAULT_MARGIN. */
    margin?: Partial<ChartMargin>;
    /** Whether to display the series legend; defaults to true. */
    showLegend?: boolean;
    /** Whether to draw the zero baseline when in range; defaults to true. */
    showZeroLine?: boolean;
    /** Inner spacing fraction between groups; defaults to 0.15. */
    groupPadding?: number;
    /** Spacing fraction between series bars in a group; defaults to 0.1. */
    barPadding?: number;
    /** Empty-state text; defaults to No data to display. */
    emptyMessage?: string;
  };

  let {
    groupLabels,
    series,
    yDomain,
    xLabel,
    yLabel,
    yTickCount = 5,
    formatY = (v) => String(v),
    height = 320,
    margin: marginOverride,
    showLegend = true,
    showZeroLine = true,
    groupPadding = 0.15,
    barPadding = 0.1,
    emptyMessage = 'No data to display.',
  }: Props = $props();

  const margin = $derived<ChartMargin>({
    ...DEFAULT_MARGIN,
    ...(marginOverride ?? {}),
  });

  let containerWidth = $state(640);

  const innerWidth = $derived(
    Math.max(40, containerWidth - margin.left - margin.right),
  );
  const innerHeight = $derived(
    Math.max(40, height - margin.top - margin.bottom),
  );

  const hasData = $derived(groupLabels.length > 0 && series.length > 0);

  const allValues = $derived(series.flatMap((s) => s.values));

  const computedYDomain = $derived.by((): [number, number] => {
    if (yDomain) return yDomain;
    if (allValues.length === 0) return [0, 1];
    const lo = Math.min(...allValues, 0);
    const hi = Math.max(...allValues, 0);
    if (lo === hi) return [lo - 1, hi + 1];
    const pad = (hi - lo) * 0.05;
    return [lo - pad, hi + pad];
  });

  const groupScale = $derived(
    scaleBand<string>()
      .domain(groupLabels)
      .range([0, innerWidth])
      .paddingInner(groupPadding),
  );

  const seriesIds = $derived(series.map((s) => s.id));

  const subScale = $derived(
    scaleBand<string>()
      .domain(seriesIds)
      .range([0, groupScale.bandwidth()])
      .padding(barPadding),
  );

  const yScale = $derived(
    scaleLinear()
      .domain(computedYDomain)
      .range([innerHeight, 0])
      .nice(yTickCount),
  );

  const yTicks = $derived(yScale.ticks(yTickCount));

  const zeroY = $derived(yScale(0));
  const zeroLineVisible = $derived(
    showZeroLine && zeroY >= 0 && zeroY <= innerHeight,
  );

  type ResolvedBar = {
    groupLabel: string;
    seriesId: string;
    seriesLabel: string;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
  };

  const bars = $derived.by((): ResolvedBar[] => {
    const out: ResolvedBar[] = [];
    const bw = subScale.bandwidth();
    series.forEach((s, sIdx) => {
      const color = s.color ?? paletteColor(sIdx);
      groupLabels.forEach((g, gIdx) => {
        const v = s.values[gIdx] ?? 0;
        const groupX = groupScale(g) ?? 0;
        const subX = subScale(s.id) ?? 0;
        const top = v >= 0 ? yScale(v) : yScale(0);
        const bot = v >= 0 ? yScale(0) : yScale(v);
        out.push({
          groupLabel: g,
          seriesId: s.id,
          seriesLabel: s.label,
          color,
          x: groupX + subX,
          y: top,
          width: bw,
          height: Math.max(0, bot - top),
          value: v,
        });
      });
    });
    return out;
  });
</script>

<div
  class="w-full text-slate-600 dark:text-slate-400"
  bind:clientWidth={containerWidth}
>
  {#if !hasData}
    <div
      class="flex items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500"
      style="height: {height}px;"
    >
      {emptyMessage}
    </div>
  {:else}
    <svg
      role="img"
      aria-label={yLabel ? `Bar chart of ${yLabel}` : 'Bar chart'}
      viewBox="0 0 {containerWidth} {height}"
      width={containerWidth}
      {height}
      class="block overflow-visible"
    >
      <g transform="translate({margin.left},{margin.top})">
        {#each yTicks as t (t)}
          <line
            x1="0"
            x2={innerWidth}
            y1={yScale(t)}
            y2={yScale(t)}
            class="stroke-slate-200 dark:stroke-slate-800"
            stroke-width="1"
          />
        {/each}

        {#if zeroLineVisible}
          <line
            x1="0"
            x2={innerWidth}
            y1={zeroY}
            y2={zeroY}
            class="stroke-slate-400 dark:stroke-slate-600"
            stroke-width="1"
          />
        {/if}

        {#each yTicks as t (t)}
          <text
            x="-8"
            y={yScale(t)}
            dy="0.32em"
            text-anchor="end"
            fill="currentColor"
            class="text-[10px]"
          >
            {formatY(t)}
          </text>
        {/each}

        <line
          x1="0"
          x2={innerWidth}
          y1={innerHeight}
          y2={innerHeight}
          class="stroke-slate-300 dark:stroke-slate-700"
          stroke-width="1"
        />

        {#each groupLabels as g (g)}
          {@const cx = (groupScale(g) ?? 0) + groupScale.bandwidth() / 2}
          <text
            x={cx}
            y={innerHeight + 16}
            text-anchor="middle"
            fill="currentColor"
            class="text-[10px]"
          >
            {g}
          </text>
        {/each}

        {#each bars as b (b.seriesId + '::' + b.groupLabel)}
          <rect
            class="hover:cursor-pointer"
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill={b.color}
            rx="1.5"
          >
            <title>{b.seriesLabel} — {b.groupLabel}: {formatY(b.value)}</title>
          </rect>
        {/each}

        {#if xLabel}
          <text
            x={innerWidth / 2}
            y={innerHeight + 32}
            text-anchor="middle"
            fill="currentColor"
            class="text-[11px]"
          >
            {xLabel}
          </text>
        {/if}
        {#if yLabel}
          <text
            transform="translate({-margin.left + 14},{innerHeight /
              2}) rotate(-90)"
            text-anchor="middle"
            fill="currentColor"
            class="text-[11px]"
          >
            {yLabel}
          </text>
        {/if}
      </g>
    </svg>

    {#if showLegend}
      <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {#each series as s, i (s.id)}
          <li class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 rounded-sm"
              style="background-color: {s.color ?? paletteColor(i)};"
            ></span>
            <span class="text-slate-600 dark:text-slate-300">{s.label}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>
