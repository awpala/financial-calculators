<!--
@component
One draggable card in a lane. Presentation only: every interaction is reported to the owner.
-->
<script lang="ts">
  /** Public inputs and callbacks for this component. */
  type Props = {
    /** Stable identifier of the item, carried as the drag payload. */
    itemID: string;
    /** Text shown on the card. */
    itemName: string;
    /** Key of the lane this card currently sits in. */
    laneKey: string;
    /** Whether this card is the one being dragged, which dims it. */
    isDragging: boolean;
    /** Reports the start of a drag, so the owner can record the payload. */
    onDragStart: (itemID: string, event: DragEvent) => void;
    /** Reports the end of a drag, dropped or not. */
    onDragEnd: () => void;
    /** Optional hover report, for an owner that shows a preview. */
    onPointerEnter?: (
      itemID: string,
      itemName: string,
      laneKey: string,
      event: PointerEvent,
    ) => void;
    /** Optional un-hover report, paired with onPointerEnter. */
    onPointerLeave?: () => void;
  };

  let {
    itemID,
    itemName,
    laneKey,
    isDragging,
    onDragStart,
    onDragEnd,
    onPointerEnter,
    onPointerLeave,
  }: Props = $props();
</script>

<article
  draggable="true"
  class={[
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    isDragging
      ? 'cursor-grabbing opacity-60'
      : 'cursor-grab transition-colors hover:border-slate-400 dark:hover:border-slate-500',
  ]}
  ondragstart={(event) => onDragStart(itemID, event)}
  ondragend={onDragEnd}
  onpointerenter={(event) => onPointerEnter?.(itemID, itemName, laneKey, event)}
  onpointerleave={() => onPointerLeave?.()}
>
  {itemName}
</article>
