// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Footers from "@samples/data-table/footers";
import Pagination from "@samples/data-table/pagination";
import ServerData from "@samples/data-table/server-data";
import SortingAndSelection from "@samples/data-table/sorting-and-selection";
import * as api from "@samples/shared/fake-api";

// The server data sample imports the API as `../shared/fake-api`: the same file, so this spy sees its calls.
vi.mock("@samples/shared/fake-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@samples/shared/fake-api")>();
  return { ...actual, fetchPeople: vi.fn(actual.fetchPeople) };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(api.fetchPeople).mockClear();
});

describe("data-table guide: sorting and selection", () => {
  it("sorts a column ascending when its header button is clicked", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<SortingAndSelection />);
    const header = within(container.querySelector("thead")!).getByRole("button", { name: "Name" });
    const cell = header.closest("th")!;
    expect(cell.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(header);
    expect(cell.getAttribute("aria-sort")).toBe("ascending");
    expect(error).not.toHaveBeenCalled();
  });

  it("cycles a header through ascending, descending and unsorted", () => {
    const { container } = render(<SortingAndSelection />);
    const header = within(container.querySelector("thead")!).getByRole("button", { name: "Role" });
    const cell = header.closest("th")!;
    const orders = [1, 2, 3].map(() => {
      fireEvent.click(header);
      return cell.getAttribute("aria-sort");
    });
    expect(orders).toEqual(["ascending", "descending", "none"]);
  });

  it("adds a second column to the sort on shift-click", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<SortingAndSelection />);
    const head = within(container.querySelector("thead")!);
    fireEvent.click(head.getByRole("button", { name: "Team" }));
    fireEvent.click(head.getByRole("button", { name: "Name" }), { shiftKey: true });
    expect(screen.getByText("Sorted by: team ascending, name ascending")).toBeTruthy();
    expect(head.getByRole("button", { name: "Team" }).closest("th")!.getAttribute("aria-sort")).toBe("ascending");
    expect(head.getByRole("button", { name: "Name" }).closest("th")!.getAttribute("aria-sort")).toBe("ascending");
    // Rows sort by team first, then by name within a team.
    const rows = [...container.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("td")].map((td) => td.textContent));
    const keys = rows.map((cells) => `${cells[3]}|${cells[1]}`);
    expect(keys).toEqual([...keys].sort());
    // A plain click replaces the sort with that one column.
    fireEvent.click(head.getByRole("button", { name: "Name" }));
    expect(screen.getByText("Sorted by: name descending")).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps the rows its rule excludes from being selected", () => {
    const { container } = render(<SortingAndSelection />);
    const disabled = [...container.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')].filter((box) => box.disabled);
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("reports the selected rows below the table", () => {
    const { container } = render(<SortingAndSelection />);
    const first = container.querySelector<HTMLInputElement>('tbody input[type="checkbox"]:not(:disabled)')!;
    fireEvent.click(first);
    expect(screen.getByText(/^Selected: /)).toBeTruthy();
  });
});

describe("data-table guide: pagination", () => {
  it("moves the page info when the next-page button is clicked", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<Pagination />);
    const info = () => container.querySelector('[aria-live="polite"]')?.textContent;
    expect(info()).toBe("Page 1 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(info()).toBe("Page 2 of 3");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: footers", () => {
  it("renders a tfoot row with the total", () => {
    const error = vi.spyOn(console, "error");
    const { container } = render(<Footers />);
    const row = container.querySelector("tfoot tr");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("Total");
    expect(row!.textContent).toContain("$1,240.00");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("data-table guide: fake API", () => {
  const firstPage = { pageIndex: 0, pageSize: 5, sorting: [] };

  it("answers one page and the total after 300 ms, the same every time", async () => {
    vi.useFakeTimers();
    let page: api.PeoplePage | undefined;
    void api.fetchPeople(firstPage).then((result) => (page = result));
    await vi.advanceTimersByTimeAsync(299);
    expect(page).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(page!.total).toBe(48);
    expect(page!.rows.map((person) => person.name)).toEqual(["Lena Park", "Lena Haddad", "Lena Reyes", "Lena Tanaka", "Lena Nasser"]);
    const again = api.fetchPeople(firstPage);
    await vi.advanceTimersByTimeAsync(300);
    expect(await again).toEqual(page);
  });

  it("sorts every row before it cuts the page", async () => {
    vi.useFakeTimers();
    const request = api.fetchPeople({ pageIndex: 1, pageSize: 3, sorting: [{ id: "name", desc: true }] });
    await vi.advanceTimersByTimeAsync(300);
    expect((await request).rows.map((person) => person.name)).toEqual(["Yuki Nasser", "Yuki Martin", "Yuki Haddad"]);
  });

  it("stops when its signal aborts", async () => {
    const controller = new AbortController();
    const request = api.fetchPeople(firstPage, { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("data-table guide: server data", () => {
  /** Lets the fake API's 300 ms pass, and the query deliver its answer. */
  const answer = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.advanceTimersByTimeAsync(1);
    });
  const names = (container: HTMLElement) =>
    [...container.querySelectorAll('tbody tr:not([data-state="loading"]) td:first-child')].map((cell) => cell.textContent);
  const root = (container: HTMLElement) => container.querySelector("[data-status]")!;
  const pageInfo = (container: HTMLElement) => container.querySelector('[aria-live="polite"]')?.textContent;

  it("renders the loading status, then rows after the fake API resolves", async () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, "error");
    const { container } = render(<ServerData />);
    expect(root(container).getAttribute("data-status")).toBe("loading");
    expect(root(container).getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll('tbody tr[data-state="loading"]')).toHaveLength(5);
    expect(names(container)).toEqual([]);

    await answer();
    expect(root(container).getAttribute("data-status")).toBe("ready");
    expect(root(container).hasAttribute("aria-busy")).toBe(false);
    expect(names(container)).toEqual(["Lena Park", "Lena Haddad", "Lena Reyes", "Lena Tanaka", "Lena Nasser"]);
    // 48 rows on the server, five a page.
    expect(pageInfo(container)).toBe("Page 1 of 10");
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps the previous rows while the next page loads", async () => {
    vi.useFakeTimers();
    const { container } = render(<ServerData />);
    await answer();
    const firstPage = names(container);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(vi.mocked(api.fetchPeople).mock.lastCall![0]).toEqual({ pageIndex: 1, pageSize: 5, sorting: [] });
    // No skeleton rows: the first page stays until the second arrives.
    expect(root(container).getAttribute("data-status")).toBe("ready");
    expect(names(container)).toEqual(firstPage);
    expect(pageInfo(container)).toBe("Page 2 of 10");
    // The old rows are only a placeholder: the root says the table is busy.
    expect(root(container).getAttribute("aria-busy")).toBe("true");

    await answer();
    expect(names(container)).toEqual(["Lena Martin", "Omar Park", "Omar Haddad", "Omar Reyes", "Omar Tanaka"]);
    expect(root(container).hasAttribute("aria-busy")).toBe(false);
  });

  it("requests the server order when a header is clicked, from the first page", async () => {
    vi.useFakeTimers();
    const { container } = render(<ServerData />);
    await answer();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await answer();

    const header = within(container.querySelector("thead")!).getByRole("button", { name: "Name" });
    fireEvent.click(header);
    expect(header.closest("th")!.getAttribute("aria-sort")).toBe("ascending");
    expect(vi.mocked(api.fetchPeople).mock.lastCall![0]).toEqual({ pageIndex: 0, pageSize: 5, sorting: [{ id: "name", desc: false }] });

    await answer();
    // The table does not sort these itself: this is the order the server answered in.
    expect(names(container)).toEqual(["Amir Haddad", "Amir Martin", "Amir Nasser", "Amir Park", "Amir Reyes"]);
    expect(pageInfo(container)).toBe("Page 1 of 10");
  });

  it("shows the error with a retry button, and requests the page again on retry", async () => {
    vi.useFakeTimers();
    const { container } = render(<ServerData />);
    await answer();
    const failing = screen.getByRole("checkbox", { name: "Fail the next requests" });
    fireEvent.click(failing);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await answer();
    expect(root(container).getAttribute("data-status")).toBe("error");
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.click(failing);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    // The query reports the refetch on its next tick.
    await act(() => vi.advanceTimersByTimeAsync(1));
    // The error gives way to the last rows the server answered with, until the page arrives.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(names(container)[0]).toBe("Lena Park");
    await answer();
    expect(root(container).getAttribute("data-status")).toBe("ready");
    expect(names(container)[0]).toBe("Lena Martin");
    expect(pageInfo(container)).toBe("Page 2 of 10");
  });
});
