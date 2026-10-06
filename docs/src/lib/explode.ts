/**
 * Exploded view
 *
 * The parts the landing's swap demo pulls apart, each with its kind from the
 * generated reference (never typed by hand) and the selector of the element
 * its fallback renders.
 */
import type { ComponentReference } from "@/lib/reference";

/** What the exploded view reads from a reference: its name and each slot's name and kind. */
export type SlotKindsSource = Pick<ComponentReference, "name"> & {
  slots: readonly Pick<ComponentReference["slots"][number], "name" | "kind">[];
};

/**
 * Where a part's floating label looks for room first (`lib/label-placement`
 * moves it on when that spot would cover text).
 *
 * `anchor` picks which of the part's elements it points at: the `first` one,
 * the `middle` one, or the last one on the first one's line (`row-end`: for
 * cells, the first row's last cell). `side` is the side of that element the
 * label sits on.
 */
export interface LabelHint {
  anchor: "first" | "middle" | "row-end";
  side: "above" | "below";
}

/** One labelled part of the exploded view. `dx`/`dy` are its offset in rem at `--explode: 1`, for a left-to-right page. */
export interface ExplodePart {
  slot: string;
  kind: "element" | "widget";
  selector: string;
  dx: number;
  dy: number;
  label: LabelHint;
}

/**
 * Where each landing part moves when the table explodes: the header and its
 * cells lift into layers above, body rows and cells settle into layers below,
 * the checkbox column slides toward the start side and pagination drops
 * underneath. Right-to-left pages negate `dx`.
 */
const OFFSETS: Record<string, { dx: number; dy: number }> = {
  HeaderRow: { dx: 0, dy: -3 },
  HeaderCell: { dx: 0, dy: -1 },
  SortIcon: { dx: 0.75, dy: -1.25 },
  Row: { dx: 0, dy: 1 },
  Cell: { dx: 0, dy: 0.5 },
  Checkbox: { dx: -3, dy: 0 },
  Pagination: { dx: 0, dy: 4 },
  PageSizeSelect: { dx: 1.5, dy: 1.25 },
};

/** A part without an offset of its own moves down one layer. */
const DEFAULT_OFFSET = { dx: 0, dy: 1 };

/**
 * Where each label looks first. The explosion opens a band between the header
 * and the first body row, a column on the start side where the checkboxes
 * went, and a band above the pagination: the labels of the header's parts
 * hang under the header, the body's stand on the first row, and the rest sit
 * in the band next to their part.
 */
const LABELS: Record<string, LabelHint> = {
  HeaderRow: { anchor: "first", side: "above" },
  HeaderCell: { anchor: "middle", side: "below" },
  SortIcon: { anchor: "middle", side: "below" },
  Row: { anchor: "first", side: "above" },
  Cell: { anchor: "row-end", side: "above" },
  Checkbox: { anchor: "first", side: "below" },
  FooterRow: { anchor: "first", side: "below" },
  Pagination: { anchor: "first", side: "above" },
  PageSizeSelect: { anchor: "first", side: "above" },
};

/** A part without a hint of its own: above its middle element. */
const DEFAULT_LABEL: LabelHint = { anchor: "middle", side: "above" };

/**
 * The parts to explode, in the order picked.
 *
 * @param reference - The component's generated reference; each part's kind comes from its slot there.
 * @param selectors - Slot name to the CSS selector of its fallback element (`SLOT_SELECTORS[slug]`).
 * @param pick - The slot names to show.
 * @throws When a picked slot is not in the reference or has no selector, naming the slot.
 */
export function explodeParts(reference: SlotKindsSource, selectors: Record<string, string>, pick: string[]): ExplodePart[] {
  return pick.map((name) => {
    const slot = reference.slots.find((candidate) => candidate.name === name);
    if (!slot) throw new Error(`Slot "${name}" is not in the ${reference.name} reference.`);
    const selector = selectors[name];
    if (!selector) throw new Error(`Slot "${name}" has no selector in SLOT_SELECTORS["${reference.name}"].`);
    const { dx, dy } = OFFSETS[name] ?? DEFAULT_OFFSET;
    return { slot: name, kind: slot.kind, selector, dx, dy, label: LABELS[name] ?? DEFAULT_LABEL };
  });
}

/**
 * The label a part wears: `<Row>` for an element part, `{Checkbox}` for a widget part.
 *
 * @param part - The part's slot name and kind.
 */
export function bracketLabel(part: Pick<ExplodePart, "slot" | "kind">): string {
  return part.kind === "element" ? `<${part.slot}>` : `{${part.slot}}`;
}

/**
 * Slots named with their kind, for labels outside the exploded view.
 *
 * @param reference - The component's generated reference; each kind comes from its slot there.
 * @param names - The slot names, in the order to show them.
 * @throws When a slot is not in the reference, naming the slot.
 */
export function slotKinds(reference: SlotKindsSource, names: string[]): Pick<ExplodePart, "slot" | "kind">[] {
  return names.map((name) => {
    const slot = reference.slots.find((candidate) => candidate.name === name);
    if (!slot) throw new Error(`Slot "${name}" is not in the ${reference.name} reference.`);
    return { slot: name, kind: slot.kind };
  });
}
