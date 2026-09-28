import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ar } from "../../locales/ar";
import { SlotsmithProvider } from "../../provider";
import { DataTable } from "../DataTable";
import type { PageSizeSelectSlotProps } from "../slots/types";
import { bodyRows, columns, renderTable, users, type User } from "./builders";

/** The page-size control, found the way assistive technology finds it. */
const pageSize = () => screen.getByRole("combobox", { name: "Rows per page" });

/**
 * Axe violations
 *
 * Runs axe over the rendered table. Colour contrast is left to the browser
 * check, because jsdom computes no styles.
 *
 * @param node - The element to audit.
 * @returns The rule ids that failed.
 */
async function violations(node: Element) {
  const result = await axe.run(node, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(" | ")}`);
}

describe("page-size control", () => {
  it("is the autocomplete, labelled by the rows-per-page label", () => {
    const { container } = renderTable({ data: users(30) });
    const trigger = pageSize();
    expect(container.querySelector(".rdt__page-size .sac")).toContainElement(trigger);
    expect(trigger).toHaveTextContent("10");
  });

  it("picks 50 and renders 50 rows", async () => {
    const onPaginationChange = vi.fn();
    const { user: events } = renderTable({ data: users(60), onPaginationChange });

    await events.click(pageSize());
    await events.click(screen.getByRole("option", { name: "50" }));

    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 0, pageSize: 50 });
    expect(bodyRows()).toHaveLength(50);
    expect(pageSize()).toHaveTextContent("50");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks from the keyboard and returns focus to the trigger", async () => {
    const { user: events } = renderTable({ data: users(30) });

    pageSize().focus();
    await events.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await events.keyboard("{ArrowDown}{Enter}");

    expect(bodyRows()).toHaveLength(25);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(pageSize()).toHaveFocus();

    await events.keyboard("{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(pageSize()).toHaveFocus();
  });

  it("is a plain pick-list: no search box and no clear control", async () => {
    const { user: events } = renderTable({ data: users(30) });

    expect(screen.queryByRole("button", { name: "Clear selection" })).not.toBeInTheDocument();
    await events.click(pageSize());
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("cannot be cleared to nothing", async () => {
    const onPaginationChange = vi.fn();
    const { user: events } = renderTable({ data: users(30), onPaginationChange });

    pageSize().focus();
    await events.keyboard("{Backspace}{Delete}");
    /** Picking the current size again keeps it rather than deselecting it. */
    await events.click(pageSize());
    await events.click(screen.getByRole("option", { name: "10" }));

    expect(pageSize()).toHaveTextContent("10");
    expect(bodyRows()).toHaveLength(10);
    for (const [state] of onPaginationChange.mock.calls) expect(state.pageSize).toBe(10);
  });

  it("follows the table's locale prop", async () => {
    const events = userEvent.setup();
    const { container } = render(
      <DataTable<User> data={users(30)} columns={columns} locale={ar} />,
    );

    await events.click(screen.getByRole("combobox", { name: "عدد الصفوف" }));
    const announcement = container.querySelector(".rdt__page-size [role=status]")!;
    expect(announcement.textContent).toMatch(/[؀-ۿ]/);
  });

  it("follows the provider's locale when the table has none", async () => {
    const events = userEvent.setup();
    const { container } = render(
      <SlotsmithProvider locale="ar" locales={[ar]}>
        <DataTable<User> data={users(30)} columns={columns} />
      </SlotsmithProvider>,
    );

    await events.click(screen.getByRole("combobox", { name: "عدد الصفوف" }));
    const announcement = container.querySelector(".rdt__page-size [role=status]")!;
    expect(announcement.textContent).toMatch(/[؀-ۿ]/);
  });

  it("is replaced entirely by a custom PageSizeSelect slot", async () => {
    const events = userEvent.setup();
    const Custom = ({ value, options, onValueChange, label }: PageSizeSelectSlotProps) => (
      <div data-testid="custom-size">
        {label}: {value}
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onValueChange(option)}>
            size {option}
          </button>
        ))}
      </div>
    );
    const { container } = render(
      <DataTable<User> data={users(30)} columns={columns} components={{ PageSizeSelect: Custom }} />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(container.querySelector(".sac")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-size")).toHaveTextContent("Rows per page: 10");
    await events.click(within(screen.getByTestId("custom-size")).getByRole("button", { name: "size 25" }));
    expect(bodyRows()).toHaveLength(25);
  });

  it("has no axe violations with pagination shown, closed or open", async () => {
    const { container, user: events } = renderTable({ data: users(30) });
    expect(await violations(container)).toEqual([]);

    await events.click(pageSize());
    expect(await violations(container)).toEqual([]);
  });
});
