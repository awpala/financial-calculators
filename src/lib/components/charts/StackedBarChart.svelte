<!--
@component
Renders caller-owned signed stacks as grouped SVG bars, with optional annotations, reference lines, and hover callbacks.
-->
<script lang="ts">
  import { scaleBand, scaleLinear } from 'd3-scale';
  import {
    DEFAULT_MARGIN,
    DIMMED_MARK_OPACITY,
    paletteColor,
    type BarSegmentHoverInfo,
    type BarStackSegment,
    type ChartMargin,
    type StackedBarSeries,
  } from '#lib/components/charts/types.js';

  /** Public data, presentation options, and callbacks for this component. */
  type Props = {
    /** Required ordered group keys; values and stacks align with these indices. */
    groupLabels: readonly string[];
    /** Optional axis text aligned with groupLabels; defaults to the group keys. */
    groupDisplayLabels?: readonly string[];
    /** Caller-owned data with stable unique series IDs; required and never mutated. */
    series: StackedBarSeries[];
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
    /** Approximate number of y ticks; defaults to 5. */
    yTickCount?: number;
    /** Formats y-axis ticks; defaults to String(value). */
    formatY?: (v: number) => string;
    /** Total chart height in pixels; defaults to 320. */
    height?: number;
    /** Whether to angle the primary x labels; defaults to false. */
    slantedXLabels?: boolean;
    /** Optional per-edge pixel overrides merged with DEFAULT_MARGIN. */
    margin?: Partial<ChartMargin>;
    /** Whether to display the series legend; defaults to true. */
    showLegend?: boolean;
    /** Horizontal alignment of legend items below the chart; defaults to start. */
    legendAlign?: 'start' | 'center';
    /** Inner spacing fraction between groups; defaults to 0.15. */
    groupPadding?: number;
    /** Spacing fraction between series bars in a group; defaults to 0.1. */
    barPadding?: number;
    /** Empty-state text; defaults to No data to display. */
    emptyMessage?: string;
    /** Whether pointer hover accents a segment, reports to the owner, and offers a native bubble; defaults to true. */
    hoverEnabled?: boolean;
    /** Optional owner callback on segment entry and pointer movement; receives null on pointer leave. */
    onSegmentHover?: (info: BarSegmentHoverInfo | null) => void;
    /** Optional zero-based group indices after which to draw separators; none by default. */
    separatorAfterGroupIndexes?: readonly number[];
    /** Optional secondary labels centered over inclusive group-index spans; none by default. */
    subAxisLabels?: ReadonlyArray<{
      /** Inclusive zero-based index of the first group covered by this label. */
      fromIndex: number;
      /** Inclusive zero-based index of the last group covered by this label. */
      toIndex: number;
      /** Text displayed for this axis or legend entry. */
      label: string;
    }>;
    /** Optional tertiary labels centered over inclusive group-index spans; none by default. */
    superAxisLabels?: ReadonlyArray<{
      /** Inclusive zero-based index of the first group covered by this label. */
      fromIndex: number;
      /** Inclusive zero-based index of the last group covered by this label. */
      toIndex: number;
      /** Text displayed for this axis or legend entry. */
      label: string;
    }>;
    /** Optional text above selected group bars; none by default. */
    groupAnnotations?: ReadonlyArray<{
      /** Group key identifying the bar to annotate. */
      groupLabel: string;
      /** Annotation text displayed above the selected bar. */
      text: string;
      /** Optional series key; annotations infer the only series, overlays span all when omitted. */
      seriesId?: string;
    }>;
    /** Optional horizontal reference lines over selected groups; none by default. */
    horizontalOverlays?: ReadonlyArray<{
      /** Optional series key; annotations infer the only series, overlays span all when omitted. */
      seriesId?: string;
      /** Numeric y level for the reference line. */
      value: number;
      /** Inclusive first group index; defaults to 0. */
      fromGroupIndex?: number;
      /** Inclusive last group index; defaults to the final group. */
      toGroupIndex?: number;
      /** Optional CSS color; defaults to the applicable series or renderer fallback. */
      color?: string;
      /** Optional SVG dash pattern; omitted for a solid line. */
      dashArray?: string;
      /** Optional line width in pixels; defaults to the renderer width. */
      strokeWidth?: number;
    }>;
    /** Optional reference-line legend entries appended to the main legend. */
    overlayLegendItems?: ReadonlyArray<{
      /** Stable unique key for this legend entry. */
      id: string;
      /** Text displayed for this axis or legend entry. */
      label: string;
      /** Optional CSS color; defaults to the applicable series or renderer fallback. */
      color?: string;
    }>;
    /** Optional main legend entries replacing the series-derived defaults. */
    legendItems?: ReadonlyArray<{
      /** Stable unique key for this legend entry. */
      id: string;
      /** Text displayed for this axis or legend entry. */
      label: string;
      /** Optional CSS color; defaults to the applicable series or renderer fallback. */
      color?: string;
    }>;
  };

  let {
    groupLabels,
    groupDisplayLabels,
    series,
    yDomain,
    yMin,
    yMax,
    xLabel,
    yLabel,
    yTickCount = 5,
    formatY = (v) => String(v),
    height = 320,
    slantedXLabels = false,
    margin: marginOverride,
    showLegend = true,
    legendAlign = 'start',
    groupPadding = 0.15,
    barPadding = 0.1,
    emptyMessage = 'No data to display.',
    hoverEnabled = true,
    onSegmentHover,
    separatorAfterGroupIndexes,
    subAxisLabels,
    superAxisLabels,
    groupAnnotations,
    horizontalOverlays,
    overlayLegendItems,
    legendItems,
  }: Props = $props();

  const hasSubAxis = $derived((subAxisLabels?.length ?? 0) > 0);
  const hasSuperAxis = $derived((superAxisLabels?.length ?? 0) > 0);

  const margin = $derived<ChartMargin>({
    ...DEFAULT_MARGIN,
    // Reserve extra bottom space when a sub-axis row is in use.
    bottom:
      DEFAULT_MARGIN.bottom +
      (slantedXLabels ? 26 : 0) +
      (hasSubAxis ? 16 : 0) +
      (hasSuperAxis ? 16 : 0),
    ...(marginOverride ?? {}),
  });

  let containerWidth = $state(640);

  const innerWidth = $derived(
    Math.max(40, containerWidth - margin.left - margin.right),
  );
  const innerHeight = $derived(
    Math.max(40, height - margin.top - margin.bottom),
  );

  const hasData = $derived(
    groupLabels.length > 0 &&
      series.length > 0 &&
      series.some((s) => s.stacks.some((stack) => stack.length > 0)),
  );

  // Cumulative min/max swept through each stack. This is what actually
  // determines the bar's visible top and bottom, including when a stack
  // mixes positive and negative segments (e.g., a refund alongside debits).
  const stackExtents = $derived(
    series.flatMap((s) =>
      s.stacks.flatMap((stack) => {
        let cum = 0;
        let mn = 0;
        let mx = 0;
        for (const seg of stack) {
          cum += seg.value;
          if (cum < mn) mn = cum;
          if (cum > mx) mx = cum;
        }
        return [mn, mx];
      }),
    ),
  );

  const computedYDomain = $derived.by((): [number, number] => {
    const [base0, base1] =
      yDomain ??
      (() => {
        if (stackExtents.length === 0) return [0, 1] as const;
        const rawLo = Math.min(...stackExtents, 0);
        const rawHi = Math.max(...stackExtents, 0);
        if (rawLo === rawHi) return [rawLo - 1, rawHi + 1] as const;
        const pad = (rawHi - rawLo) * 0.05;
        // Only pad below 0 when data actually reaches below 0 — otherwise
        // clamp the lower bound to exactly zero so all-positive charts
        // don't visually leak into negative space.
        const lo = rawLo < 0 ? rawLo - pad : 0;
        const hi = rawHi + pad;
        return [lo, hi] as const;
      })();
    return [yMin ?? base0, yMax ?? base1];
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

  type ResolvedSegment = {
    key: string;
    seriesId: string;
    seriesLabel: string;
    groupLabel: string;
    segment: BarStackSegment;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const rects = $derived.by((): ResolvedSegment[] => {
    const out: ResolvedSegment[] = [];
    const bw = subScale.bandwidth();
    series.forEach((s, sIdx) => {
      const seriesBase = s.color ?? paletteColor(sIdx);
      groupLabels.forEach((g, gIdx) => {
        const stack = s.stacks[gIdx] ?? [];
        const groupX = groupScale(g) ?? 0;
        const subX = subScale(s.id) ?? 0;
        let cumulative = 0;
        for (const seg of stack) {
          const v = seg.value;
          if (v === 0) continue;
          const y0 = cumulative;
          const y1 = cumulative + v;
          cumulative = y1;
          const top = v >= 0 ? yScale(y1) : yScale(y0);
          const bot = v >= 0 ? yScale(y0) : yScale(y1);
          out.push({
            key: `${s.id}::${g}::${seg.id}`,
            seriesId: s.id,
            seriesLabel: s.label,
            groupLabel: g,
            segment: seg,
            color: seg.color ?? seriesBase,
            x: groupX + subX,
            y: top,
            width: bw,
            height: Math.max(0, bot - top),
          });
        }
      });
    });
    return out;
  });

  // Which segment reads as accented is a drawing decision, so it stays here
  // even when an owner also tracks the hover for a tooltip. It is presentation
  // only: a stale key simply matches nothing once the groups are replaced.
  let hoveredKey = $state.raw<string | null>(null);
  // Reading the accent through hoverEnabled rather than clearing the cell means
  // switching hover off mid-hover cannot strand a segment at full strength.
  const accentedKey = $derived(hoverEnabled ? hoveredKey : null);

  /** Opacity that recedes every segment except the hovered one. */
  function segmentOpacity(key: string): number {
    return accentedKey === null || accentedKey === key
      ? 1
      : DIMMED_MARK_OPACITY;
  }

  function reportHover(segment: ResolvedSegment, event: PointerEvent): void {
    hoveredKey = segment.key;
    onSegmentHover?.({
      seriesId: segment.seriesId,
      seriesLabel: segment.seriesLabel,
      groupLabel: segment.groupLabel,
      segment: segment.segment,
      color: segment.color,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function endHover(): void {
    hoveredKey = null;
    onSegmentHover?.(null);
  }

  const zeroY = $derived(yScale(0));
  const zeroLineVisible = $derived(zeroY >= 0 && zeroY <= innerHeight);

  type ResolvedGroupAnnotation = {
    key: string;
    x: number;
    y: number;
    text: string;
  };

  const resolvedGroupAnnotations = $derived.by(
    (): ResolvedGroupAnnotation[] => {
      if (!groupAnnotations || groupAnnotations.length === 0) return [];

      // This scratch lookup is rebuilt entirely within the derivation.
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const boundsByStack = new Map<string, { minY: number }>();
      for (const r of rects) {
        const key = `${r.seriesId}::${r.groupLabel}`;
        const current = boundsByStack.get(key);
        if (!current) {
          boundsByStack.set(key, { minY: r.y });
        } else if (r.y < current.minY) {
          current.minY = r.y;
        }
      }

      const out: ResolvedGroupAnnotation[] = [];
      for (const a of groupAnnotations) {
        const sid = a.seriesId ?? (series.length === 1 ? series[0].id : null);
        if (!sid) continue;
        if (!groupLabels.includes(a.groupLabel)) continue;
        const gx = groupScale(a.groupLabel);
        if (gx === undefined) continue;
        const sx = subScale(sid);
        if (sx === undefined) continue;
        const stackKey = `${sid}::${a.groupLabel}`;
        const stackBounds = boundsByStack.get(stackKey);
        const topY = stackBounds ? stackBounds.minY : zeroY;
        out.push({
          key: `${sid}::${a.groupLabel}`,
          x: gx + sx + subScale.bandwidth() / 2,
          y: Math.max(10, topY - 4),
          text: a.text,
        });
      }

      return out;
    },
  );

  type ResolvedHorizontalOverlay = {
    key: string;
    x1: number;
    x2: number;
    y: number;
    color: string;
    dashArray?: string;
    strokeWidth?: number;
  };

  const resolvedHorizontalOverlays = $derived.by(
    (): ResolvedHorizontalOverlay[] => {
      if (!horizontalOverlays || horizontalOverlays.length === 0) return [];
      const out: ResolvedHorizontalOverlay[] = [];
      for (const [idx, overlay] of horizontalOverlays.entries()) {
        const subX = overlay.seriesId ? subScale(overlay.seriesId) : undefined;
        if (overlay.seriesId && subX === undefined) continue;
        const startIdx = Math.max(0, overlay.fromGroupIndex ?? 0);
        const endIdx = Math.min(
          groupLabels.length - 1,
          overlay.toGroupIndex ?? groupLabels.length - 1,
        );
        if (endIdx < startIdx) continue;
        const startGroup = groupLabels[startIdx];
        const endGroup = groupLabels[endIdx];
        if (startGroup === undefined || endGroup === undefined) continue;
        const startGroupX = groupScale(startGroup);
        const endGroupX = groupScale(endGroup);
        if (startGroupX === undefined || endGroupX === undefined) continue;
        const y = yScale(overlay.value);
        if (!Number.isFinite(y) || y < 0 || y > innerHeight) continue;
        const resolvedSubX = subX ?? 0;
        const x1 = startGroupX + resolvedSubX;
        const x2 = overlay.seriesId
          ? endGroupX + resolvedSubX + subScale.bandwidth()
          : endGroupX + groupScale.bandwidth();
        out.push({
          key: `${overlay.seriesId ?? 'all'}-${idx}`,
          x1,
          x2,
          y,
          color: overlay.color ?? 'currentColor',
          dashArray: overlay.dashArray,
          strokeWidth: overlay.strokeWidth,
        });
      }
      return out;
    },
  );
</script>

<div
  class="w-full min-w-0 text-slate-600 dark:text-slate-400"
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
      aria-label={yLabel
        ? `Stacked bar chart of ${yLabel}`
        : 'Stacked bar chart'}
      viewBox="0 0 {containerWidth} {height}"
      width="100%"
      {height}
      preserveAspectRatio="none"
      class="block w-full overflow-visible"
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

        {#each groupLabels as g, gIdx (g)}
          {@const cx = (groupScale(g) ?? 0) + groupScale.bandwidth() / 2}
          <text
            x={cx}
            y={innerHeight + (slantedXLabels ? 18 : 16)}
            text-anchor={slantedXLabels ? 'end' : 'middle'}
            transform={slantedXLabels
              ? `rotate(-35 ${cx} ${innerHeight + 18})`
              : undefined}
            fill="currentColor"
            class="text-[10px]"
          >
            {groupDisplayLabels?.[gIdx] ?? g}
          </text>
        {/each}

        {#if separatorAfterGroupIndexes && separatorAfterGroupIndexes.length > 0}
          {#each separatorAfterGroupIndexes as sepIdx (sepIdx)}
            {@const g = groupLabels[sepIdx]}
            {@const nextG = groupLabels[sepIdx + 1]}
            {#if g !== undefined && nextG !== undefined}
              {@const gx = (groupScale(g) ?? 0) + groupScale.bandwidth()}
              {@const nx = groupScale(nextG) ?? gx}
              {@const sx = (gx + nx) / 2}
              <line
                x1={sx}
                x2={sx}
                y1={0}
                y2={innerHeight + (hasSuperAxis ? 44 : hasSubAxis ? 28 : 4)}
                class="stroke-slate-300 dark:stroke-slate-700"
                stroke-width="1"
              />
            {/if}
          {/each}
        {/if}

        {#if subAxisLabels}
          {#each subAxisLabels as sa (sa.label + '-' + sa.fromIndex)}
            {@const startG = groupLabels[sa.fromIndex]}
            {@const endG = groupLabels[sa.toIndex]}
            {#if startG !== undefined && endG !== undefined}
              {@const startX = groupScale(startG) ?? 0}
              {@const endX = (groupScale(endG) ?? 0) + groupScale.bandwidth()}
              {@const cx = (startX + endX) / 2}
              <text
                x={cx}
                y={innerHeight + 32}
                text-anchor="middle"
                fill="currentColor"
                class="text-[11px] font-medium"
              >
                {sa.label}
              </text>
            {/if}
          {/each}
        {/if}

        {#if superAxisLabels}
          {#each superAxisLabels as sa (sa.label + '-' + sa.fromIndex)}
            {@const startG = groupLabels[sa.fromIndex]}
            {@const endG = groupLabels[sa.toIndex]}
            {#if startG !== undefined && endG !== undefined}
              {@const startX = groupScale(startG) ?? 0}
              {@const endX = (groupScale(endG) ?? 0) + groupScale.bandwidth()}
              {@const cx = (startX + endX) / 2}
              <text
                x={cx}
                y={innerHeight + 48}
                text-anchor="middle"
                fill="currentColor"
                class="text-[11px] font-medium"
              >
                {sa.label}
              </text>
            {/if}
          {/each}
        {/if}

        {#each rects as r (r.key)}
          <rect
            class={[
              'transition-opacity duration-150',
              hoverEnabled && 'hover:cursor-pointer',
            ]}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            fill={r.color}
            opacity={segmentOpacity(r.key)}
            rx="1.5"
            role="img"
            aria-label={`${r.seriesLabel}, ${r.groupLabel}, ${r.segment.label}, ${formatY(r.segment.value)}`}
            onpointerenter={hoverEnabled
              ? (event: PointerEvent) => reportHover(r, event)
              : undefined}
            onpointermove={hoverEnabled
              ? (event: PointerEvent) => reportHover(r, event)
              : undefined}
            onpointerleave={hoverEnabled ? endHover : undefined}
          >
            {#if hoverEnabled && !onSegmentHover}
              <title>
                {r.seriesLabel} — {r.groupLabel} — {r.segment.label}: {formatY(
                  r.segment.value,
                )}
              </title>
            {/if}
          </rect>
        {/each}

        {#if resolvedGroupAnnotations.length > 0}
          {#each resolvedGroupAnnotations as a (a.key)}
            <text
              x={a.x}
              y={a.y}
              text-anchor="middle"
              class="pointer-events-none fill-slate-700 font-mono text-[10px] dark:fill-slate-200"
            >
              {a.text}
            </text>
          {/each}
        {/if}

        {#if resolvedHorizontalOverlays.length > 0}
          {#each resolvedHorizontalOverlays as o (o.key)}
            <line
              x1={o.x1}
              x2={o.x2}
              y1={o.y}
              y2={o.y}
              stroke={o.color}
              stroke-width={o.strokeWidth ?? 1.5}
              stroke-dasharray={o.dashArray}
              class="pointer-events-none"
            />
          {/each}
        {/if}

        {#if xLabel}
          <text
            x={innerWidth / 2}
            y={innerHeight + (hasSubAxis ? 48 : 32)}
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
      <ul
        class={[
          'mt-0 flex flex-wrap gap-x-4 gap-y-1 text-xs',
          legendAlign === 'center' && 'justify-center',
        ]}
      >
        {#if legendItems && legendItems.length > 0}
          {#each legendItems as item (item.id)}
            <li class="flex items-center gap-1.5">
              <span
                class="inline-block h-2.5 w-2.5 rounded-sm"
                style="background-color: {item.color ?? '#64748b'};"
              ></span>
              <span class="text-slate-600 dark:text-slate-300">
                {item.label}
              </span>
            </li>
          {/each}
        {:else}
          {#each series as s, i (s.id)}
            <li class="flex items-center gap-1.5">
              <span
                class="inline-block h-2.5 w-2.5 rounded-sm"
                style="background-color: {s.color ?? paletteColor(i)};"
              ></span>
              <span class="text-slate-600 dark:text-slate-300">{s.label}</span>
            </li>
          {/each}
        {/if}
        {#if overlayLegendItems}
          {#each overlayLegendItems as item (item.id)}
            <li class="flex items-center gap-1.5">
              <span
                class="inline-block h-2.5 w-2.5 rounded-sm"
                style="background-color: {item.color ?? '#64748b'};"
              ></span>
              <span class="text-slate-600 dark:text-slate-300">
                {item.label}
              </span>
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  {/if}
</div>
