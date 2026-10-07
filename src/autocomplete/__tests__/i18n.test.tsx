import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlotsmithProvider, defineLocale } from "../../locale";
import { Autocomplete } from "../Autocomplete";
import { defaultAutocompleteLabels } from "../slots/fallbacks";
import type { AutocompleteLabels } from "../slots/types";
import { BRANDS as ENGLISH_BRANDS, renderAutocomplete, type Brand as BuilderBrand } from "./builders";

interface Brand {
  id: string;
  name: string;
}

const BRANDS: Brand[] = [
  { id: "b1", name: "آلتو" },
  { id: "b2", name: "كاسينا" },
  { id: "b3", name: "هاي" },
];

/**
 * Arabic labels
 *
 * Every string the component can render, translated. The test asserts that
 * none of the English defaults survive, which is what proves the component
 * has no hardcoded text.
 */
const ARABIC: AutocompleteLabels = {
  placeholder: "اختر علامة",
  search: "ابحث",
  clear: "مسح الاختيار",
  toggle: "عرض الخيارات",
  remove: (label) => `إزالة ${label}`,
  empty: "لا توجد نتائج",
  loading: "جارٍ التحميل…",
  minChars: (count) => `اكتب ${count} أحرف أو أكثر`,
  retry: "إعادة المحاولة",
  create: (query) => `إنشاء «${query}»`,
  creating: "جارٍ الإنشاء…",
  more: (count) => `+${count}`,
  loadMore: "تحميل المزيد",
  results: (count) => `${count} نتيجة`,
};

/**
 * Render in Arabic
 *
 * @param props - Overrides for the component's props.
 * @returns Testing Library's result plus `user`.
 */
function renderArabic(props: Record<string, unknown> = {}) {
  const user = userEvent.setup();
  const merged = {
    options: BRANDS,
    getOptionLabel: (brand: Brand) => brand.name,
    labels: ARABIC,
    ...props,
  } as React.ComponentProps<typeof Autocomplete<Brand>>;

  const result = render(
    <div dir="rtl">
      <Autocomplete<Brand> {...merged} />
    </div>,
  );
  return { ...result, user };
}

describe("translating every string", () => {
  it("renders the placeholder, search box and results count in the given language", async () => {
    const { user } = renderArabic();

    expect(screen.getByRole("combobox")).toHaveTextContent("اختر علامة");

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "ابحث");
    expect(screen.getByRole("status")).toHaveTextContent("3 نتيجة");
  });

  it("translates the empty state", async () => {
    const { user } = renderArabic();

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText("لا توجد نتائج")).toBeInTheDocument();
  });

  it("translates the loading and minimum-characters states", async () => {
    const { user, unmount } = renderArabic({ options: [], loading: true });
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("جارٍ التحميل…")).toBeInTheDocument();
    unmount();

    const gated = renderArabic({ options: [], minChars: 3 });
    await gated.user.click(screen.getByRole("combobox"));
    expect(screen.getByText("اكتب 3 أحرف أو أكثر")).toBeInTheDocument();
  });

  it("translates the error state and its retry control", async () => {
    const { user } = renderArabic({ error: "فشل الاتصال", onRetry: () => {} });

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("فشل الاتصال")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إعادة المحاولة" })).toBeInTheDocument();
  });

  it("translates the create row", async () => {
    const { user } = renderArabic({ creatable: true, onCreate: () => {} });

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "فيترا");

    expect(screen.getByRole("button", { name: "إنشاء «فيترا»" })).toBeInTheDocument();
  });

  it("translates the load-more control", async () => {
    const { user } = renderArabic({ hasMore: true, onLoadMore: () => {} });

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("button", { name: "تحميل المزيد" })).toBeInTheDocument();
  });

  it("translates the clear and tag-remove controls", async () => {
    renderArabic({ multiple: true, defaultValue: ["b1", "b2"] });

    expect(screen.getByRole("button", { name: "مسح الاختيار" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إزالة آلتو" })).toBeInTheDocument();
  });

  it("leaves no English default anywhere on screen", async () => {
    const { user, container } = renderArabic({ multiple: true, defaultValue: ["b1"], hasMore: true });
    await user.click(screen.getByRole("combobox"));

    const text = container.textContent ?? "";
    const html = container.innerHTML;
    const english = [
      defaultAutocompleteLabels.placeholder,
      defaultAutocompleteLabels.empty,
      defaultAutocompleteLabels.loading,
      defaultAutocompleteLabels.retry,
      defaultAutocompleteLabels.loadMore,
      defaultAutocompleteLabels.clear,
    ];

    for (const phrase of english) {
      expect(text).not.toContain(phrase);
      expect(html).not.toContain(phrase);
    }
  });
});

describe("right to left", () => {
  it("keeps every control reachable and working under dir=rtl", async () => {
    const { user } = renderArabic({ multiple: true });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "كاسينا" }));

    const trigger = screen.getByRole("combobox");
    expect(within(trigger).getByRole("button", { name: "إزالة كاسينا" })).toBeInTheDocument();

    await user.click(within(trigger).getByRole("button", { name: "إزالة كاسينا" }));
    expect(trigger).toHaveTextContent("اختر علامة");
  });

  it("moves the highlight by meaning, not by screen direction", async () => {
    const { user } = renderArabic();

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}{ArrowDown}");

    const activeId = screen.getByRole("searchbox").getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId ?? "")).toHaveTextContent("كاسينا");
  });

  it("puts the clear control after the tags in reading order", async () => {
    const { user } = renderArabic({ multiple: true, defaultValue: ["b1"] });
    const trigger = screen.getByRole("combobox");

    /**
     * Order in the DOM is what a screen reader and the tab sequence follow, and
     * the stylesheet uses logical properties so the visual order mirrors it.
     */
    const controls = within(trigger).getAllByRole("button");
    expect(controls[0]).toHaveAccessibleName("إزالة آلتو");
    expect(controls[controls.length - 1]).toHaveAccessibleName("مسح الاختيار");

    await user.tab();
    expect(trigger).toHaveFocus();
  });
});

describe("autocomplete locale", () => {
  const nl = defineLocale({
    code: "nl",
    autocomplete: { ...defaultAutocompleteLabels, placeholder: "Kies…", clear: "Selectie wissen" },
  });

  it("renders English with no locale", () => {
    renderAutocomplete();
    expect(screen.getByRole("combobox")).toHaveTextContent("Select…");
  });
  it("takes a locale object", () => {
    renderAutocomplete({ locale: nl });
    expect(screen.getByRole("combobox")).toHaveTextContent("Kies…");
  });
  it("reads the provider's locale", () => {
    render(
      <SlotsmithProvider locale="nl-BE" locales={[nl]}>
        <Autocomplete<BuilderBrand> options={ENGLISH_BRANDS} getOptionLabel={(brand) => brand.name} />
      </SlotsmithProvider>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Kies…");
  });
  it("lets the labels prop win over the locale", () => {
    renderAutocomplete({ locale: nl, labels: { placeholder: "Merk" } });
    expect(screen.getByRole("combobox")).toHaveTextContent("Merk");
  });
  it("falls back to English for a key the locale lacks", () => {
    const { clear: _clear, ...rest } = nl.autocomplete as typeof defaultAutocompleteLabels;
    const old = { ...nl, autocomplete: rest } as unknown as typeof nl;
    renderAutocomplete({ locale: old, defaultValue: "b1" });
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });
  it("stays English and warns once when a tag has no pack", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderAutocomplete({ locale: "de" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Select…");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
