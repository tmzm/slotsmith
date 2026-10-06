import { describe, expect, it } from "vitest";
import { fetchPeople } from "@samples/shared/fake-api";
import { searchPackages } from "@samples/shared/fake-catalog";

const aborted = () => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
};

const abortError = expect.objectContaining({ name: "AbortError" });

describe("the sample fake APIs", () => {
  it("fetchPeople rejects with an AbortError when the signal is already aborted", async () => {
    await expect(fetchPeople({ pageIndex: 0, pageSize: 5, sorting: [] }, { signal: aborted() })).rejects.toEqual(abortError);
  });

  it("searchPackages rejects with an AbortError when the signal is already aborted", async () => {
    await expect(searchPackages("ui", 1, aborted())).rejects.toEqual(abortError);
  });

  it("fetchPeople rejects with an AbortError when the signal aborts mid-request", async () => {
    const controller = new AbortController();
    const request = fetchPeople({ pageIndex: 0, pageSize: 5, sorting: [] }, { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toEqual(abortError);
  });

  it("searchPackages answers a page when nothing aborts", async () => {
    const page = await searchPackages("ui", 1, new AbortController().signal, { latency: 0 });
    expect(page.data.length).toBeGreaterThan(0);
  });
});
