/** What the uploader hands an `upload` function, as far as this stand-in reads it. */
export interface FakeUploadContext {
  signal: AbortSignal;
  onProgress(percent: number): void;
}

/** Five steps of 200 ms: the whole upload takes one second. */
const STEPS = 5;
const STEP_MS = 200;

/** Waits `ms`, and rejects with an `AbortError` as soon as the signal aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("The upload was cancelled.", "AbortError"));
    };
    if (signal.aborted) return abort();
    timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/**
 * A stand-in for an upload endpoint. Nothing leaves the browser: it reports
 * progress in five steps over one second, stops as soon as `signal` aborts,
 * and resolves with `/samples/uploaded/<name>`. With `fail`, it fails at 60%
 * the way a server error would, so the retry path can be tried.
 */
export async function fakeUpload(
  file: File,
  { signal, onProgress }: FakeUploadContext,
  { fail = false }: { fail?: boolean } = {},
): Promise<{ url: string }> {
  for (let step = 1; step <= STEPS; step += 1) {
    await wait(STEP_MS, signal);
    if (fail && step === 3) throw new Error("The server answered 503. Try again.");
    onProgress((step / STEPS) * 100);
  }
  return { url: `/samples/uploaded/${encodeURIComponent(file.name)}` };
}
