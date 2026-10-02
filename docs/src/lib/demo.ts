/** Helpers for the Demo panel: its tab keys and its element ids. */

/**
 * The tab a key moves to in a tab row, following the arrows' visual direction.
 *
 * @param current - The focused tab's index.
 * @param count - How many tabs there are.
 * @param key - The `KeyboardEvent.key`.
 * @param dir - The tab row's direction; in `rtl` the next tab is on the left.
 * @returns The new index, wrapping at both ends, or `undefined` for other keys.
 */
export function nextTabIndex(current: number, count: number, key: string, dir: "ltr" | "rtl"): number | undefined {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key !== "ArrowRight" && key !== "ArrowLeft") return undefined;
  const forward = (key === "ArrowRight") === (dir === "ltr");
  return (current + (forward ? 1 : count - 1)) % count;
}

const counts = new WeakMap<Request, number>();

/**
 * A unique id for one Demo on a page. Counted per page request, so two demos
 * of the same sample differ and each build gives the same ids.
 *
 * @param request - `Astro.request` of the page being rendered.
 * @param name - The sample's name.
 */
export function demoId(request: Request, name: string): string {
  const count = (counts.get(request) ?? 0) + 1;
  counts.set(request, count);
  return `demo-${name.replace(/[^\w-]/g, "-")}-${count}`;
}

/**
 * The files a sample imports from `samples/shared/` (`../shared/`, or `../../shared/` from a nested sample), in import order.
 *
 * @param code - The sample's source.
 * @returns The file names without extension (`people` for `../shared/people`).
 */
export function sharedImports(code: string): string[] {
  const found = [...code.matchAll(/from\s+["'](?:\.\.\/)+shared\/([\w-]+)["']/g)].map((match) => match[1]!);
  return [...new Set(found)];
}
