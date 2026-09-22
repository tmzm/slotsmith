import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bodyRows, renderTable, users } from "./builders";

describe("loading, error and empty states", () => {
  it("shows one skeleton row per page-size row and marks the table busy", () => {
    const { container } = renderTable({ loading: true, defaultPagination: { pageIndex: 0, pageSize: 5 } });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(container.querySelectorAll(".rdt__skeleton")).toHaveLength(5 * 2);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });

  it("counts the checkbox column in skeleton rows", () => {
    const { container } = renderTable({
      loading: true,
      enableRowSelection: true,
      defaultPagination: { pageIndex: 0, pageSize: 1 },
    });
    expect(container.querySelectorAll(".rdt__skeleton")).toHaveLength(3);
  });

  it("shows the empty message spanning every column", () => {
    renderTable({ data: [], enableRowSelection: true });
    const cell = within(bodyRows()[0]!).getByRole("cell");
    expect(cell).toHaveTextContent("No data found");
    expect(cell).toHaveAttribute("colspan", "3");
  });

  it("shows the error with a retry button", async () => {
    const onRetry = vi.fn();
    const { user: events } = renderTable({ data: users(3), error: new Error("boom"), onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await events.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("prefers loading over error", () => {
    renderTable({ loading: true, error: new Error("boom") });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("translates every label", () => {
    renderTable({
      data: [],
      labels: {
        empty: "لا توجد بيانات",
        rowsPerPage: "عدد الصفوف",
        pageInfo: (page, count) => `${page} / ${count}`,
        nextPage: "التالي",
      },
    });
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument();
    expect(screen.getByLabelText("عدد الصفوف")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "التالي" })).toBeInTheDocument();
  });
});
