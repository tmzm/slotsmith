/**
 * Row motion
 *
 * The DOM side of row reordering: transforms written straight onto the rows,
 * never through React state, because a pointer moves up to 60 times a second
 * and re-rendering a large table that often would stutter.
 */

/** How a row slides out of the way, and how every row glides into place on drop. */
export const ROW_TRANSITION = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";

/** How long a settle may take before its inline styles are removed anyway. */
export const SETTLE_TIMEOUT = 250;

/** A row's own inline `transform` and `transition`, from before a drag. */
export interface SavedStyle {
  transform: string;
  transition: string;
}

/** The rows the engine has written a transform on, so it clears only its own. */
const moved = new WeakSet<HTMLElement>();

const translate = (y: number) => `translate3d(0, ${y}px, 0)`;

/**
 * Prefers reduced motion
 *
 * @returns Whether the user asked for less motion. `false` where `matchMedia`
 *   does not exist (server rendering, older test environments).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Rows in
 *
 * @param parent - The element holding the rows (a `<tbody>`).
 * @returns Its direct children that carry `data-row-id`, in document order.
 */
export function rowsIn(parent: Element): HTMLElement[] {
  return Array.from(parent.querySelectorAll<HTMLElement>(":scope > [data-row-id]"));
}

const idOf = (row: HTMLElement) => row.getAttribute("data-row-id") ?? "";

/**
 * Save styles
 *
 * @param parent - The element holding the rows.
 * @returns Each row's own inline `transform` and `transition`, by row id.
 */
export function saveStyles(parent: Element): Map<string, SavedStyle> {
  const saved = new Map<string, SavedStyle>();
  for (const row of rowsIn(parent)) {
    saved.set(idOf(row), { transform: row.style.transform, transition: row.style.transition });
  }
  return saved;
}

/**
 * Restore styles
 *
 * Removes everything the engine wrote and puts back what each row had.
 *
 * @param parent - The element holding the rows.
 * @param saved - What {@link saveStyles} returned.
 */
export function restoreStyles(parent: Element, saved: ReadonlyMap<string, SavedStyle>): void {
  for (const row of rowsIn(parent)) {
    const own = saved.get(idOf(row));
    row.style.transform = own?.transform ?? "";
    row.style.transition = own?.transition ?? "";
    moved.delete(row);
  }
}

/**
 * Apply offsets
 *
 * Draws each row at its offset from its resting place. Rows other than the
 * dragged one slide there; the dragged row jumps (it follows the pointer), or
 * slides too when `animate` is set (a keyboard drag, which moves in steps).
 * Rows missing from `offsets` slide back to rest. A value that is already set
 * is not written again, so a pointer move touches only the dragged row until
 * the target changes.
 *
 * @param parent - The element holding the rows.
 * @param offsets - Vertical offsets in pixels, by row id.
 * @param draggingId - The row being moved.
 * @param animate - Whether the dragged row slides too.
 */
export function applyOffsets(
  parent: Element,
  offsets: ReadonlyMap<string, number>,
  draggingId: string,
  animate: boolean,
): void {
  for (const row of rowsIn(parent)) {
    const id = idOf(row);
    const offset = offsets.get(id);
    const transition = id === draggingId && !animate ? "none" : ROW_TRANSITION;

    if (offset === undefined) {
      if (!moved.has(row)) continue;
      moved.delete(row);
      if (row.style.transition !== transition) row.style.transition = transition;
      row.style.transform = "";
      continue;
    }

    const transform = translate(offset);
    moved.add(row);
    if (row.style.transition !== transition) row.style.transition = transition;
    if (row.style.transform !== transform) row.style.transform = transform;
  }
}

/**
 * Drawn tops
 *
 * @param parent - The element holding the rows.
 * @returns Where each row is drawn right now, transforms included, by row id.
 */
export function drawnTops(parent: Element): Map<string, number> {
  const tops = new Map<string, number>();
  for (const row of rowsIn(parent)) tops.set(idOf(row), row.getBoundingClientRect().top);
  return tops;
}

/**
 * Settle
 *
 * The drop animation, run once React has rendered the result. Each row is
 * drawn back where it was (`before`) without a transition, then released so
 * it glides to its new resting place. Runs on cancel too, so the rows slide
 * back instead of jumping. The inline transition is removed on
 * `transitionend`, or after {@link SETTLE_TIMEOUT} when that never fires.
 *
 * @param parent - The element holding the rows.
 * @param before - Where each row was drawn just before the drop, by row id.
 * @param saved - The rows' own inline styles, put back at the end.
 * @returns A function that ends the animation at once.
 */
export function settle(
  parent: Element,
  before: ReadonlyMap<string, number>,
  saved: ReadonlyMap<string, SavedStyle>,
): () => void {
  const gliding: HTMLElement[] = [];

  for (const row of rowsIn(parent)) {
    const from = before.get(idOf(row));
    if (from === undefined) continue;
    const delta = from - row.getBoundingClientRect().top;
    if (Math.abs(delta) < 0.5) continue;
    row.style.transition = "none";
    row.style.transform = translate(delta);
    gliding.push(row);
  }
  if (gliding.length === 0) return () => {};

  // Commit the start position, or the browser would skip straight to the end.
  void (parent as HTMLElement).offsetHeight;

  const finish = (row: HTMLElement) => {
    row.removeEventListener("transitionend", onEnd);
    row.style.transition = saved.get(idOf(row))?.transition ?? "";
  };
  function onEnd(event: Event) {
    const row = event.currentTarget as HTMLElement;
    if (event.target !== row || (event as TransitionEvent).propertyName !== "transform") return;
    finish(row);
  }

  for (const row of gliding) {
    row.style.transition = ROW_TRANSITION;
    row.style.transform = saved.get(idOf(row))?.transform ?? "";
    row.addEventListener("transitionend", onEnd);
  }

  const timer = setTimeout(() => gliding.forEach(finish), SETTLE_TIMEOUT);
  return () => {
    clearTimeout(timer);
    for (const row of gliding) {
      finish(row);
      row.style.transform = saved.get(idOf(row))?.transform ?? "";
    }
  };
}

/**
 * Scroll area
 *
 * @param from - An element inside the table.
 * @returns The nearest ancestor that scrolls vertically, or `null` for the window.
 */
export function scrollAreaOf(from: Element): HTMLElement | null {
  for (let node = from.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}
