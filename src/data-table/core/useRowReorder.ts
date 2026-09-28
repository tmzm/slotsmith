import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DragHandleSlotProps } from "../slots/types";
import {
  blockRowOffsets,
  dropTargetAt,
  landingIndex,
  moveItem,
  rowOffsets,
  scrollSpeed,
  siblingBlocks,
  stepTarget,
  type DropPosition,
  type DropTarget,
  type RowBlock,
  type RowLevel,
  type RowOrderChange,
} from "./reorder";
import type { ReorderLabels } from "./reorderLabels";
import {
  applyOffsets,
  drawnTops,
  prefersReducedMotion,
  restoreStyles,
  rowsIn,
  saveStyles,
  scrollAreaOf,
  settle,
  type SavedStyle,
} from "./reorderMotion";

/**
 * Row reorder attributes
 *
 * What a row carries: its id, and its part in a drag.
 */
export interface RowReorderAttributes {
  "data-row-id": string;
  /** Set on the row being moved. */
  "data-dragging"?: "";
  /** Set on the visible sub-rows of the row being moved, which move with it (tree tables). */
  "data-dragging-child"?: "";
  /** Set on the row it would be dropped next to, naming the side. */
  "data-drop-position"?: DropPosition;
  /**
   * Set on the row whose edge the moved row would land against: the target
   * row for `"before"`, and for `"after"` the last visible row of the
   * target's subtree (the target itself in a flat table). Draw a drop line here.
   */
  "data-drop-edge"?: DropPosition;
}

/**
 * Row reorder model
 *
 * The row-reorder state and the props that wire rows and handles to it.
 */
export interface RowReorderModel {
  /** Whether rows can be dragged right now. */
  enabled: boolean;
  /** The id of the row being moved, if any. */
  draggingId: string | null;
  /** Where it would land if dropped now. */
  target: { id: string; position: DropPosition } | null;
  /** The latest announcement for assistive technology. */
  announcement: string;
  /**
   * The id every handle's `aria-describedby` points at. Render a visually
   * hidden element with this id holding the `reorderInstructions` label.
   */
  instructionsId: string;
  /** Props for a row's drag handle. */
  getHandleProps: (rowId: string) => DragHandleSlotProps;
  /** Attributes for a row: its id and its drag state. */
  getRowProps: (rowId: string) => RowReorderAttributes;
}

/**
 * Reorder tree
 *
 * How a tree table's rows relate, for moving a row among its siblings.
 *
 * @typeParam T - The row data type.
 */
export interface ReorderTree<T> {
  /** Where a row sits: its parent's id and its depth. */
  levelOf: (id: string) => RowLevel | undefined;
  /** A parent row and its children, in the order of its sub-rows in the data. */
  childrenOf: (parentId: string) => { parent: T; rows: readonly { id: string; original: T }[] } | undefined;
}

/**
 * Row reorder options
 *
 * @typeParam T - The row data type.
 */
export interface UseRowReorderOptions<T> {
  enabled: boolean;
  /** The ids of the visible rows, in the order shown. */
  visibleIds: readonly string[];
  /** Every top-level row, in the order of `data`. */
  rows: readonly { id: string; original: T }[];
  /** A tree table's structure. Omit for a flat table: every row is then top-level. */
  tree?: ReorderTree<T>;
  labels: ReorderLabels;
  onRowOrderChange?: (change: RowOrderChange<T>) => void;
}

type Mode = "pointer" | "keyboard";

interface State {
  draggingId: string | null;
  /** The dragged row's visible sub-rows, which move with it. */
  children: readonly string[];
  target: DropTarget | null;
  /** The row whose edge the dragged row would land against. */
  edgeId: string | null;
  announcement: string;
  mode: Mode | null;
  /** Counts finished drags, so the settle and focus effects run once per drop. */
  ends: number;
}

type Action =
  | { type: "start"; id: string; children: readonly string[]; mode: Mode; announcement: string }
  | { type: "target"; target: DropTarget | null; edgeId: string | null; announcement: string }
  | { type: "end"; announcement: string };

const initialState: State = {
  draggingId: null,
  children: [],
  target: null,
  edgeId: null,
  announcement: "",
  mode: null,
  ends: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return {
        ...state,
        draggingId: action.id,
        children: action.children,
        mode: action.mode,
        target: null,
        edgeId: null,
        announcement: action.announcement,
      };
    case "target":
      return { ...state, target: action.target, edgeId: action.edgeId, announcement: action.announcement };
    case "end":
      return { ...initialState, announcement: action.announcement, ends: state.ends + 1 };
  }
}

/**
 * Drag session
 *
 * Everything about the drag in progress that event listeners read without
 * re-subscribing. Rects are measured once, at rest, in the coordinates of the
 * scroll area's content, so scrolling does not invalidate them.
 *
 * Targets, steps and offsets work on blocks: the dragged row's siblings, each
 * with its visible sub-rows. In a flat table every block is one row.
 */
interface Session {
  id: string;
  mode: Mode;
  handle: HTMLElement;
  parent: HTMLElement;
  /** The dragged row's siblings with their subtrees, at rest, in content coordinates, top to bottom. */
  blocks: RowBlock[];
  /** The siblings' ids, in the order shown. */
  ids: string[];
  /** Every row that moves with the drag: the dragged row and its visible sub-rows. */
  moving: Set<string>;
  /** The dragged row's parent; `null` at the top level. */
  parentId: string | null;
  /** The `visibleIds` the drag started with; any change to them ends it. */
  shown: readonly string[];
  saved: Map<string, SavedStyle>;
  /** The nearest scrolling ancestor; `null` for the window. */
  area: HTMLElement | null;
  reduced: boolean;
  target: DropTarget | null;
  pointerId: number;
  /** The pointer's content position when the drag started. */
  startY: number;
  clientY: number;
  /** The dragged row's transform is stale. */
  dirty: boolean;
  frame: number | null;
  detach: () => void;
}

/** A settle waiting for React to render the drop. */
interface PendingSettle {
  parent: HTMLElement;
  before: Map<string, number>;
  saved: Map<string, SavedStyle>;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a === b || (a.length === b.length && a.every((id, index) => id === b[index]));

/**
 * Released off the rows
 *
 * Whether a pointer was let go above, below or beside the rows the dragged
 * row can move among: its siblings and their subtrees. The live preview
 * clamps such a pointer to the first or last sibling, but a release there
 * (over another parent's rows, in a tree) is not a drop.
 */
function releasedOffRows(s: Session, clientX: number, clientY: number): boolean {
  const y = clientY - contentOrigin(s.area);
  const first = s.blocks[0]!;
  const last = s.blocks[s.blocks.length - 1]!;
  const box = s.parent.getBoundingClientRect();
  return y < first.top || y > last.bottom || clientX < box.left || clientX > box.right;
}

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  a === b || (a !== null && b !== null && a.id === b.id && a.position === b.position);

/** Where the scroll area's content starts, in viewport coordinates. */
const contentOrigin = (area: HTMLElement | null) =>
  area ? area.getBoundingClientRect().top - area.scrollTop : -window.scrollY;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Measure
 *
 * @returns Each row's rect in content coordinates. Called before any transform is written.
 */
function measure(parent: HTMLElement, area: HTMLElement | null) {
  const origin = contentOrigin(area);
  return rowsIn(parent).map((row) => {
    const rect = row.getBoundingClientRect();
    return { id: row.getAttribute("data-row-id") ?? "", top: rect.top - origin, bottom: rect.bottom - origin };
  });
}

/** One-based position the dragged row would have if dropped now. */
const positionOf = (s: Session, target: DropTarget | null) =>
  (target ? landingIndex(s.ids, s.id, target) : s.ids.indexOf(s.id)) + 1;

/**
 * Pointer target
 *
 * The drop target under the pointer, or `null` when dropping there would
 * leave the row where it is.
 */
function pointerTarget(s: Session, y: number): DropTarget | null {
  const target = dropTargetAt(s.blocks, y);
  if (!target || target.id === s.id) return null;
  return landingIndex(s.ids, s.id, target) === s.ids.indexOf(s.id) ? null : target;
}

/**
 * Auto-scroll
 *
 * Scrolls the scroll area while the pointer is near its top or bottom edge.
 * Each step is an instant scroll: under `scroll-behavior: smooth` (common on
 * the page itself) a plain step would start an animation that the next frame
 * restarts, and the view would crawl at a fraction of the intended speed.
 *
 * @returns Whether it scrolled.
 */
function autoScroll(s: Session): boolean {
  const { area } = s;
  const box = area?.getBoundingClientRect();
  const speed = scrollSpeed(s.clientY, box?.top ?? 0, box?.bottom ?? window.innerHeight);
  if (speed === 0) return false;

  if (area) {
    const next = Math.max(0, Math.min(area.scrollTop + speed, area.scrollHeight - area.clientHeight));
    if (next === area.scrollTop) return false;
    // jsdom has no `Element.scrollTo`; plain `scrollTop` is the fallback there.
    if (!instantScroll(area, next)) area.scrollTop = next;
    return true;
  }
  const next = Math.max(0, Math.min(window.scrollY + speed, document.documentElement.scrollHeight - window.innerHeight));
  if (next === window.scrollY) return false;
  if (!instantScroll(window, next)) window.scrollTo(window.scrollX, next);
  return true;
}

/**
 * Instant scroll
 *
 * `scrollTo` with `behavior: "instant"`. Browsers that predate that value
 * throw on it, and a throw inside the frame loop would end the drag, so
 * this reports failure instead and the caller scrolls the plain way.
 *
 * @returns Whether it scrolled.
 */
function instantScroll(target: HTMLElement | Window, top: number): boolean {
  if (typeof target.scrollTo !== "function") return false;
  try {
    target.scrollTo({ top, behavior: "instant" });
    return true;
  } catch {
    return false;
  }
}

/** Where every row is drawn for a target: the blocks passed make room, the dragged block travels. */
const targetOffsets = (s: Session, target: DropTarget | null) =>
  blockRowOffsets(s.blocks, rowOffsets(s.blocks, s.id, target));

/**
 * Draw a pointer drag
 *
 * The dragged block follows the pointer, kept between the first and the last
 * sibling; the blocks it passed make room.
 */
function drawPointer(s: Session): void {
  const offsets = targetOffsets(s, s.target);
  const own = s.blocks[s.ids.indexOf(s.id)]!;
  const first = s.blocks[0]!;
  const last = s.blocks[s.blocks.length - 1]!;
  const y = s.clientY - contentOrigin(s.area);
  const travel = clamp(y - s.startY, first.top - own.top, last.bottom - own.bottom);
  for (const id of s.moving) offsets.set(id, travel);
  applyOffsets(s.parent, offsets, s.moving, false);
}

/**
 * Edge row
 *
 * @returns The row whose edge a drop on `target` lands against: the target
 *   for `"before"`, the last row of its block for `"after"`.
 */
function edgeOf(s: Session, target: DropTarget | null): string | null {
  if (!target) return null;
  if (target.position === "before") return target.id;
  const block = s.blocks.find((candidate) => candidate.id === target.id);
  return block ? block.ids[block.ids.length - 1]! : target.id;
}

/**
 * useRowReorder
 *
 * The row-reorder engine: pointer, touch and keyboard dragging of the rows of
 * one table body, with animated rows, auto-scroll and announcements. It never
 * reorders anything itself: a drop reports the new `data` through
 * `onRowOrderChange`, and the app stores it.
 *
 * In a tree table a row moves only among its siblings, carrying its visible
 * sub-rows with it; positions are announced among those siblings.
 *
 * Handles are found from events (`event.currentTarget`, then its closest
 * `[data-row-id]`), not from refs, because a function component slot does not
 * receive `ref` on React 18.
 *
 * @typeParam T - The row data type.
 * @param options - See {@link UseRowReorderOptions}.
 * @returns See {@link RowReorderModel}.
 */
export function useRowReorder<T>(options: UseRowReorderOptions<T>): RowReorderModel {
  const { enabled, visibleIds, labels } = options;
  const [state, dispatch] = useReducer(reducer, initialState);
  const instructionsId = useId();

  const latest = useRef({ options });
  latest.current = { options };
  const session = useRef<Session | null>(null);
  const pendingSettle = useRef<PendingSettle | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const stopSettle = useRef<(() => void) | null>(null);

  const engine = useMemo(() => {
    const labelsNow = () => latest.current.options.labels;

    /**
     * Stop
     *
     * The one place a drag ends: listeners, frames and pointer capture go,
     * every inline style written is removed, and the drawn positions are kept
     * for the settle animation when `animate` is set.
     */
    function stop(s: Session, animate: boolean): void {
      session.current = null;
      s.detach();
      if (s.frame !== null) cancelAnimationFrame(s.frame);
      if (s.mode === "pointer") {
        try {
          if (s.handle.hasPointerCapture?.(s.pointerId) !== false) s.handle.releasePointerCapture?.(s.pointerId);
        } catch {
          // The handle is gone, and its capture with it.
        }
      }
      const before = animate && !s.reduced && s.parent.isConnected ? drawnTops(s.parent) : null;
      restoreStyles(s.parent, s.saved);
      pendingSettle.current = before ? { parent: s.parent, before, saved: s.saved } : null;
    }

    function cancel(): void {
      const s = session.current;
      if (!s) return;
      stop(s, true);
      dispatch({ type: "end", announcement: labelsNow().reorderCancelled });
    }

    function commit(): void {
      const s = session.current;
      if (!s) return;
      const { rows: top, tree, onRowOrderChange } = latest.current.options;
      const { target, parentId } = s;
      const announcement = labelsNow().reorderDropped(positionOf(s, target), s.ids.length);
      stop(s, true);

      // Indexes come from the data (the parent's sub-rows), never from the sorted or paged view.
      const family = parentId === null ? { parent: null, rows: top } : tree?.childrenOf(parentId);
      if (target && family) {
        const { rows } = family;
        const from = rows.findIndex((row) => row.id === s.id);
        const to = rows.findIndex((row) => row.id === target.id);
        if (from >= 0 && to >= 0) {
          const order = moveItem(rows, from, to, target.position);
          if (order.some((row, index) => row.id !== rows[index]!.id)) {
            const siblings = order.map((row) => row.original);
            onRowOrderChange?.({
              row: rows[from]!.original,
              rowId: s.id,
              target: rows[to]!.original,
              targetId: target.id,
              position: target.position,
              data: parentId === null ? siblings : top.map((row) => row.original),
              parentId,
              parent: family.parent,
              siblings: parentId === null ? siblings.slice() : siblings,
            });
          }
        }
      }

      if (s.mode === "keyboard") pendingFocus.current = s.id;
      dispatch({ type: "end", announcement });
    }

    function setTarget(s: Session, target: DropTarget | null, force = false): void {
      if (!force && sameTarget(s.target, target)) return;
      s.target = target;
      dispatch({
        type: "target",
        target,
        edgeId: edgeOf(s, target),
        announcement: labelsNow().reorderMoved(positionOf(s, target), s.ids.length),
      });
    }

    function start(rowId: string, handle: HTMLElement, mode: Mode): Session | null {
      const parent = handle.closest("[data-row-id]")?.parentElement;
      if (!parent) return null;

      // A new drag measures rows at rest, so a settle still running ends now.
      stopSettle.current?.();
      stopSettle.current = null;

      const area = scrollAreaOf(parent);
      const rects = measure(parent, area);
      const { tree } = latest.current.options;
      const levels = rects.map(({ id }) => tree?.levelOf(id) ?? { id, parentId: null, depth: 0 });
      const blocks = siblingBlocks(levels, rects, rowId);
      // Not rendered, or an only child: nothing to move among.
      if (blocks.length < 2) return null;
      const ids = blocks.map((block) => block.id);
      const own = blocks[ids.indexOf(rowId)]!;

      const s: Session = {
        id: rowId,
        mode,
        handle,
        parent,
        blocks,
        ids,
        moving: new Set(own.ids),
        parentId: levels.find((level) => level.id === rowId)!.parentId,
        shown: latest.current.options.visibleIds.slice(),
        saved: saveStyles(parent),
        area,
        reduced: prefersReducedMotion(),
        target: null,
        pointerId: -1,
        startY: 0,
        clientY: 0,
        dirty: false,
        frame: null,
        detach: () => {},
      };
      session.current = s;
      dispatch({
        type: "start",
        id: rowId,
        children: own.ids.slice(1),
        mode,
        announcement: labelsNow().reorderLifted(ids.indexOf(rowId) + 1, ids.length),
      });
      return s;
    }

    /** Follows the pointer: the target now, the transform on the next frame. */
    function track(s: Session): void {
      setTarget(s, pointerTarget(s, s.clientY - contentOrigin(s.area)));
      s.dirty = true;
    }

    function onPointerDown(rowId: string, event: ReactPointerEvent<HTMLElement>): void {
      if (!latest.current.options.enabled || event.button !== 0 || session.current) return;
      const handle = event.currentTarget;
      event.preventDefault();
      const s = start(rowId, handle, "pointer");
      if (!s) return;

      s.pointerId = event.pointerId;
      s.clientY = event.clientY;
      s.startY = event.clientY - contentOrigin(s.area);
      try {
        handle.setPointerCapture?.(event.pointerId);
      } catch {
        // Without capture the drag still works while the pointer stays over the handle.
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== s.pointerId) return;
        s.clientY = e.clientY;
        track(s);
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== s.pointerId) return;
        s.clientY = e.clientY;
        if (releasedOffRows(s, e.clientX, e.clientY)) {
          cancel();
          return;
        }
        track(s);
        if (s.target) commit();
        else cancel();
      };
      const onCancel = (e: Event) => {
        if (e instanceof PointerEvent && e.pointerId !== s.pointerId) return;
        cancel();
      };

      // On the window, not the handle: a handle that unmounts mid-drag
      // (the body swapped for status rows, a row re-created) would take
      // listeners on it along, and the drag would never end.
      const listeners: [string, (e: PointerEvent) => void][] = [
        ["pointermove", onMove],
        ["pointerup", onUp],
        ["pointercancel", onCancel],
        ["lostpointercapture", onCancel],
      ];
      for (const [type, listener] of listeners) window.addEventListener(type, listener as EventListener);
      window.addEventListener("blur", onCancel);
      s.detach = () => {
        for (const [type, listener] of listeners) window.removeEventListener(type, listener as EventListener);
        window.removeEventListener("blur", onCancel);
      };

      /** One frame loop: auto-scroll, then the dragged row's transform. */
      const tick = () => {
        if (session.current !== s) return;
        if (autoScroll(s)) track(s);
        if (s.dirty && !s.reduced) {
          s.dirty = false;
          drawPointer(s);
        }
        s.frame = requestAnimationFrame(tick);
      };
      s.frame = requestAnimationFrame(tick);
    }

    function step(s: Session, direction: -1 | 1): void {
      const target = stepTarget(s.ids, s.id, s.target, direction);
      setTarget(s, target, true);
      if (!s.reduced) applyOffsets(s.parent, targetOffsets(s, target), s.moving, true);
      const shown = target?.id ?? s.id;
      rowsIn(s.parent)
        .find((row) => row.getAttribute("data-row-id") === shown)
        ?.scrollIntoView?.({ block: "nearest" });
    }

    function onKeyDown(rowId: string, event: KeyboardEvent<HTMLElement>): void {
      const s = session.current;
      const { key } = event;

      if (!s) {
        if (!latest.current.options.enabled || (key !== " " && key !== "Enter")) return;
        event.preventDefault();
        start(rowId, event.currentTarget, "keyboard");
        return;
      }
      if (s.mode !== "keyboard" || s.id !== rowId) return;

      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        step(s, key === "ArrowDown" ? 1 : -1);
      } else if (key === " " || key === "Enter") {
        event.preventDefault();
        commit();
      } else if (key === "Escape") {
        event.preventDefault();
        cancel();
      } else if (key === "Tab") {
        cancel();
      }
    }

    function onBlur(rowId: string): void {
      const s = session.current;
      if (s?.mode === "keyboard" && s.id === rowId) cancel();
    }

    /** Ends a drag whose row or table went away, without animating. */
    function abandon(): void {
      const s = session.current;
      if (!s) return;
      stop(s, false);
      dispatch({ type: "end", announcement: labelsNow().reorderCancelled });
    }

    return { onPointerDown, onKeyDown, onBlur, abandon, stop };
  }, []);

  /**
   * A drag is cancelled when the rows change under it (they were measured at
   * the start), when its handle was unmounted (its events would never
   * arrive), or when the table turned reordering off.
   */
  useEffect(() => {
    const s = session.current;
    if (s && (!enabled || !s.handle.isConnected || !sameIds(s.shown, visibleIds))) engine.abandon();
  });

  /** Unmounting mid-drag removes every listener and inline style. */
  useEffect(
    () => () => {
      const s = session.current;
      if (s) engine.stop(s, false);
      stopSettle.current?.();
      stopSettle.current = null;
    },
    [engine],
  );

  /** After React has rendered a drop, every row glides from where it was drawn. */
  useIsomorphicLayoutEffect(() => {
    const pending = pendingSettle.current;
    pendingSettle.current = null;
    if (!pending || !pending.parent.isConnected) return;
    stopSettle.current?.();
    stopSettle.current = settle(pending.parent, pending.before, pending.saved);
  }, [state.ends]);

  /** The handle keeps focus after a keyboard drop, even when React re-created its row. */
  useEffect(() => {
    const id = pendingFocus.current;
    pendingFocus.current = null;
    if (id === null || (document.activeElement && document.activeElement !== document.body)) return;
    for (const row of Array.from(document.querySelectorAll("[data-row-id]"))) {
      if (row.getAttribute("data-row-id") !== id) continue;
      const handle = Array.from(row.querySelectorAll<HTMLElement>("[aria-describedby]")).find((element) =>
        element.getAttribute("aria-describedby")!.split(/\s+/).includes(instructionsId),
      );
      if (handle) {
        handle.focus();
        return;
      }
    }
  }, [state.ends, instructionsId]);

  const { draggingId, children, target, edgeId, mode } = state;

  /** In a tree, a row with no visible sibling has nothing to swap with: its handle is disabled. */
  const { tree } = options;
  const siblingCounts = new Map<string | null, number>();
  if (tree) {
    for (const id of visibleIds) {
      const parentId = tree.levelOf(id)?.parentId ?? null;
      siblingCounts.set(parentId, (siblingCounts.get(parentId) ?? 0) + 1);
    }
  }
  const alone = (rowId: string) =>
    tree !== undefined && (siblingCounts.get(tree.levelOf(rowId)?.parentId ?? null) ?? 0) < 2;

  return {
    enabled,
    draggingId,
    target,
    announcement: state.announcement,
    instructionsId,
    getHandleProps: (rowId) => ({
      "aria-label": labels.reorderRow,
      "aria-describedby": instructionsId,
      "aria-pressed": mode === "keyboard" && draggingId === rowId ? true : undefined,
      "data-dragging": draggingId === rowId ? "" : undefined,
      disabled: !enabled || alone(rowId),
      // Touch would scroll the page instead of dragging the row.
      style: { touchAction: "none" },
      // A press on the handle is a drag, never a click on its row (`onRowClick`).
      onClick: (event) => event.stopPropagation(),
      onPointerDown: (event) => engine.onPointerDown(rowId, event),
      onKeyDown: (event) => engine.onKeyDown(rowId, event),
      onBlur: () => engine.onBlur(rowId),
    }),
    getRowProps: (rowId) => {
      const attributes: RowReorderAttributes = { "data-row-id": rowId };
      if (draggingId === rowId) attributes["data-dragging"] = "";
      else if (children.includes(rowId)) attributes["data-dragging-child"] = "";
      if (target?.id === rowId) attributes["data-drop-position"] = target.position;
      if (target && edgeId === rowId) attributes["data-drop-edge"] = target.position;
      return attributes;
    },
  };
}
