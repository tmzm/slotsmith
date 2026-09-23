import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { open, optionLabels, options, renderAutocomplete, searchBox, trigger } from "./builders";

describe("empty and loading", () => {
  it("says so when a search matches nothing", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("shows a loading row while there is nothing to show yet", async () => {
    const { user } = renderAutocomplete({ options: [], loading: true });
    await open(user);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
  });

  it("keeps showing options while a further page loads", async () => {
    const { user } = renderAutocomplete({ loading: true });
    await open(user);

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(options()).toHaveLength(10);
  });

  it("asks for more characters before searching", async () => {
    const { user } = renderAutocomplete({ options: [], minChars: 3 });
    await open(user);

    expect(screen.getByText("Type 3 or more characters to search")).toBeInTheDocument();
  });
});

describe("errors", () => {
  it("replaces the list, so a failure never reads as no results", async () => {
    const { user } = renderAutocomplete({ error: "Could not load brands" });
    await open(user);

    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);
    expect(screen.queryByText("No results")).not.toBeInTheDocument();
  });

  it("offers a retry when there is a way back", async () => {
    const onRetry = vi.fn();
    const { user } = renderAutocomplete({ error: "Network error", onRetry });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry when none was given", async () => {
    const { user } = renderAutocomplete({ error: "Network error" });
    await open(user);

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});

describe("creating", () => {
  it("offers to create what was searched for once nothing matches", async () => {
    const onCreate = vi.fn();
    const { user } = renderAutocomplete({ creatable: true, onCreate });
    await open(user);

    await user.type(searchBox(), "Vitra");
    await user.click(screen.getByRole("button", { name: /Create/ }));

    expect(onCreate).toHaveBeenCalledWith("Vitra");
  });

  it("stays quiet while options are still loading", async () => {
    const { user } = renderAutocomplete({ options: [], creatable: true, loading: true });
    await open(user);

    await user.type(searchBox(), "Vitra");

    expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("stays quiet while something still matches", async () => {
    const { user } = renderAutocomplete({ creatable: true });
    await open(user);

    await user.type(searchBox(), "Hay");

    expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("stays quiet after a failed fetch", async () => {
    const { user } = renderAutocomplete({ options: [], creatable: true, error: "Network error" });
    await open(user);

    await user.type(searchBox(), "Vitra");

    expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
  });

  it("creates on Enter when nothing is highlighted", async () => {
    const onCreate = vi.fn();
    const { user } = renderAutocomplete({ creatable: true, onCreate });
    await open(user);

    await user.type(searchBox(), "Vitra");
    await user.keyboard("{Enter}");

    expect(onCreate).toHaveBeenCalledWith("Vitra");
  });

  it("shows the in-flight label while creating", async () => {
    const { user } = renderAutocomplete({ creatable: true, createLoading: true });
    await open(user);

    await user.type(searchBox(), "Vitra");

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });
});

describe("paging", () => {
  it("offers a load-more control that works without a mouse", async () => {
    const onLoadMore = vi.fn();
    const { user } = renderAutocomplete({ hasMore: true, onLoadMore });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not ask again while a page is in flight", async () => {
    const onLoadMore = vi.fn();
    const { user } = renderAutocomplete({ hasMore: true, loadingMore: true, onLoadMore });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Loading…" }));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("hides the control when the last page has arrived", async () => {
    const { user } = renderAutocomplete({ hasMore: false });
    await open(user);

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("hides the control after a failure", async () => {
    const { user } = renderAutocomplete({ hasMore: true, error: "Network error" });
    await open(user);

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});

describe("filtering", () => {
  it("is case- and accent-insensitive", async () => {
    const { user } = renderAutocomplete();
    await open(user);

    await user.type(searchBox(), "boras");

    expect(optionLabels()).toEqual(["Boråstapeter"]);
  });

  it("filters nothing when the source already did", async () => {
    const { user } = renderAutocomplete({ filter: false });
    await open(user);

    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(10);
  });

  it("accepts a predicate of your own", async () => {
    const { user } = renderAutocomplete({
      filter: (brand, query) => brand.id === query,
    });
    await open(user);

    await user.type(searchBox(), "b8");

    expect(optionLabels()).toEqual(["Hay"]);
  });

  it("tells the caller what was typed, for remote sources", async () => {
    const onSearchChange = vi.fn();
    const { user } = renderAutocomplete({ onSearchChange });
    await open(user);

    await user.type(searchBox(), "ha");

    expect(onSearchChange).toHaveBeenLastCalledWith("ha");
  });
});

describe("labels", () => {
  it("translates every string it renders", async () => {
    const { user } = renderAutocomplete({
      options: [],
      labels: { placeholder: "اختر", search: "ابحث", empty: "لا توجد نتائج" },
    });

    expect(trigger()).toHaveTextContent("اختر");

    await open(user);
    expect(searchBox()).toHaveAttribute("placeholder", "ابحث");
    expect(screen.getByText("لا توجد نتائج")).toBeInTheDocument();
  });
});
