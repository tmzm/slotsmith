import type { OptionsPage } from "slotsmith/autocomplete";

/** One package of the made-up registry the remote options guide searches. */
export type Pkg = { id: string; name: string; group: string; downloads: number };

const SCOPES = ["core", "ui", "forms", "data", "router", "motion", "intl", "icons", "charts", "auth", "query", "testing"];
const SUFFIXES = ["kit", "primitives", "hooks", "engine", "runtime", "adapter", "preset", "bridge", "stream", "schema", "store", "devtools"];

/** 144 packages, built from their position so every load returns the same ones. */
export const PACKAGES: Pkg[] = SCOPES.flatMap((scope, scopeIndex) =>
  SUFFIXES.map((suffix, suffixIndex) => ({
    id: `${scope}-${suffix}`,
    name: `@acme/${scope}-${suffix}`,
    group: scope,
    downloads: 1200 + scopeIndex * 977 + suffixIndex * 313,
  })),
);

const PAGE_SIZE = 12;

/** Waits `ms`, and rejects with an `AbortError` as soon as the signal aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancelled = () => new DOMException("The request was cancelled.", "AbortError");
    if (signal.aborted) return reject(cancelled());
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(cancelled());
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

/**
 * A stand-in for a paged search endpoint: it matches names containing the
 * query, answers one page of 12 after `latency` milliseconds (250 by
 * default), and stops as soon as `signal` aborts. `nextPage` is set while
 * more matches exist.
 */
export async function searchPackages(
  query: string,
  page: number,
  signal: AbortSignal,
  { latency = 250 }: { latency?: number } = {},
): Promise<OptionsPage<Pkg>> {
  await wait(latency, signal);
  const needle = query.trim().toLowerCase();
  const matches = needle ? PACKAGES.filter((pkg) => pkg.name.includes(needle)) : PACKAGES;
  const end = page * PAGE_SIZE;
  return { data: matches.slice(end - PAGE_SIZE, end), nextPage: end < matches.length ? page + 1 : undefined };
}

/** `12400` → `12.4k`. */
export const formatDownloads = (downloads: number) => (downloads >= 1000 ? `${(downloads / 1000).toFixed(1)}k` : String(downloads));
