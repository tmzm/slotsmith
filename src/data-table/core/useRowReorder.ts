import {
  useCallback,
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
  depthRange,
  dropTargetAt,
  groupOrder,
  layoutOffsets,
  landingIndex,
  moveInTree,
  moveItem,
  placementAt,
  rowOffsets,
  scrollSpeed,
  siblingBlocks,
  stepTarget,
  type DropPlace,
  type DropPosition,
  type DropTarget,
  type Placement,
  type RowBlock,
  type RowLevel,
  type RowMove,
  type RowOrderChange,
  type RowRect,
  type TreeNode,
} from "./reorder";
import { joinGroup, memberAt, membersOf, type GroupMember, type RowTransfer } from "./reorderGroups";
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
  /** Set on the row that rows dragged from another table of the group would land next to. */
  "data-drop-incoming"?: "";
  /** Set on the visible sub-rows of the row being moved, which move with it (tree tables). */
  "data-dragging-child"?: "";
  /** Set on the row it would be dropped next to, naming the side. */
  "data-drop-position"?: DropPlace;
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
  target: { id: string; position: DropPlace } | null;
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
  /**
   * Gives the engine the places of rows that are not rendered, for a body
   * that windows its rows; `null` goes back to measuring the rendered rows.
   * The same function on every render.
   */
  setGeometry: (geometry: ReorderGeometry | null) => void;
  /** Props for the element holding the rows: in a reorder group, the mark other tables find it by. */
  getBodyProps: () => { "data-reorder-table"?: string };
}

/**
 * Reorder geometry
 *
 * Where every row is, for a windowed body that renders only some of them.
 */
export interface ReorderGeometry {
  /** Every row's extent, rendered or not, top to bottom, in the scroll area's content coordinates. */
  measure: (parent: HTMLElement, area: HTMLElement | null) => { id: string; top: number; bottom: number }[];
  /** Scrolls a row into view, rendered or not. */
  reveal: (id: string) => void;
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
  /** Every top-level row, in the order of `data`, with its sub-rows. */
  rows: readonly TreeNode<T>[];
  /** A tree table's structure. Omit for a flat table: every row is then top-level. */
  tree?: ReorderTree<T>;
  labels: ReorderLabels;
  onRowOrderChange?: (change: RowOrderChange<T>) => void;
  /**
   * In a tree, rows may move to another parent and another depth, not only
   * among their siblings. Needs `setSubRows`, to build the new tree.
   */
  acrossParents?: boolean;
  /** Writes new children into a copy of a row, to build the tree after a move across parents. */
  setSubRows?: (row: T, subRows: T[]) => T;
  /** Whether a row may land at a place; places it may not are skipped. */
  canDrop?: (move: RowMove<T>) => boolean;
  /** The selected rows: dragging one of them drags every selected sibling with it. */
  selectedIds?: ReadonlySet<string>;
  /**
   * A reorder group: top-level rows may be dragged into the other tables of
   * the group, and theirs into this one. `tableId` names this table in
   * transfers; `onRowTransfer` reports a transfer into or out of it.
   */
  transfer?: { group: string; tableId: string; onRowTransfer?: (transfer: RowTransfer<T>) => void };
}

type Mode = "pointer" | "keyboard";

/** The target shown on the rows: a side of a row, or inside it. */
type ShownTarget = { id: string; position: DropPlace };

interface State {
  draggingId: string | null;
  /** The dragged row's visible sub-rows, which move with it. */
  children: readonly string[];
  target: ShownTarget | null;
  /** The row whose edge the dragged row would land against. */
  edgeId: string | null;
  announcement: string;
  mode: Mode | null;
  /** Where rows dragged from another table of the group would land in this one. */
  incoming: ShownTarget | null;
  /** Counts finished drags, so the settle and focus effects run once per drop. */
  ends: number;
}

type Action =
  | { type: "start"; id: string; children: readonly string[]; mode: Mode; announcement: string }
  | { type: "target"; target: ShownTarget | null; edgeId: string | null; announcement: string }
  | { type: "end"; announcement: string }
  | { type: "incoming"; target: ShownTarget | null; announcement: string };

const initialState: State = {
  draggingId: null,
  children: [],
  target: null,
  edgeId: null,
  announcement: "",
  mode: null,
  incoming: null,
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
    case "incoming":
      return { ...state, incoming: action.target, announcement: action.target ? action.announcement : state.announcement };
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
  /** A drag across parents: the place it would land, picked by height and depth. `null` among siblings. */
  across: AcrossDrag | null;
  /** A drag over another table of the reorder group: that table and the gap the rows would land in. */
  foreign: ForeignDrop | null;
  /** The floating copy of the dragged rows shown while the pointer is over another table. */
  ghost: HTMLElement | null;
  /** How far below the dragged row's top the pointer took hold of it. */
  grab: number;
  /**
   * A drag of several selected rows: the selected siblings move together as
   * one group, put back together at a gap among the other rows. `null` for
   * a drag of one row.
   */
  group: GroupDrag | null;
  /** The pointer's horizontal position: when the drag started, and now. */
  startX: number;
  clientX: number;
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

/**
 * Foreign drop
 *
 * Where rows dragged out of their table would land in another table of the
 * reorder group: a gap among that table's shown top-level rows.
 */
interface ForeignDrop {
  member: GroupMember;
  /** The other table's shown top-level rows, top to bottom. */
  ids: string[];
  gap: number;
}

/** The target a foreign drop marks in the other table: before the row below the gap, or after the last one. */
function foreignTarget(foreign: ForeignDrop): DropTarget | null {
  const { ids, gap } = foreign;
  if (!ids.length) return null;
  return gap < ids.length ? { id: ids[gap]!, position: "before" } : { id: ids[ids.length - 1]!, position: "after" };
}

/** A table's shown top-level rows, top to bottom. */
function shownTopRows(member: GroupMember): HTMLElement[] {
  const body = member.body();
  if (!body) return [];
  const top = new Set(member.rows().map((row) => row.id));
  return rowsIn(body).filter((row) => top.has(row.getAttribute("data-row-id") ?? ""));
}

/**
 * Make ghost
 *
 * A floating copy of the dragged rows that follows the pointer over another
 * table, each cell as wide as the original, so it reads as the same rows.
 */
function makeGhost(s: Session): HTMLElement {
  const table = document.createElement("table");
  table.setAttribute("aria-hidden", "true");
  table.setAttribute("data-reorder-ghost", "");
  const source = s.parent.closest("table");
  if (source) table.className = source.className;
  const body = document.createElement(s.parent.tagName.toLowerCase());
  body.className = s.parent.className;
  table.appendChild(body);
  let width = 0;
  for (const row of rowsIn(s.parent)) {
    if (!s.moving.has(row.getAttribute("data-row-id") ?? "")) continue;
    const copy = row.cloneNode(true) as HTMLElement;
    copy.style.transform = "";
    copy.style.transition = "";
    const cells = Array.from(row.children) as HTMLElement[];
    Array.from(copy.children).forEach((cell, index) => {
      (cell as HTMLElement).style.width = `${cells[index]!.getBoundingClientRect().width}px`;
    });
    width = Math.max(width, row.getBoundingClientRect().width);
    body.appendChild(copy);
  }
  Object.assign(table.style, {
    position: "fixed",
    zIndex: "2147483647",
    pointerEvents: "none",
    width: `${width}px`,
    left: `${s.parent.getBoundingClientRect().left}px`,
    opacity: "0.9",
    boxShadow: "0 8px 24px rgb(0 0 0 / 18%)",
    borderCollapse: "separate",
    borderSpacing: "0",
  });
  document.body.appendChild(table);
  return table;
}

/**
 * Across drag
 *
 * A drag that may change the row's parent. In such a drag every visible row
 * is a block of its own (the dragged row keeps its sub-rows), so the rows make
 * room in the flat order, and the depth is picked apart from the height: by
 * dragging sideways, or with the left and right arrow keys.
 */
interface AcrossDrag {
  /** The visible rows, the moved ones left out, top to bottom. */
  rest: RowLevel[];
  /** The gap the dragged row sits in, at rest. */
  ownGap: number;
  /** The dragged row's depth and index among its siblings, at rest. */
  ownDepth: number;
  ownIndex: number;
  /** The gap and the depth picked now. */
  gap: number;
  depth: number;
  /** Where it would land; `null` when it would stay where it is, or may not land there. */
  placement: Placement | null;
  /** One depth's indent, in pixels. */
  indent: number;
  rtl: boolean;
}

/**
 * Group drag
 *
 * A drag of every selected sibling at once. The group is drawn stacked under
 * the pointer, the other rows close up around it, and it lands together, in
 * its own order, at the gap it is dropped in.
 */
interface GroupDrag {
  /** The selected siblings' ids, top to bottom: the dragged row is one of them. */
  ids: string[];
  /** The other siblings, top to bottom, at rest. */
  rest: RowBlock[];
  /** The gap the group would land in, among `rest`. */
  gap: number;
  /** The gap it sat in when the drag started: the dragged row's place among `rest`. */
  ownGap: number;
}

/**
 * Group target
 *
 * The target a group drag marks on the rows: before the row below the gap,
 * or after the last row.
 */
function groupTarget(group: GroupDrag): DropTarget | null {
  const { rest, gap } = group;
  if (!rest.length) return null;
  return gap < rest.length ? { id: rest[gap]!.id, position: "before" } : { id: rest[rest.length - 1]!.id, position: "after" };
}

/**
 * Group offsets
 *
 * Where every row is drawn in a group drag: laid out with the group put
 * together at its gap. A pointer drag adds the pointer's travel to the group,
 * so it follows the pointer from there.
 */
function groupOffsets(s: Session, group: GroupDrag, travel: number | null): Map<string, number> {
  const offsets = layoutOffsets(s.blocks, groupOrder(s.ids, group.ids, group.gap));
  for (const id of s.moving) if (!offsets.has(id)) offsets.set(id, 0);
  if (travel === null) return offsets;
  const delta = travel - (offsets.get(s.id) ?? 0);
  for (const id of s.moving) offsets.set(id, offsets.get(id)! + delta);
  return offsets;
}

/**
 * Flat blocks
 *
 * Every visible row as a block of its own, but the dragged row, whose block
 * spans its visible sub-rows: the blocks of a drag across parents.
 */
function flatBlocks(rows: readonly RowLevel[], rects: readonly RowRect[], draggingId: string): RowBlock[] {
  const rectOf = new Map(rects.map((rect) => [rect.id, rect]));
  const blocks: RowBlock[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const ids = [row.id];
    if (row.id === draggingId) {
      while (index + 1 < rows.length && rows[index + 1]!.depth > row.depth) ids.push(rows[++index]!.id);
    }
    const first = rectOf.get(ids[0]!);
    const last = rectOf.get(ids[ids.length - 1]!);
    if (first && last) blocks.push({ id: row.id, top: first.top, bottom: last.bottom, ids });
  }
  return blocks;
}

/**
 * Handle in
 *
 * A row's drag handle: the element whose `aria-describedby` names the
 * table's instructions. Found this way, not by ref, because a function
 * component slot does not receive `ref` on React 18.
 */
function handleIn(row: Element, instructionsId: string): HTMLElement | undefined {
  return Array.from(row.querySelectorAll<HTMLElement>("[aria-describedby]")).find((element) =>
    element.getAttribute("aria-describedby")!.split(/\s+/).includes(instructionsId),
  );
}

/** A settle waiting for React to render the drop. */
interface PendingSettle {
  parent: HTMLElement;
  before: Map<string, number>;
  saved: Map<string, SavedStyle>;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const NO_BODY_PROPS: { "data-reorder-table"?: string } = {};

/** One depth's indent in the tree, in rem: the first cell's padding per level. */
const INDENT_REM = 1.25;

/** One row handle's event handlers. */
type RowHandlers = Pick<DragHandleSlotProps, "onPointerDown" | "onKeyDown" | "onBlur">;

/** Touch would scroll the page instead of dragging the row. */
const HANDLE_STYLE = { touchAction: "none" } as const;

/** A press on the handle is a drag, never a click on its row (`onRowClick`). */
const stopClick = (event: { stopPropagation: () => void }) => event.stopPropagation();

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
  // Over another table, the rows rest here and a floating copy follows the pointer.
  if (s.foreign) {
    applyOffsets(s.parent, new Map(), s.moving, false);
    s.ghost ??= makeGhost(s);
    s.ghost.style.top = `${s.clientY - s.grab}px`;
    return;
  }
  if (s.ghost) {
    s.ghost.remove();
    s.ghost = null;
  }
  const offsets = targetOffsets(s, s.target);
  const own = s.blocks[s.ids.indexOf(s.id)]!;
  const first = s.blocks[0]!;
  const last = s.blocks[s.blocks.length - 1]!;
  const y = s.clientY - contentOrigin(s.area);
  const travel = clamp(y - s.startY, first.top - own.top, last.bottom - own.bottom);
  if (s.group) {
    applyOffsets(s.parent, groupOffsets(s, s.group, travel), s.moving, false);
    return;
  }
  for (const id of s.moving) offsets.set(id, travel);
  applyOffsets(s.parent, offsets, s.moving, false, shiftOf(s));
}

/**
 * Shift of
 *
 * How far to the side the dragged rows are drawn: in a drag across parents,
 * one indent per level the row would move by; otherwise none.
 */
function shiftOf(s: Session): number {
  const { across } = s;
  if (!across?.placement) return 0;
  return (across.placement.depth - across.ownDepth) * across.indent * (across.rtl ? -1 : 1);
}

/**
 * Edge row
 *
 * @returns The row whose edge a drop on `target` lands against: the target
 *   for `"before"`, the last row of its block for `"after"`, the target itself
 *   for `"inside"`.
 */
function edgeOf(s: Session, target: ShownTarget | null): string | null {
  if (!target) return null;
  if (target.position !== "after") return target.id;
  const block = s.blocks.find((candidate) => candidate.id === target.id);
  return block ? block.ids[block.ids.length - 1]! : target.id;
}

/**
 * Flat target
 *
 * The target in the flat order of a drag across parents, for the rows that
 * make room: before the row below the gap, or after the last row.
 *
 * @returns The target; `null` for the gap the row already sits in.
 */
function flatTarget(across: AcrossDrag): DropTarget | null {
  const { rest, gap, ownGap } = across;
  if (gap === ownGap) return null;
  return gap < rest.length ? { id: rest[gap]!.id, position: "before" } : { id: rest[rest.length - 1]!.id, position: "after" };
}

/**
 * Shown target
 *
 * The target a drag across parents reports, always one of the new siblings
 * or the new parent: inside the row above when the row becomes its child,
 * before the row below when that is a new sibling, else after the new
 * sibling above. `edge` is the row to draw the drop line on: the row right
 * above or below the gap.
 */
function shownTarget(across: AcrossDrag): { target: ShownTarget; edge: string } | null {
  const { rest, gap, placement } = across;
  if (!placement) return null;
  const { depth } = placement;
  const above = rest[gap - 1];
  const below = rest[gap];
  if (above && depth === above.depth + 1) return { target: { id: above.id, position: "inside" }, edge: above.id };
  if (below && below.depth === depth) return { target: { id: below.id, position: "before" }, edge: below.id };
  let anchor = above;
  while (anchor && anchor.depth > depth) anchor = rest.find((row) => row.id === anchor!.parentId);
  return anchor && above ? { target: { id: anchor.id, position: "after" }, edge: above.id } : null;
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

  const latest = useRef({ options, instructionsId });
  latest.current = { options, instructionsId };
  const session = useRef<Session | null>(null);
  const pendingSettle = useRef<PendingSettle | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const stopSettle = useRef<(() => void) | null>(null);
  const handlerCache = useRef(new Map<string, RowHandlers>());
  const geometry = useRef<ReorderGeometry | null>(null);
  const setGeometry = useCallback((next: ReorderGeometry | null) => {
    geometry.current = next;
  }, []);

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
      s.ghost?.remove();
      s.ghost = null;
      s.foreign?.member.showIncoming(null, "");
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

    /** A parent's child ids in the data's order (`null` for the top level), the dragged row left out. */
    function childIds(parentId: string | null, draggingId: string): string[] {
      const { rows, tree } = latest.current.options;
      const children = parentId === null ? rows : (tree?.childrenOf(parentId)?.rows ?? []);
      return children.map((row) => row.id).filter((id) => id !== draggingId);
    }

    /** Every row of the tree by id, for the rows a move reports. */
    function originalOf(id: string): T | undefined {
      const visit = (nodes: readonly TreeNode<T>[]): T | undefined => {
        for (const node of nodes) {
          if (node.id === id) return node.original;
          const found = node.subRows && visit(node.subRows);
          if (found !== undefined) return found;
        }
        return undefined;
      };
      return visit(latest.current.options.rows);
    }

    /**
     * Place across
     *
     * Picks where a drag across parents lands for a gap and a wished depth:
     * the allowed depth nearest the wish whose place `canDrop` accepts. The
     * row's own place is no move (`placement` `null`), as is a gap where no
     * depth is accepted.
     */
    function placeAcross(s: Session, across: AcrossDrag, gap: number, wish: number): void {
      const { canDrop } = latest.current.options;
      const { min, max } = depthRange(across.rest[gap - 1], across.rest[gap]);
      const depths = Array.from({ length: max - min + 1 }, (_, n) => min + n).sort(
        (a, b) => Math.abs(a - wish) - Math.abs(b - wish) || a - b,
      );
      across.gap = gap;
      across.placement = null;
      across.depth = clamp(wish, min, max);
      const row = originalOf(s.id);
      for (const depth of depths) {
        const placement = placementAt(across.rest, gap, depth, (parentId) => childIds(parentId, s.id));
        if (placement.parentId === s.parentId && placement.index === across.ownIndex) {
          across.depth = depth;
          return;
        }
        const parent = placement.parentId === null ? null : (originalOf(placement.parentId) ?? null);
        if (canDrop && row !== undefined && !canDrop({ row, rowId: s.id, parent, parentId: placement.parentId, index: placement.index })) {
          continue;
        }
        across.depth = depth;
        across.placement = placement;
        return;
      }
    }

    /** Shows a drag across parents: its target on the rows, and where it would land, read aloud. */
    function showAcross(s: Session, across: AcrossDrag): void {
      const shown = shownTarget(across);
      const target = shown?.target ?? null;
      s.target = flatTarget(across);
      const place = across.placement ?? { parentId: s.parentId, index: across.ownIndex, depth: across.ownDepth };
      const total = childIds(place.parentId, s.id).length + 1;
      dispatch({
        type: "target",
        target,
        edgeId: shown?.edge ?? null,
        announcement: `${labelsNow().reorderMoved(place.index + 1, total)} ${labelsNow().reorderLevel(place.depth + 1)}`,
      });
    }

    /** Reports a drop across parents: the whole new tree, built with `setSubRows`. */
    function commitAcross(s: Session, across: AcrossDrag): string {
      const { rows, onRowOrderChange, setSubRows } = latest.current.options;
      const { placement } = across;
      if (!placement || !setSubRows) return labelsNow().reorderCancelled;
      const ids = childIds(placement.parentId, s.id);
      ids.splice(placement.index, 0, s.id);
      const { target } = shownTarget(across)!;
      onRowOrderChange?.({
        row: originalOf(s.id)!,
        rowId: s.id,
        rows: [originalOf(s.id)!],
        rowIds: [s.id],
        target: originalOf(target.id)!,
        targetId: target.id,
        position: target.position,
        data: moveInTree(rows, s.id, placement, setSubRows),
        parentId: placement.parentId,
        parent: placement.parentId === null ? null : (originalOf(placement.parentId) ?? null),
        siblings: ids.map((id) => originalOf(id)!),
        index: placement.index,
        fromParentId: s.parentId,
        fromParent: s.parentId === null ? null : (originalOf(s.parentId) ?? null),
      });
      return `${labelsNow().reorderDropped(placement.index + 1, ids.length)} ${labelsNow().reorderLevel(placement.depth + 1)}`;
    }

    /** The rows a drag into another table carries: the selected group, or the dragged row, in the data's order. */
    function carried(s: Session): { id: string; original: T }[] {
      const ids = new Set(s.group ? s.group.ids : [s.id]);
      return latest.current.options.rows.filter((row) => ids.has(row.id));
    }

    /** Where in another table's data rows dropped at a gap land. */
    function foreignIndex(foreign: ForeignDrop): number {
      const rows = foreign.member.rows();
      const target = foreignTarget(foreign);
      if (!target) return rows.length;
      const at = rows.findIndex((row) => row.id === target.id);
      return target.position === "before" ? at : at + 1;
    }

    /**
     * Enter foreign
     *
     * Moves a drag over another table of the group, at a gap: that table marks
     * where the rows would land. A place its `canDrop` refuses is no target.
     */
    function enterForeign(s: Session, member: GroupMember, gap: number): void {
      const ids = shownTopRows(member).map((row) => row.getAttribute("data-row-id")!);
      const foreign: ForeignDrop = { member, ids, gap: clamp(gap, 0, ids.length) };
      const rows = carried(s);
      const fromTableId = latest.current.options.transfer!.tableId;
      const accepted = member.accepts(rows.map((row) => row.original), rows.map((row) => row.id), fromTableId, foreignIndex(foreign));
      if (s.foreign && s.foreign.member !== member) s.foreign.member.showIncoming(null, "");
      if (!accepted) {
        leaveForeign(s);
        return;
      }
      s.foreign = foreign;
      const announcement = labelsNow().reorderMoved(foreign.gap + 1, ids.length + rows.length);
      member.showIncoming(foreignTarget(foreign), announcement);
      dispatch({ type: "target", target: null, edgeId: null, announcement });
    }

    /** Takes a drag back from another table: its mark is cleared. */
    function leaveForeign(s: Session): void {
      if (!s.foreign) return;
      s.foreign.member.showIncoming(null, "");
      s.foreign = null;
    }

    /** Reports a drop into another table to both tables. */
    function commitForeign(s: Session, foreign: ForeignDrop): string {
      const { rows: own, transfer } = latest.current.options;
      const moving = carried(s);
      const movingIds = new Set(moving.map((row) => row.id));
      const theirs = foreign.member.rows();
      const index = foreignIndex(foreign);
      const target = foreignTarget(foreign);
      const fromData = own.filter((row) => !movingIds.has(row.id)).map((row) => row.original);
      const toData = [...theirs.slice(0, index).map((row) => row.original), ...moving.map((row) => row.original), ...theirs.slice(index).map((row) => row.original)];
      const shared = {
        rows: moving.map((row) => row.original),
        rowIds: moving.map((row) => row.id),
        from: { tableId: transfer!.tableId, data: fromData },
        to: {
          tableId: foreign.member.tableId,
          data: toData as T[],
          index,
          target: target ? ((theirs.find((row) => row.id === target.id)?.original ?? null) as T | null) : null,
          targetId: target?.id ?? null,
          position: target?.position ?? ("before" as const),
        },
      };
      transfer!.onRowTransfer?.({ ...shared, data: fromData });
      foreign.member.receive({ ...shared, data: toData } as RowTransfer<unknown>);
      return labelsNow().reorderDropped(index + 1, toData.length);
    }

    /** Whether a drag in its own table is at the last place it can take. */
    function atEnd(s: Session): boolean {
      if (s.group) return s.group.gap === s.group.rest.length;
      return (s.target ? landingIndex(s.ids, s.id, s.target) : s.ids.indexOf(s.id)) === s.ids.length - 1;
    }

    /** Whether a drag in its own table is at the first place it can take. */
    function atStart(s: Session): boolean {
      if (s.group) return s.group.gap === 0;
      return (s.target ? landingIndex(s.ids, s.id, s.target) : s.ids.indexOf(s.id)) === 0;
    }

    /** Draws a drag in its own table again, after it came back from another table. */
    function redrawOwn(s: Session): void {
      if (s.reduced) return;
      const offsets = s.group ? groupOffsets(s, s.group, null) : targetOffsets(s, s.target);
      applyOffsets(s.parent, offsets, s.moving, true);
    }

    /**
     * Track foreign
     *
     * Follows a pointer out of its table into another table of the reorder
     * group, and back. Only top-level rows move between tables.
     *
     * @returns Whether the drag is over another table now.
     */
    function trackForeign(s: Session): boolean {
      const { transfer } = latest.current.options;
      if (!transfer || s.parentId !== null || s.across) return false;
      const box = s.parent.getBoundingClientRect();
      const inside = s.clientX >= box.left && s.clientX <= box.right && s.clientY >= box.top && s.clientY <= box.bottom;
      const member = inside ? null : memberAt(transfer.group, s.clientX, s.clientY, latest.current.instructionsId);
      if (!member) {
        leaveForeign(s);
        return false;
      }
      const rows = shownTopRows(member);
      const ids = rows.map((row) => row.getAttribute("data-row-id")!);
      const hit = dropTargetAt(
        rows.map((row, index) => {
          const rect = row.getBoundingClientRect();
          return { id: ids[index]!, top: rect.top, bottom: rect.bottom };
        }),
        s.clientY,
      );
      const index = hit ? ids.indexOf(hit.id) : -1;
      const gap = !hit || index < 0 ? ids.length : hit.position === "before" ? index : index + 1;
      if (s.foreign?.member !== member || s.foreign.gap !== gap) enterForeign(s, member, gap);
      return s.foreign !== null;
    }

    /**
     * Step foreign
     *
     * The keyboard across tables: past the last place of a table, the next
     * table of the group; before its first, the previous one.
     *
     * @returns Whether the step was taken here.
     */
    function stepForeign(s: Session, direction: -1 | 1): boolean {
      const { transfer } = latest.current.options;
      if (!transfer || s.parentId !== null || s.across) return false;
      const members = membersOf(transfer.group);
      const home = latest.current.instructionsId;
      if (s.foreign) {
        const { member, gap, ids } = s.foreign;
        const next = gap + direction;
        if (next >= 0 && next <= ids.length) {
          enterForeign(s, member, next);
        } else {
          const neighbour = members[members.indexOf(member) + direction];
          if (!neighbour) return true;
          if (neighbour.key === home) {
            leaveForeign(s);
            redrawOwn(s);
            dispatch({
              type: "target",
              target: s.target,
              edgeId: edgeOf(s, s.target),
              announcement: labelsNow().reorderMoved(atEnd(s) ? s.ids.length : 1, s.ids.length),
            });
          } else {
            enterForeign(s, neighbour, direction === 1 ? 0 : shownTopRows(neighbour).length);
          }
        }
        const foreign = s.foreign as ForeignDrop | null;
        const target = foreign && foreignTarget(foreign);
        if (foreign && target) {
          shownTopRows(foreign.member)
            .find((row) => row.getAttribute("data-row-id") === target.id)
            ?.scrollIntoView?.({ block: "nearest" });
        }
        return true;
      }
      if (!(direction === 1 ? atEnd(s) : atStart(s))) return false;
      const neighbour = members[members.findIndex((member) => member.key === home) + direction];
      if (!neighbour) return false;
      if (!s.reduced) applyOffsets(s.parent, new Map(), s.moving, true);
      enterForeign(s, neighbour, direction === 1 ? 0 : shownTopRows(neighbour).length);
      return true;
    }

    /** Reports a group drop: the group put together, in the data's order, at its gap. */
    function commitGroup(s: Session, group: GroupDrag): string {
      const { rows: top, tree, onRowOrderChange } = latest.current.options;
      const { parentId } = s;
      const family = parentId === null ? { parent: null, rows: top } : tree?.childrenOf(parentId);
      const shown = groupTarget(group);
      if (!family || !shown) return labelsNow().reorderCancelled;
      const moving = new Set(group.ids);
      const rest = family.rows.filter((row) => !moving.has(row.id));
      const members = family.rows.filter((row) => moving.has(row.id));
      // The gap is among the rows shown; the data may hold more (other pages): place by the row next to it.
      const at = rest.findIndex((row) => row.id === shown.id) + (shown.position === "after" ? 1 : 0);
      const order = [...rest.slice(0, at), ...members, ...rest.slice(at)];
      if (order.every((row, index) => row.id === family.rows[index]!.id)) return labelsNow().reorderCancelled;
      const siblings = order.map((row) => row.original);
      const dragged = family.rows.find((row) => row.id === s.id)!;
      onRowOrderChange?.({
        row: dragged.original,
        rowId: s.id,
        rows: members.map((row) => row.original),
        rowIds: members.map((row) => row.id),
        target: rest.find((row) => row.id === shown.id)!.original,
        targetId: shown.id,
        position: shown.position,
        data: parentId === null ? siblings : top.map((row) => row.original),
        parentId,
        parent: family.parent,
        siblings: parentId === null ? siblings.slice() : siblings,
        index: order.findIndex((row) => row.id === s.id),
        fromParentId: parentId,
        fromParent: family.parent,
      });
      return labelsNow().reorderDropped(group.gap + 1, group.rest.length + 1);
    }

    /** Shows a group drag's target, and reads its place aloud. */
    function showGroup(s: Session, group: GroupDrag): void {
      const target = groupTarget(group);
      s.target = target;
      dispatch({
        type: "target",
        target,
        edgeId: edgeOf(s, target),
        announcement: labelsNow().reorderMoved(group.gap + 1, group.rest.length + 1),
      });
    }

    function commit(): void {
      const s = session.current;
      if (!s) return;
      if (s.foreign) {
        const foreign = s.foreign;
        stop(s, true);
        const announcement = commitForeign(s, foreign);
        dispatch({ type: "end", announcement });
        return;
      }
      if (s.group) {
        const group = s.group;
        stop(s, true);
        const announcement = commitGroup(s, group);
        if (s.mode === "keyboard") pendingFocus.current = s.id;
        dispatch({ type: "end", announcement });
        return;
      }
      if (s.across) {
        const across = s.across;
        stop(s, true);
        const announcement = commitAcross(s, across);
        if (s.mode === "keyboard") pendingFocus.current = s.id;
        dispatch({ type: "end", announcement });
        return;
      }
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
              rows: [rows[from]!.original],
              rowIds: [s.id],
              target: rows[to]!.original,
              targetId: target.id,
              position: target.position,
              data: parentId === null ? siblings : top.map((row) => row.original),
              parentId,
              parent: family.parent,
              siblings: parentId === null ? siblings.slice() : siblings,
              index: order.findIndex((row) => row.id === s.id),
              fromParentId: parentId,
              fromParent: family.parent,
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
      const rects = geometry.current?.measure(parent, area) ?? measure(parent, area);
      const { tree, acrossParents, setSubRows } = latest.current.options;
      const levels = rects.map(({ id }) => tree?.levelOf(id) ?? { id, parentId: null, depth: 0 });
      const across = Boolean(acrossParents && tree && setSubRows);
      const blocks = across ? flatBlocks(levels, rects, rowId) : siblingBlocks(levels, rects, rowId);
      // Not rendered, or an only child: nothing to move among, unless another table of a group can take it.
      const canLeave = Boolean(latest.current.options.transfer) && levels.find((level) => level.id === rowId)?.parentId === null;
      if (blocks.length < (canLeave ? 1 : 2)) return null;
      const ids = blocks.map((block) => block.id);
      const own = blocks[ids.indexOf(rowId)]!;
      const ownLevel = levels.find((level) => level.id === rowId)!;
      // A selected row drags every selected sibling with it.
      const { selectedIds } = latest.current.options;
      const groupIds = !across && selectedIds?.has(rowId) ? ids.filter((id) => selectedIds.has(id)) : [];
      const grouped = groupIds.length > 1;
      const groupRest = grouped ? blocks.filter((block) => !groupIds.includes(block.id)) : [];
      const groupGap = ids.slice(0, ids.indexOf(rowId)).filter((id) => !groupIds.includes(id)).length;

      const s: Session = {
        group: grouped ? { ids: groupIds, rest: groupRest, gap: groupGap, ownGap: groupGap } : null,
        foreign: null,
        ghost: null,
        grab: 0,
        across: across
          ? {
              rest: levels.filter((level) => !own.ids.includes(level.id)),
              ownGap: levels.indexOf(ownLevel),
              ownDepth: ownLevel.depth,
              ownIndex: childIds(ownLevel.parentId, "").indexOf(rowId),
              gap: levels.indexOf(ownLevel),
              depth: ownLevel.depth,
              placement: null,
              indent: (Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) * INDENT_REM,
              rtl: getComputedStyle(parent).direction === "rtl",
            }
          : null,
        startX: 0,
        clientX: 0,
        id: rowId,
        mode,
        handle,
        parent,
        blocks,
        ids,
        moving: new Set(grouped ? blocks.filter((block) => groupIds.includes(block.id)).flatMap((block) => block.ids) : own.ids),
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
        children: [...s.moving].filter((id) => id !== rowId),
        mode,
        announcement: s.group
          ? labelsNow().reorderLifted(groupGap + 1, groupRest.length + 1)
          : labelsNow().reorderLifted(ids.indexOf(rowId) + 1, ids.length),
      });
      // A group closes up at once: the selected rows stack under the dragged one.
      if (s.group) {
        showGroup(s, s.group);
        if (!s.reduced) applyOffsets(parent, groupOffsets(s, s.group, null), s.moving, true);
      }
      return s;
    }

    /** Follows the pointer: the target now, the transform on the next frame. */
    function track(s: Session): void {
      s.dirty = true;
      if (trackForeign(s)) return;
      const { across, group } = s;
      if (group) {
        // The height picks the gap among the other rows, at rest.
        const hit = dropTargetAt(group.rest, s.clientY - contentOrigin(s.area));
        const index = hit ? group.rest.findIndex((block) => block.id === hit.id) : -1;
        const gap = !hit || index < 0 ? group.gap : hit.position === "before" ? index : index + 1;
        if (gap !== group.gap) {
          group.gap = gap;
          showGroup(s, group);
        }
        return;
      }
      if (!across) {
        setTarget(s, pointerTarget(s, s.clientY - contentOrigin(s.area)));
        return;
      }
      // The height picks the gap; sideways, one indent per level picks the depth.
      const hit = dropTargetAt(s.blocks, s.clientY - contentOrigin(s.area));
      const index = hit ? across.rest.findIndex((row) => row.id === hit.id) : -1;
      const gap = !hit || hit.id === s.id || index < 0 ? across.ownGap : hit.position === "before" ? index : index + 1;
      const sideways = (s.clientX - s.startX) * (across.rtl ? -1 : 1);
      const wish = across.ownDepth + Math.round(sideways / across.indent);
      const before = { gap: across.gap, placement: across.placement };
      placeAcross(s, across, gap, wish);
      if (before.gap !== across.gap || before.placement?.parentId !== across.placement?.parentId || before.placement?.index !== across.placement?.index) {
        showAcross(s, across);
      }
    }

    function onPointerDown(rowId: string, event: ReactPointerEvent<HTMLElement>): void {
      if (!latest.current.options.enabled || event.button !== 0 || session.current) return;
      const handle = event.currentTarget;
      event.preventDefault();
      const s = start(rowId, handle, "pointer");
      if (!s) return;

      s.pointerId = event.pointerId;
      s.clientY = event.clientY;
      s.clientX = event.clientX;
      s.startX = event.clientX;
      s.grab = event.clientY - (handle.closest("[data-row-id]")?.getBoundingClientRect().top ?? event.clientY);
      s.startY = event.clientY - contentOrigin(s.area);
      try {
        handle.setPointerCapture?.(event.pointerId);
      } catch {
        // Without capture the drag still works while the pointer stays over the handle.
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== s.pointerId) return;
        s.clientY = e.clientY;
        s.clientX = e.clientX;
        track(s);
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== s.pointerId) return;
        s.clientY = e.clientY;
        s.clientX = e.clientX;
        if (!s.foreign && releasedOffRows(s, e.clientX, e.clientY)) {
          cancel();
          return;
        }
        track(s);
        // Across parents a sideways move alone is a move too.
        if (s.foreign || s.group || (s.across ? s.across.placement : s.target)) commit();
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
      if (stepForeign(s, direction)) return;
      if (s.group) {
        const group = s.group;
        group.gap = clamp(group.gap + direction, 0, group.rest.length);
        showGroup(s, group);
        if (!s.reduced) applyOffsets(s.parent, groupOffsets(s, group, null), s.moving, true);
        reveal(s, groupTarget(group)?.id ?? s.id);
        return;
      }
      if (s.across) {
        const across = s.across;
        placeAcross(s, across, clamp(across.gap + direction, 0, across.rest.length), across.depth);
        showAcross(s, across);
        drawKeyboard(s);
        return;
      }
      const target = stepTarget(s.ids, s.id, s.target, direction);
      setTarget(s, target, true);
      if (!s.reduced) applyOffsets(s.parent, targetOffsets(s, target), s.moving, true);
      reveal(s, target?.id ?? s.id);
    }

    /** Moves a drag across parents one level in or out, with the left and right arrow keys. */
    function stepDepth(s: Session, across: AcrossDrag, direction: -1 | 1): void {
      placeAcross(s, across, across.gap, across.depth + direction);
      showAcross(s, across);
      drawKeyboard(s);
    }

    /** Draws a keyboard drag across parents: the rows make room, the dragged row slides to its depth. */
    function drawKeyboard(s: Session): void {
      if (!s.reduced) {
        const offsets = targetOffsets(s, s.target);
        for (const id of s.moving) if (!offsets.has(id)) offsets.set(id, 0);
        applyOffsets(s.parent, offsets, s.moving, true, shiftOf(s));
      }
      const target = s.target;
      reveal(s, target?.id ?? s.id);
    }

    /** Scrolls a row into view, rendered or not. */
    function reveal(s: Session, shown: string): void {
      const element = rowsIn(s.parent).find((row) => row.getAttribute("data-row-id") === shown);
      // A windowed body may not have the row rendered: its geometry scrolls to it.
      if (element) element.scrollIntoView?.({ block: "nearest" });
      else geometry.current?.reveal(shown);
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
      } else if (s.across && (key === "ArrowRight" || key === "ArrowLeft")) {
        event.preventDefault();
        // Right goes one level in, left one level out; the other way round right to left.
        const inward = (key === "ArrowRight") !== s.across.rtl;
        stepDepth(s, s.across, inward ? 1 : -1);
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

    /**
     * Relocate
     *
     * Keeps a drag going when React re-creates its rows (a `Row` slot defined
     * during render is a new component each time): the session finds its row
     * again by `data-row-id`, takes the new handle and the new row group,
     * moves keyboard focus to the new handle, and redraws the rows where
     * they were, with no transition.
     *
     * @returns Whether the drag can go on: its row is still rendered.
     */
    function relocate(s: Session): boolean {
      if (s.handle.isConnected && s.parent.isConnected) return true;
      const scope: ParentNode = s.parent.isConnected ? s.parent : document;
      const row = Array.from(scope.querySelectorAll<HTMLElement>("[data-row-id]")).find(
        (candidate) => candidate.getAttribute("data-row-id") === s.id,
      );
      const handle = row && handleIn(row, latest.current.instructionsId);
      if (!row?.parentElement || !handle) return false;
      // A removed element takes focus with it: focus is then on the body.
      const lostFocus = !document.activeElement || document.activeElement === document.body;
      s.handle = handle;
      s.parent = row.parentElement;
      if (s.mode === "keyboard" && lostFocus) handle.focus({ preventScroll: true });
      if (!s.reduced) {
        if (s.mode === "pointer") drawPointer(s);
        else applyOffsets(s.parent, targetOffsets(s, s.target), s.moving, false);
        for (const moved of rowsIn(s.parent)) moved.style.transition = "none";
      }
      return true;
    }

    /** Ends a drag whose row or table went away, without animating. */
    function abandon(): void {
      const s = session.current;
      if (!s) return;
      stop(s, false);
      dispatch({ type: "end", announcement: labelsNow().reorderCancelled });
    }

    return { onPointerDown, onKeyDown, onBlur, abandon, relocate, stop };
  }, []);

  /** A table of a reorder group takes part in the group: other tables' drags can find it and drop into it. */
  const transferGroup = options.transfer?.group;
  useEffect(() => {
    if (!transferGroup) return;
    return joinGroup(transferGroup, {
      key: instructionsId,
      get tableId() {
        return latest.current.options.transfer?.tableId ?? instructionsId;
      },
      body: () => document.querySelector<HTMLElement>(`[data-reorder-table="${instructionsId}"]`),
      rows: () => latest.current.options.rows,
      accepts: (rows, rowIds, fromTableId, index) => {
        const { canDrop } = latest.current.options;
        return (
          !canDrop ||
          rows.every((row, n) =>
            canDrop({ row: row as T, rowId: rowIds[n]!, parent: null, parentId: null, index: index + n, fromTableId }),
          )
        );
      },
      showIncoming: (target, announcement) => dispatch({ type: "incoming", target, announcement }),
      receive: (transfer) => latest.current.options.transfer?.onRowTransfer?.(transfer as RowTransfer<T>),
    });
  }, [transferGroup, instructionsId]);

  /**
   * A drag is cancelled when the rows change under it (they were measured at
   * the start), when its row is no longer rendered, or when the table turned
   * reordering off. Rows that were only re-created are found again.
   */
  useEffect(() => {
    const s = session.current;
    if (s && (!enabled || !sameIds(s.shown, visibleIds) || !engine.relocate(s))) engine.abandon();
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
      const handle = handleIn(row, instructionsId);
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
  // Across parents a row is never alone: it can move to another parent.
  const across = Boolean(options.acrossParents && options.setSubRows);
  const alone = (rowId: string) =>
    tree !== undefined && !across && (siblingCounts.get(tree.levelOf(rowId)?.parentId ?? null) ?? 0) < 2;

  /** Each row's handlers, made once, so a row's handle props stay equal between renders and memoized rows can skip. */
  const handlersOf = (rowId: string): RowHandlers => {
    let handlers = handlerCache.current.get(rowId);
    if (!handlers) {
      handlers = {
        onPointerDown: (event) => engine.onPointerDown(rowId, event),
        onKeyDown: (event) => engine.onKeyDown(rowId, event),
        onBlur: () => engine.onBlur(rowId),
      };
      handlerCache.current.set(rowId, handlers);
    }
    return handlers;
  };

  return {
    enabled,
    draggingId,
    target,
    announcement: state.announcement,
    instructionsId,
    setGeometry,
    getHandleProps: (rowId) => ({
      "aria-label": labels.reorderRow,
      "aria-describedby": instructionsId,
      "aria-pressed": mode === "keyboard" && draggingId === rowId ? true : undefined,
      "data-dragging": draggingId === rowId ? "" : undefined,
      disabled: !enabled || alone(rowId),
      style: HANDLE_STYLE,
      onClick: stopClick,
      ...handlersOf(rowId),
    }),
    getRowProps: (rowId) => {
      const attributes: RowReorderAttributes = { "data-row-id": rowId };
      if (draggingId === rowId) attributes["data-dragging"] = "";
      else if (children.includes(rowId)) attributes["data-dragging-child"] = "";
      if (target?.id === rowId) attributes["data-drop-position"] = target.position;
      // "inside" draws its line under the new parent, as "after" does.
      if (target && edgeId === rowId) attributes["data-drop-edge"] = target.position === "before" ? "before" : "after";
      const { incoming } = state;
      if (!target && incoming?.id === rowId) {
        attributes["data-drop-incoming"] = "";
        attributes["data-drop-position"] = incoming.position;
        attributes["data-drop-edge"] = incoming.position === "before" ? "before" : "after";
      }
      return attributes;
    },
    getBodyProps: () => (options.transfer ? { "data-reorder-table": instructionsId } : NO_BODY_PROPS),
  };
}
