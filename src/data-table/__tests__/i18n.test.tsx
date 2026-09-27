import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotsmithProvider, defineLocale } from "../../locale";
import { DataTable } from "../DataTable";
import { defaultLabels } from "../slots/fallbacks";

const columns = [{ accessorKey: "name", header: "Name" }];
const nl = defineLocale({ code: "nl", table: { ...defaultLabels, empty: "Geen gegevens", retry: "Opnieuw" } });

describe("data table locale", () => {
  it("renders English with no locale", () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText("No data found")).toBeInTheDocument();
  });
  it("takes a locale object", () => {
    render(<DataTable data={[]} columns={columns} locale={nl} />);
    expect(screen.getByText("Geen gegevens")).toBeInTheDocument();
  });
  it("reads the provider's locale", () => {
    render(<SlotsmithProvider locale="nl-BE" locales={[nl]}><DataTable data={[]} columns={columns} /></SlotsmithProvider>);
    expect(screen.getByText("Geen gegevens")).toBeInTheDocument();
  });
  it("lets the labels prop win over the locale", () => {
    render(<DataTable data={[]} columns={columns} locale={nl} labels={{ empty: "Leeg" }} />);
    expect(screen.getByText("Leeg")).toBeInTheDocument();
  });
  it("falls back to English for a key the locale lacks", () => {
    const { retry: _retry, ...rest } = nl.table as typeof defaultLabels;
    const old = { ...nl, table: rest } as unknown as typeof nl;
    render(<DataTable data={[]} columns={columns} locale={old} error={new Error("x")} onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
  it("stays English and warns once when a tag has no pack", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<DataTable data={[]} columns={columns} locale="de" />);
    expect(screen.getByText("No data found")).toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
