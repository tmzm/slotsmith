// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ar } from "slotsmith/locales/ar";
import { fa } from "slotsmith/locales/fa";
import { he } from "slotsmith/locales/he";
import { SlotsmithProvider } from "slotsmith/provider";
import { PACKS } from "@/lib/packs";
import Languages from "../landing/languages";
import CustomPack from "../languages/custom-pack";
import Plurals from "../languages/plurals";
import Precedence from "../languages/precedence";
import Switcher from "../languages/switcher";

afterEach(cleanup);

/** The element the sample sets `dir` on: the one around the table. */
const wrapper = (container: HTMLElement) => container.querySelector(".sdt")!.closest("[dir]")!;

/** A pack's "rows per page" label; a pack's section is its labels or a function of the tag. */
function rowsPerPage(pack: typeof ar): string {
  const table = typeof pack.table === "function" ? pack.table(pack.code) : pack.table;
  return String(table!.rowsPerPage);
}

describe("landing/languages", () => {
  it("starts in English, left to right", () => {
    const { container } = render(<Languages />);
    expect(wrapper(container).getAttribute("dir")).toBe("ltr");
    expect(container.textContent).toContain("Rows per page");
    expect(screen.getAllByRole("row")).toHaveLength(1 + 5);
  });

  it("switches to Arabic: right to left, with the Arabic pack's labels", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(wrapper(container).getAttribute("dir")).toBe("rtl");
    expect(container.textContent).toContain(rowsPerPage(ar));
    expect(screen.getByRole("button", { name: "العربية" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to Persian: still right to left, with the Persian labels", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    fireEvent.click(screen.getByRole("button", { name: "فارسی" }));
    expect(wrapper(container).getAttribute("dir")).toBe("rtl");
    expect(container.textContent).toContain(rowsPerPage(fa));
    expect(container.textContent).not.toContain(rowsPerPage(ar));
  });

  it("names the toggle in the page's language", () => {
    render(<Languages />);
    expect(screen.getByRole("group", { name: "Language" })).toBeTruthy();
    cleanup();
    render(
      <SlotsmithProvider locale="ar" locales={[ar]}>
        <Languages />
      </SlotsmithProvider>,
    );
    expect(screen.getByRole("group", { name: "اللغة" })).toBeTruthy();
    cleanup();
    render(
      <SlotsmithProvider locale="fa" locales={[fa]}>
        <Languages />
      </SlotsmithProvider>,
    );
    expect(screen.getByRole("group", { name: "زبان" })).toBeTruthy();
  });

  it("switches back to English", () => {
    const { container } = render(<Languages />);
    fireEvent.click(screen.getByRole("button", { name: "فارسی" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(wrapper(container).getAttribute("dir")).toBe("ltr");
    expect(container.textContent).toContain("Rows per page");
  });
});

// The /languages/ page's live samples.

/** The element the switcher sets `dir` and `lang` on. */
const stage = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-stage]")!;

describe("languages/switcher", () => {
  it("offers English and every shipped pack, each named in its own language", () => {
    render(<Switcher />);
    const buttons = screen.getAllByRole("button", { pressed: false }).concat(screen.getAllByRole("button", { pressed: true }));
    const langs = buttons.map((button) => button.getAttribute("lang")).filter(Boolean);
    expect([...langs].sort()).toEqual(["en", ...PACKS.map((pack) => pack.code)].sort());
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("flips the direction per pack and shows the pack's labels", () => {
    const { container } = render(<Switcher />);
    expect(stage(container).getAttribute("dir")).toBe("ltr");
    fireEvent.click(container.querySelector('button[lang="ar"]')!);
    expect(stage(container).getAttribute("dir")).toBe("rtl");
    expect(stage(container).getAttribute("lang")).toBe("ar");
    expect(container.textContent).toContain(rowsPerPage(ar));
    fireEvent.click(container.querySelector('button[lang="de"]')!);
    expect(stage(container).getAttribute("dir")).toBe("ltr");
    fireEvent.click(container.querySelector('button[lang="he"]')!);
    expect(stage(container).getAttribute("dir")).toBe("rtl");
    expect(container.textContent).toContain(rowsPerPage(he));
  });

  it("offers the same languages in a native menu, which switches the stage too", () => {
    const { container } = render(<Switcher />);
    const select = screen.getByRole("combobox", { name: "Language of the demo" }) as HTMLSelectElement;
    const options = [...select.options];
    expect(options.map((option) => option.getAttribute("lang")).sort()).toEqual(["en", ...PACKS.map((pack) => pack.code)].sort());
    expect(options.find((option) => option.lang === "ar")!.textContent).toBe("العربية");
    fireEvent.change(select, { target: { value: "ar" } });
    expect(stage(container).getAttribute("dir")).toBe("rtl");
    expect(container.querySelector('button[lang="ar"]')!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector('button[lang="de"]')!);
    expect(select.value).toBe("de");
  });
});

describe("languages/plurals", () => {
  /** The sentence for each count, with its digits taken out, so only the words are compared. */
  function forms(language: string, counts: number[]): string[] {
    const { container } = render(<Plurals />);
    fireEvent.click(container.querySelector(`button[lang="${language}"]`)!);
    const words = counts.map((count) => {
      fireEvent.click(screen.getByRole("button", { name: String(count) }));
      return container.querySelector("output")!.textContent!.replace(/[\d٠-٩۰-۹]/g, "").trim();
    });
    cleanup();
    return words;
  }

  it("Russian uses a different form for 1, 2 and 5", () => {
    expect(new Set(forms("ru", [1, 2, 5])).size).toBe(3);
  });

  it("Arabic uses a different form for 1, 2, 5 and 11", () => {
    expect(new Set(forms("ar", [1, 2, 5, 11])).size).toBe(4);
  });

  it("writes the exact Russian forms", () => {
    const { container } = render(<Plurals />);
    fireEvent.click(container.querySelector('button[lang="ru"]')!);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(container.querySelector("output")!.textContent).toBe("Выбраны 2 строки");
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(container.querySelector("output")!.textContent).toBe("Выбрано 5 строк");
  });
});

describe("languages/precedence", () => {
  it("resolves labels, then the component's locale, then the provider's", () => {
    render(<Precedence />);
    const triggers = screen.getAllByRole("combobox");
    expect(triggers).toHaveLength(3);
    const text = (index: number) => triggers[index]!.textContent;
    expect(text(0)).toContain("Choisir une date");
    expect(text(1)).toContain("اختر تاريخًا");
    expect(text(2)).toContain("تاريخ الوصول");
  });
});

describe("languages/custom-pack", () => {
  it("renders the table in the custom Dutch locale", () => {
    const { container } = render(<CustomPack />);
    expect(container.textContent).toContain("Rijen per pagina");
    expect(container.textContent).toContain("Pagina 1 van 3");
    expect(screen.getByRole("navigation", { name: "Paginering" })).toBeTruthy();
  });
});
