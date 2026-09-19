import { createContext } from 'svelte';
import { persisted } from '#lib/state/storage.svelte.js';

/**
 * Drag-and-drop assignment of items across labeled lanes.
 *
 * The pattern is domain-neutral: some set of named things is partitioned into
 * buckets, and the member moves one from bucket to bucket. What the lanes mean
 * -- included and excluded, a workflow's stages, a triage board -- is the
 * owner's business. This module knows only identifiers and lane keys.
 *
 * The manager is installed on the component context by whatever owns the board,
 * never at module scope: a module-level `$state` cell in a `.svelte.ts` file is
 * one object shared by every SSR request the process serves.
 */

/** One draggable entry in a lane. */
export type LaneItem = {
  /** Stable identifier, used as the drag payload and the keyed-each key. */
  id: string;
  /** Text shown on the card. */
  name: string;
};

/** Called when an item is dropped into a lane. */
export type LaneDropHandler = (laneKey: string, itemID: string) => void;

/** Called when the pointer enters an item, for an owner that shows a preview. */
export type LanePointerEnterHandler = (
  itemID: string,
  itemName: string,
  laneKey: string,
  event: PointerEvent,
) => void;

/** Called when the pointer leaves an item. */
export type LanePointerLeaveHandler = () => void;

/** The remembered lane ordering, keyed by an owner-chosen scope. */
type PersistedState = {
  /** Item identifiers in display order, per scope. */
  orderByScope: Record<string, string[]>;
};

const DEFAULT_STATE: PersistedState = { orderByScope: {} };

/** Report whether two orderings are identical. */
function sameOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

/** The MIME type carrying the dragged item's identifier. */
const DRAG_ITEM_TYPE = 'application/x-lane-item-id';

/**
 * SwimLaneManager owns the in-flight drag state and the remembered ordering for
 * one board.
 */
export class SwimLaneManager {
  #dragItemID = $state<string | null>(null);
  #hoveredLane = $state<string | null>(null);
  #dropHandler: LaneDropHandler = () => {};
  #onPointerEnter: LanePointerEnterHandler | undefined;
  #onPointerLeave: LanePointerLeaveHandler | undefined;
  #persistedState;

  /**
   * Create a manager whose ordering persists under `storageKey`.
   *
   * The key should be scoped per user by the caller where one browser serves
   * more than one account -- see `#lib/state/storage-keys.js`.
   */
  constructor(storageKey = 'swim_lane_ui') {
    this.#persistedState = persisted<PersistedState>(storageKey, DEFAULT_STATE);
  }

  /** The item currently being dragged, or null. */
  get dragItemID(): string | null {
    return this.#dragItemID;
  }

  /** The lane the pointer is currently over during a drag, or null. */
  get hoveredLane(): string | null {
    return this.#hoveredLane;
  }

  /** Install the callback that applies a completed drop. */
  setDropHandler(handler: LaneDropHandler): void {
    this.#dropHandler = handler;
  }

  /** Install optional hover callbacks, for an owner that shows a preview. */
  setPointerHandlers(
    onEnter?: LanePointerEnterHandler,
    onLeave?: LanePointerLeaveHandler,
  ): void {
    this.#onPointerEnter = onEnter;
    this.#onPointerLeave = onLeave;
  }

  /** Begin dragging an item. */
  onItemDragStart(itemID: string, event: DragEvent): void {
    this.#dragItemID = itemID;
    // `text/plain` is set alongside the typed entry so a drop onto something
    // outside this board degrades to pasting the identifier rather than
    // producing nothing.
    event.dataTransfer?.setData('text/plain', itemID);
    event.dataTransfer?.setData(DRAG_ITEM_TYPE, itemID);
    event.dataTransfer?.setDragImage(event.currentTarget as Element, 8, 8);
  }

  /** End a drag, whether or not it was dropped on a lane. */
  onItemDragEnd(): void {
    this.#dragItemID = null;
    this.#hoveredLane = null;
  }

  /** Mark a lane as the current drop target. */
  onDragOverLane(laneKey: string, event: DragEvent): void {
    // A dragover that is not prevented rejects the drop, so this is what makes
    // the lane a valid target at all.
    event.preventDefault();
    this.#hoveredLane = laneKey;
  }

  /** Apply a drop onto a lane. */
  onDropLane(laneKey: string, event: DragEvent): void {
    event.preventDefault();
    // The in-flight id is the last resort rather than the first: reading the
    // payload back out of the event is what makes a drop from another window
    // work, where this manager never saw the dragstart.
    const droppedID =
      event.dataTransfer?.getData(DRAG_ITEM_TYPE) ||
      event.dataTransfer?.getData('text/plain') ||
      this.#dragItemID;
    if (!droppedID) {
      this.#hoveredLane = null;
      return;
    }
    this.#dropHandler(laneKey, droppedID);
    this.#hoveredLane = null;
  }

  /** Clear the hover highlight when the pointer leaves a lane. */
  onLaneDragLeave(laneKey: string): void {
    if (this.#hoveredLane === laneKey) {
      this.#hoveredLane = null;
    }
  }

  /** Forward an item hover to the owner's handler, if one was installed. */
  onItemPointerEnter(
    itemID: string,
    itemName: string,
    laneKey: string,
    event: PointerEvent,
  ): void {
    this.#onPointerEnter?.(itemID, itemName, laneKey, event);
  }

  /** Forward an item un-hover to the owner's handler, if one was installed. */
  onItemPointerLeave(): void {
    this.#onPointerLeave?.();
  }

  /** Read the remembered ordering for a scope. */
  #readOrder(scope: string): string[] {
    return this.#persistedState.value.orderByScope[scope] ?? [];
  }

  /** Replace the remembered ordering for a scope. */
  #writeOrder(scope: string, order: string[]): void {
    // Spread and replace: the cell is `$state.raw`, so mutating the nested
    // record in place would not publish.
    this.#persistedState.value = {
      ...this.#persistedState.value,
      orderByScope: {
        ...this.#persistedState.value.orderByScope,
        [scope]: order,
      },
    };
  }

  /** Remember an ordering, writing only when it actually changed. */
  syncOrder(scope: string, order: string[]): void {
    if (sameOrder(this.#readOrder(scope), order)) return;
    this.#writeOrder(scope, order);
  }

  /**
   * Move one item one position within a list, returning a new array.
   *
   * A pure helper rather than a mutation, so the caller stays free to hold its
   * list in a `$state.raw` cell. Moving past either end is a no-op.
   */
  reorder<T extends { id: string }>(
    items: T[],
    id: string,
    direction: -1 | 1,
  ): T[] {
    const from = items.findIndex((item) => item.id === id);
    if (from === -1) return items;
    const to = from + direction;
    if (to < 0 || to >= items.length) return items;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }
}

/**
 * Type-safe context accessors for the swim-lane manager. `setSwimLaneContext`
 * installs a manager and returns it; `getSwimLaneContext` reads the manager
 * installed by the nearest ancestor, throwing if none was installed.
 */
export const [getSwimLaneContext, setSwimLaneContext] =
  createContext<SwimLaneManager>();
