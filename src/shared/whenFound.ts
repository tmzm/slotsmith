/**
 * When found
 *
 * Runs `act` on the element `find` returns. A popup a UI library renders in
 * its own portal can mount a frame or two after the component asks for it,
 * so a miss is retried on the next frames before giving up.
 *
 * @param find - Looks the element up.
 * @param act - What to do with it.
 * @param frames - How many frames to keep looking. Defaults to 10.
 * @returns A function that stops looking.
 */
export function whenFound<T>(find: () => T | null | undefined, act: (found: T) => void, frames = 10): () => void {
  let handle = 0;
  const attempt = (left: number) => {
    handle = 0;
    const found = find();
    if (found) act(found);
    else if (left > 0 && typeof requestAnimationFrame !== "undefined") handle = requestAnimationFrame(() => attempt(left - 1));
  };
  attempt(frames);
  return () => {
    if (handle) cancelAnimationFrame(handle);
  };
}
