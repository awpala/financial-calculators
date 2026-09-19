<!--
@component
Renders caller-owned numeric series as responsive SVG lines and reports optional point hover to the owner.
-->
<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { line as d3Line, curveMonotoneX, type CurveFactory } from 'd3-shape';
  import { extent } from 'd3-array';
  import ChartHeading from '#lib/components/charts/ChartHeading.svelte';
  import {
    DEFAULT_MARGIN,
    paletteColor,
    type ChartMargin,
    type LineSeries,
    type PointHoverInfo,
  } from '#lib/components/charts/types.js';

  /** Public data, presentation options, and callbacks for this component. */
  type Props = {
    /** Optional heading above the chart; omitted when absent. */
    title?: string;
    /** Optional supporting text displayed with the title. */
    subtitle?: string;
    /** Caller-owned data with stable unique series IDs; required and never mutated. */
    series: LineSeries[];
    /** Optional x-axis extent; defaults to the extent of all points. */
    xDomain?: [number, number];
    /** Optional y-axis extent; defaults to a padded extent including zero. */
    yDomain?: [number, number];
    /** Optional lower y bound overriding the computed or supplied extent. */
    yMin?: number;
    /** Optional upper y bound overriding the computed or supplied extent. */
    yMax?: number;
    /** Optional text describing the horizontal axis. */
    xLabel?: string;
    /** Optional vertical-axis description, also used in the accessible chart label. */
    yLabel?: string;
    /** Optional explicit x ticks; defaults to scale-generated ticks. */
    xTickValues?: number[];
    /** Approximate number of y ticks; defaults to 5. */
    yTickCount?: number;
    /** Formats x-axis ticks; defaults to String(value). */
    formatX?: (v: number) => string;
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
    /** Whether to draw point markers; defaults to false. */
    showPoints?: boolean;
    /** Default point-marker radius in pixels; defaults to 2.5. */
    pointRadius?: number;
    /** D3 line interpolation factory; defaults to curveMonotoneX. */
    curve?: CurveFactory;
    /** Empty-state text; defaults to No data to display. */
    emptyMessage?: string;
    /** Optional owner callback for point hover; receives null on pointer leave. */
    onPointHover?: (info: PointHoverInfo | null) => void;
  };

  let {
    title,
    subtitle,
    series,
    xDomain,
    yDomain,
    yMin,
    yMax,
    xLabel,
    yLabel,
    xTickValues,
    yTickCount = 5,
    formatX = (v) => String(v),
    formatY = (v) => String(v),
    height = 320,
    margin: marginOverride,
    showLegend = true,
    showZeroLine = true,
    showPoints = false,
    pointRadius = 2.5,
    curve = curveMonotoneX,
    emptyMessage = 'No data to display.',
    onPointHover,
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

  const allPoints = $derived(series.flatMap((s) => s.points));
  const hasPoints = $derived(allPoints.length > 0);

  const computedXDomain = $derived.by((): [number, number] => {
    if (xDomain) return xDomain;
    const [lo, hi] = extent(allPoints, (p) => p.x);
    return [lo ?? 0, hi ?? 1];
  });

  const computedYDomain = $derived.by((): [number, number] => {
    const [base0, base1] =
      yDomain ??
      (() => {
        const [lo, hi] = extent(allPoints, (p) => p.y);
        const mn = Math.min(lo ?? 0, 0);
        const mx = Math.max(hi ?? 1, 0);
        if (mn === mx) return [mn - 1, mx + 1] as const;
        const pad = (mx - mn) * 0.05;
        return [mn - pad, mx + pad] as const;
      })();
    return [yMin ?? base0, yMax ?? base1];
  });

  const xScale = $derived(
    scaleLinear().domain(computedXDomain).range([0, innerWidth]),
  );
  const yScale = $derived(
    scaleLinear()
      .domain(computedYDomain)
      .range([innerHeight, 0])
      .nice(yTickCount),
  );

  const yTicks = $derived(yScale.ticks(yTickCount));
  const xTicks = $derived<number[]>(xTickValues ?? xScale.ticks(8));

  const lineGen = $derived(
    d3Line<{ x: number; y: number }>()
      .x((p) => xScale(p.x))
      .y((p) => yScale(p.y))
      .defined((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .curve(curve),
  );

  const seriesWithColor = $derived(
    series.map((s, i) => ({
      ...s,
      resolvedColor: s.color ?? paletteColor(i),
      path: lineGen(s.points) ?? '',
    })),
  );

  const zeroY = $derived(yScale(0));
  const zeroLineVisible = $derived(
    showZeroLine && zeroY >= 0 && zeroY <= innerHeight,
  );

  const uid = $props.id();
  const clipId = `linechart-clip-${uid}`;
</script>

{#if title}
  <ChartHeading {title} {subtitle} />
{/if}

<div
  class="w-full text-slate-600 dark:text-slate-400"
  bind:clientWidth={containerWidth}
>
  {#if !hasPoints}
    <div
      class="flex items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500"
      style="height: {height}px;"
    >
      {emptyMessage}
    </div>
  {:else}
    <svg
      role="img"
      aria-label={yLabel ? `Line chart of ${yLabel}` : 'Line chart'}
      viewBox="0 0 {containerWidth} {height}"
      width={containerWidth}
      {height}
      class="block overflow-visible"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={innerWidth} height={innerHeight} />
        </clipPath>
      </defs>
      <g transform="translate({margin.left},{margin.top})">
        <!-- Horizontal gridlines -->
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

        <!-- Zero baseline -->
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

        <!-- Y axis ticks/labels -->
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

        <!-- X axis baseline -->
        <line
          x1="0"
          x2={innerWidth}
          y1={innerHeight}
          y2={innerHeight}
          class="stroke-slate-300 dark:stroke-slate-700"
          stroke-width="1"
        />

        <!-- X axis ticks/labels -->
        {#each xTicks as t (t)}
          <g transform="translate({xScale(t)},{innerHeight})">
            <line
              y1="0"
              y2="4"
              class="stroke-slate-400 dark:stroke-slate-600"
              stroke-width="1"
            />
            <text
              y="16"
              text-anchor="middle"
              fill="currentColor"
              class="text-[10px]"
            >
              {formatX(t)}
            </text>
          </g>
        {/each}

        <!-- Series paths & points, clipped to the plot area -->
        <g clip-path="url(#{clipId})">
          {#each seriesWithColor as s (s.id)}
            <path
              d={s.path}
              fill="none"
              stroke={s.resolvedColor}
              stroke-width={s.strokeWidth ?? 1.75}
              stroke-dasharray={s.dashArray ?? (s.dashed ? '4 3' : undefined)}
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/each}

          {#if showPoints}
            {#each seriesWithColor as s (s.id + '-pts')}
              {#each s.points as p (p.x)}
                {@const resolvedPointRadius = s.pointRadius ?? pointRadius}
                <g class={onPointHover ? 'cursor-pointer' : undefined}>
                  <circle
                    cx={xScale(p.x)}
                    cy={yScale(p.y)}
                    r={resolvedPointRadius}
                    fill={s.resolvedColor}
                    stroke="none"
                    pointer-events="none"
                  />
                  {#if onPointHover}
                    <circle
                      cx={xScale(p.x)}
                      cy={yScale(p.y)}
                      r={Math.max(resolvedPointRadius * 3, 8)}
                      fill="transparent"
                      role="img"
                      aria-label="{s.label}, x {p.x}"
                      onpointerenter={(e) =>
                        onPointHover({
                          seriesId: s.id,
                          seriesLabel: s.label,
                          color: s.resolvedColor,
                          point: { x: p.x, y: p.y },
                          clientX: e.clientX,
                          clientY: e.clientY,
                        })}
                      onpointerleave={() => onPointHover(null)}
                    />
                  {/if}
                </g>
              {/each}
            {/each}
          {/if}
        </g>

        <!-- Axis labels -->
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
        {#each seriesWithColor as s (s.id)}
          <li class="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden="true">
              <line
                x1="0"
                x2="20"
                y1="3"
                y2="3"
                stroke={s.resolvedColor}
                stroke-width="2"
                stroke-dasharray={s.dashArray ?? (s.dashed ? '4 3' : undefined)}
                stroke-linecap="round"
              />
            </svg>
            <span class="text-slate-600 dark:text-slate-300">{s.label}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>
