/**
 * Landing motion (docs/DESIGN.md section 7)
 *
 * TODO(gsap): plan 02 Task 6 fills this module once `gsap` is installed (the
 * download is deferred to the end of the run; see docs/LAUNCH-REPORT.md,
 * "Deferred"). Until then nothing imports it and the landing runs in its
 * static state, which is complete on its own.
 *
 * The contract the swap section already honours:
 * - Load with `import()` after `load`, and only when `prefers-reduced-motion`
 *   is not `reduce`. GSAP (with ScrollTrigger) is imported here and nowhere else.
 * - `[data-motion="swap"]` is the section to pin.
 * - Take over by removing `data-static` from its `.explode` element (the
 *   static figure hides, the demo box makes room for the parts), then drive
 *   `--explode` on that element from 0 to 1 and back. CSS computes every
 *   transform and label opacity from it (`styles/explode.css`); animate
 *   nothing else. If anything fails, put `data-static` back.
 * - The swap island fires `swap:before` and `swap:after` (`CustomEvent`,
 *   `detail: { from, to }` / `{ to }`) on its `.swap` root around each switch:
 *   play a short explode, swap, reassemble (700ms at most in all).
 * - Directional motion mirrors under `dir="rtl"` (ExplodedView already
 *   negates `--dx` there).
 */

/** Starts the landing choreography. A no-op until the GSAP work lands. */
export async function startLandingMotion(): Promise<void> {}
