<!--
@component
A board of drag-and-drop lanes. The owner installs a SwimLaneManager on the context and supplies the partitioned items.
-->
<script lang="ts">
  import SwimLane from '#lib/components/views/swim-lanes/SwimLane.svelte';
  import type { LaneItem } from '#lib/components/views/swim-lanes/swim-lane-context.svelte.js';

  /** One lane in the board. */
  export type SwimLaneConfig = {
    /** Stable key identifying this lane in drop handling. */
    laneKey: string;
    /** Heading shown above the lane. */
    title: string;
    /** The items currently assigned to this lane. */
    items: LaneItem[];
    /** Whether this lane's body scrolls; overrides the board default. */
    contentScrollable?: boolean;
    /** Height cap for this lane's body; overrides the board default. */
    contentMaxHeightClass?: string;
    /** Message shown when this lane holds nothing. */
    emptyLabel?: string;
  };

  /** Public inputs for this component. */
  type Props = {
    /** The lanes to render, in display order. */
    lanes: SwimLaneConfig[];
    /** Grid classes governing the board layout. Defaults to `'grid grid-cols-1 gap-4 md:grid-cols-2'`. */
    gridClass?: string;
    /** Board-wide default for whether lane bodies scroll; defaults to true. */
    contentScrollable?: boolean;
    /** Board-wide default height cap for scrolling lane bodies. */
    contentMaxHeightClass?: string;
  };

  let {
    lanes,
    gridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2',
    contentScrollable = true,
    contentMaxHeightClass,
  }: Props = $props();
</script>

<div class={gridClass}>
  {#each lanes as lane (lane.laneKey)}
    <SwimLane
      laneKey={lane.laneKey}
      title={lane.title}
      items={lane.items}
      contentScrollable={lane.contentScrollable ?? contentScrollable}
      contentMaxHeightClass={lane.contentMaxHeightClass ??
        contentMaxHeightClass}
      emptyLabel={lane.emptyLabel ?? 'Drop items here'}
    />
  {/each}
</div>
