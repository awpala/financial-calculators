<!--
@component
One labeled lane: a drop target holding its items, with a count and an empty state.
-->
<script lang="ts">
  import SwimLaneItem from '#lib/components/views/swim-lanes/SwimLaneItem.svelte';
  import {
    getSwimLaneContext,
    type LaneItem,
  } from '#lib/components/views/swim-lanes/swim-lane-context.svelte.js';

  /** Public inputs for this component. */
  type Props = {
    /** Stable key identifying this lane in drop handling. */
    laneKey: string;
    /** Heading shown above the lane. */
    title: string;
    /** The items currently assigned to this lane. */
    items: LaneItem[];
    /** Whether the lane body scrolls rather than growing; defaults to true. */
    contentScrollable?: boolean;
    /** Height cap applied when the body scrolls. Defaults to `'max-h-[calc(100vh-22rem)]'`. */
    contentMaxHeightClass?: string;
    /** Message shown when the lane holds nothing. Defaults to `'Drop items here'`. */
    emptyLabel?: string;
  };

  let {
    laneKey,
    title,
    items,
    contentScrollable = true,
    contentMaxHeightClass = 'max-h-[calc(100vh-22rem)]',
    emptyLabel = 'Drop items here',
  }: Props = $props();

  const context = getSwimLaneContext();
</script>

<div
  role="group"
  aria-label={`${title} lane`}
  class={[
    'rounded-xl p-3 transition-colors',
    context.hoveredLane === laneKey
      ? 'border-2 border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800/70'
      : 'border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900',
  ]}
  ondragover={(event) => context.onDragOverLane(laneKey, event)}
  ondrop={(event) => context.onDropLane(laneKey, event)}
  ondragleave={() => context.onLaneDragLeave(laneKey)}
>
  <header class="mb-3 flex items-center justify-between">
    <h2
      class="text-sm font-semibold tracking-wide text-slate-800 uppercase dark:text-slate-200"
    >
      {title}
    </h2>
    <span
      class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
    >
      {items.length}
    </span>
  </header>

  <div
    class={[
      'min-h-64 space-y-2 pr-1',
      contentScrollable && [
        contentMaxHeightClass,
        'inner-scroll-region overflow-y-auto',
      ],
    ]}
  >
    {#if items.length === 0}
      <p
        class="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400"
      >
        {emptyLabel}
      </p>
    {/if}
    {#each items as item (item.id)}
      <SwimLaneItem
        itemID={item.id}
        itemName={item.name}
        {laneKey}
        isDragging={context.dragItemID === item.id}
        onDragStart={(itemID, event) => context.onItemDragStart(itemID, event)}
        onDragEnd={() => context.onItemDragEnd()}
        onPointerEnter={(itemID, itemName, lane, event) =>
          context.onItemPointerEnter(itemID, itemName, lane, event)}
        onPointerLeave={() => context.onItemPointerLeave()}
      />
    {/each}
  </div>
</div>
