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

/** One labelled part of the exploded view. `dx`/`dy` are its offset in rem at `--explode: 1`, for a left-to-right page. */
export interface ExplodePart {
  slot: string;
  kind: "element" | "widget";
  selector: string;
  dx: number;
  dy: number;
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
    return { slot: name, kind: slot.kind, selector, dx, dy };
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
