import type { DropPosition } from "./reorder";

/**
 * Row transfer
 *
 * What a drop into another table of a reorder group reports. Both tables
 * receive it through `onRowTransfer`, each with its own new rows as `data`:
 * the rows the dragged ones left in the table they came from, and the rows
 * with them added in the table they joined.
 *
 * @typeParam T - The row data type.
 */
export interface RowTransfer<T> {
  /** The rows that moved, in their order. */
  rows: T[];
  rowIds: string[];
  /** The table they left, and its rows without them. */
  from: { tableId: string; data: T[] };
  /** The table they joined, its rows with them, and where they landed. */
  to: {
    tableId: string;
    data: T[];
    /** Their index in `to.data`. */
    index: number;
    /** The row they were dropped next to; `null` in an empty table. */
    target: T | null;
    targetId: string | null;
    position: DropPosition;
  };
  /** This table's new rows: `from.data` in the table they left, `to.data` in the one they joined. */
  data: T[];
}

/**
 * Group member
 *
 * One table of a reorder group, as a drag that started in another table of
 * the group sees it. Rows are opaque here: the tables of a group are meant to
 * hold rows of one type, and only the app's callbacks read them.
 */
export interface GroupMember {
  /** Unique per table instance. */
  key: string;
  /** The table's name in transfers (`reorderTableId`). */
  tableId: string;
  /** The table's body, the element holding its rows, marked `data-reorder-table`. */
  body: () => HTMLElement | null;
  /** The table's top-level rows, in the data's order. */
  rows: () => readonly { id: string; original: unknown }[];
  /** Whether rows from another table may land at an index (the table's `canDrop`). */
  accepts: (rows: readonly unknown[], rowIds: readonly string[], fromTableId: string, index: number) => boolean;
  /** Marks where incoming rows would land, or clears the mark. */
  showIncoming: (target: { id: string; position: DropPosition } | null, announcement: string) => void;
  /** Reports a transfer into this table. */
  receive: (transfer: RowTransfer<unknown>) => void;
}

const groups = new Map<string, Set<GroupMember>>();

/**
 * Join group
 *
 * Adds a table to a reorder group.
 *
 * @returns A function that takes it out again.
 */
export function joinGroup(name: string, member: GroupMember): () => void {
  let members = groups.get(name);
  if (!members) groups.set(name, (members = new Set()));
  members.add(member);
  return () => {
    members.delete(member);
    if (!members.size) groups.delete(name);
  };
}

/**
 * Members of
 *
 * @returns A group's tables that are on the page, in the page's order.
 */
export function membersOf(name: string): GroupMember[] {
  return Array.from(groups.get(name) ?? [])
    .filter((member) => member.body()?.isConnected)
    .sort((a, b) => {
      const position = a.body()!.compareDocumentPosition(b.body()!);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
}

/**
 * Member at
 *
 * @returns The table of a group whose body is under a point, other than `except`; `null` when none is.
 */
export function memberAt(name: string, x: number, y: number, except: string): GroupMember | null {
  for (const member of membersOf(name)) {
    if (member.key === except) continue;
    const box = member.body()!.getBoundingClientRect();
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return member;
  }
  return null;
}
