import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsyncOptions, type OptionsPage } from "../core/useAsyncOptions";

interface Row {
  id: string;
  name: string;
}

/**
 * Deferred page
 *
 * A page whose resolution the test controls, so a second request can be made
 * while the first is still in flight.
 */
function deferredPage() {
  let settle!: (page: OptionsPage<Row>) => void;
  let fail!: (reason: Error) => void;
  const promise = new Promise<OptionsPage<Row>>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  return { promise, settle, fail };
}

const rows = (...names: string[]): Row[] => names.map((name) => ({ id: name, name }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Lets the debounce elapse and any resolved promises flush. */
const settle = async (ms = 300) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/**
 * Flush
 *
 * Runs the microtask queue inside `act`. The polling helper in Testing
 * Library waits on real timers, so with fake ones the resolved state has to
 * be flushed explicitly instead.
 */
const flush = () => settle(0);

/** The option names the hook is currently holding. */
const names = (options: Row[]) => options.map((row) => row.name);

describe("debouncing", () => {
  it("collapses a burst of typing into one request", async () => {
    const load = vi.fn(async () => ({ data: rows("Alpha") }));
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle(100);
    act(() => result.current.onSearchChange("al"));
    await settle(100);
    act(() => result.current.onSearchChange("alp"));
    await settle();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("alp", 1, expect.any(AbortSignal));
  });

  it("honours a custom wait", async () => {
    const load = vi.fn(async () => ({ data: [] }));
    const { result } = renderHook(() => useAsyncOptions<Row>({ load, debounce: 50 }));

    act(() => result.current.onSearchChange("a"));
    await settle(60);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("waits for minChars before asking at all", async () => {
    const load = vi.fn(async () => ({ data: [] }));
    const { result } = renderHook(() => useAsyncOptions<Row>({ load, minChars: 3 }));

    act(() => result.current.onSearchChange("ab"));
    await settle();
    expect(load).not.toHaveBeenCalled();

    act(() => result.current.onSearchChange("abc"));
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while disabled", async () => {
    const load = vi.fn(async () => ({ data: [] }));
    const { result } = renderHook(() => useAsyncOptions<Row>({ load, enabled: false }));

    act(() => result.current.onSearchChange("a"));
    await settle();

    expect(load).not.toHaveBeenCalled();
  });
});

describe("out-of-order responses", () => {
  it("aborts the older request when a newer one starts", async () => {
    const signals: AbortSignal[] = [];
    const first = deferredPage();
    const second = deferredPage();
    const pages = [first, second];
    const load = vi.fn(async (_query: string, _page: number, signal: AbortSignal) => {
      signals.push(signal);
      return pages[signals.length - 1]!.promise;
    });

    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();
    act(() => result.current.onSearchChange("b"));
    await settle();

    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });

  it("keeps the newest answer when a stale one arrives last", async () => {
    const first = deferredPage();
    const second = deferredPage();
    const pages = [first.promise, second.promise];
    let call = 0;
    const load = vi.fn(async () => pages[call++]!);

    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();
    act(() => result.current.onSearchChange("b"));
    await settle();

    await act(async () => {
      second.settle({ data: rows("Newest") });
      first.settle({ data: rows("Stale") });
      await Promise.resolve();
    });

    await flush();
    expect(names(result.current.options)).toEqual(["Newest"]);
  });
});

describe("paging", () => {
  it("appends the next page and stops when there is no cursor", async () => {
    const load = vi.fn(async (_query: string, page: number) =>
      page === 1 ? { data: rows("One"), nextPage: 2 } : { data: rows("Two") },
    );
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange(""));
    await settle();
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      result.current.onLoadMore();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flush();

    expect(names(result.current.options)).toEqual(["One", "Two"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("restarts from page one when the query changes", async () => {
    const load = vi.fn(async () => ({ data: rows("Only"), nextPage: 2 }));
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();
    await act(async () => {
      result.current.onLoadMore();
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => result.current.onSearchChange("b"));
    await settle();

    expect(load).toHaveBeenLastCalledWith("b", 1, expect.any(AbortSignal));
  });
});

describe("failures", () => {
  it("surfaces the message and clears the list", async () => {
    const load = vi.fn(async () => {
      throw new Error("Network down");
    });
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();

    await flush();
    expect(result.current.error).toBe("Network down");
    expect(result.current.options).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("retries the current query", async () => {
    let attempt = 0;
    const load = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("Network down");
      return { data: rows("Recovered") };
    });
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();
    await flush();
    expect(result.current.error).toBe("Network down");

    await act(async () => {
      result.current.onRetry();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flush();

    expect(names(result.current.options)).toEqual(["Recovered"]);
    expect(result.current.error).toBeUndefined();
  });

  it("ignores an abort, which is not a failure", async () => {
    const load = vi.fn(async (_query: string, _page: number, signal: AbortSignal) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return { data: [] };
    });
    const { result } = renderHook(() => useAsyncOptions<Row>({ load }));

    act(() => result.current.onSearchChange("a"));
    await settle();
    act(() => result.current.onSearchChange("b"));
    await settle(1400);

    expect(result.current.error).toBeUndefined();
  });
});

describe("unmounting", () => {
  it("aborts a request still in flight", async () => {
    let captured: AbortSignal | undefined;
    const pending = deferredPage();
    const load = vi.fn(async (_query: string, _page: number, signal: AbortSignal) => {
      captured = signal;
      return pending.promise;
    });

    const { result, unmount } = renderHook(() => useAsyncOptions<Row>({ load }));
    act(() => result.current.onSearchChange("a"));
    await settle();

    unmount();

    expect(captured?.aborted).toBe(true);
  });
});
