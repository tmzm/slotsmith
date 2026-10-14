/**
 * Swap demo parts
 *
 * The parts the landing's swap demo labels when "Show parts" is on, how far
 * each one moves, and how each one is found in the rendered table.
 *
 * The fallbacks' class names cannot find them: a design system's slot
 * component renders its own markup. So each part is found by what every
 * variant renders whatever its components: the table's own elements (`thead`,
 * `tbody`, `tr`, `th`, `td`), the `aria-sort` the library puts on every
 * sortable header cell, the `data-slot="select"` it puts on the selection
 * cells, and the controls the pagination widget renders outside the table.
 */
import type { ExplodePart } from "@/lib/explode";

/** The labelled parts, in the order the legend lists them. */
export const SWAP_PICKS = ["HeaderRow", "HeaderCell", "SortTrigger", "Row", "Cell", "Checkbox", "Pagination", "PageSizeSelect"];

/**
 * Where each part moves with the parts shown, in rem. Only the body rows and
 * the pagination move, and only down: the band that opens under the header
 * holds the labels of the header's parts and the first row's, and the band
 * above the pagination holds the pagination's. Nothing moves up or sideways,
 * so the table never leaves its place and only the room below it grows.
 */
export const SWAP_OFFSETS: Record<string, { dx: number; dy: number }> = {
  HeaderRow: { dx: 0, dy: 0 },
  HeaderCell: { dx: 0, dy: 0 },
  SortTrigger: { dx: 0, dy: 0 },
  Row: { dx: 0, dy: 5 },
  Cell: { dx: 0, dy: 0 },
  Checkbox: { dx: 0, dy: 0 },
  Pagination: { dx: 0, dy: 7.5 },
  PageSizeSelect: { dx: 0, dy: 0 },
};

/** The pagination's controls: everything a reader can operate outside the table. */
const CONTROLS = "button, select, input, [role='combobox'], [role='radio'], [role='button']";

/** The deepest element that contains every one of `elements`. */
function commonAncestor(elements: Element[]): HTMLElement | undefined {
  let node: Element | null = elements[0] ?? null;
  while (node && !elements.every((element) => node!.contains(element))) node = node.parentElement;
  return node instanceof HTMLElement ? node : undefined;
}

/** The pagination widget's root: the deepest element around its controls that is not around the table. */
function pagination(stage: HTMLElement): HTMLElement | undefined {
  const table = stage.querySelector("table");
  if (!table) return undefined;
  const controls = [...stage.querySelectorAll(CONTROLS)].filter((element) => !table.contains(element));
  const root = commonAncestor(controls);
  return root && !root.contains(table) ? root : undefined;
}

/** The page-size control inside the pagination: a select or combobox, or the group of radios a segmented control renders. */
function pageSize(stage: HTMLElement): HTMLElement | undefined {
  const root = pagination(stage);
  if (!root) return undefined;
  const select = root.querySelector<HTMLElement>("select, [role='combobox']");
  if (select) return select;
  const radios = [...root.querySelectorAll("input[type='radio'], [role='radio']")];
  return radios.length > 1 ? commonAncestor(radios) : undefined;
}

/** Element children only, for the cells that hold a widget. */
const firstChild = (elements: Iterable<Element>) => [...elements].flatMap((element) => (element.firstElementChild instanceof HTMLElement ? [element.firstElementChild] : []));

/**
 * The elements of one part in a rendered swap table, in document order.
 *
 * @param stage - The element around the table.
 * @param part - The part, by its slot name.
 * @returns The part's elements; none when the table does not render it.
 */
export function locateSwapPart(stage: HTMLElement, part: Pick<ExplodePart, "slot">): HTMLElement[] {
  const all = (selector: string) => [...stage.querySelectorAll<HTMLElement>(selector)];
  switch (part.slot) {
    case "HeaderRow":
      return all("thead tr");
    case "HeaderCell":
      return all("thead th[aria-sort]");
    case "SortTrigger":
      return firstChild(all("thead th[aria-sort]"));
    case "Row":
      return all("tbody tr");
    case "Cell":
      return all("tbody td:not([data-slot='select'], [data-slot='drag'])");
    case "Checkbox":
      return firstChild(all("[data-slot='select']"));
    case "Pagination": {
      const root = pagination(stage);
      return root ? [root] : [];
    }
    case "PageSizeSelect": {
      const control = pageSize(stage);
      return control ? [control] : [];
    }
    default:
      return [];
  }
}
