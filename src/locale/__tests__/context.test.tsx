import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { defaultLabels } from "../../data-table/slots/fallbacks";
import { SlotsmithProvider, useLocaleSection, useSlotsmithLocale } from "../context";
import { defineLocale } from "../defineLocale";

const ar = defineLocale({ code: "ar", table: { ...defaultLabels, empty: "فارغ" } });
const fr = defineLocale({ code: "fr", table: { ...defaultLabels, empty: "Vide" } });

function Probe({ locale }: { locale?: Parameters<typeof useLocaleSection>[1] }) {
  const { code, labels } = useLocaleSection("table", locale);
  const app = useSlotsmithLocale();
  return (
    <p data-testid="probe">
      {String(code)}|{String(labels?.empty)}|{app.code}|{app.dir}
    </p>
  );
}

const text = () => screen.getByTestId("probe").textContent;

describe("SlotsmithProvider", () => {
  it("has no locale outside a provider", () => {
    render(<Probe />);
    expect(text()).toBe("undefined|undefined|en-US|ltr");
  });
  it("gives components the provider's locale", () => {
    render(<SlotsmithProvider locale={ar}><Probe /></SlotsmithProvider>);
    expect(text()).toBe("ar|فارغ|ar|rtl");
  });
  it("resolves a string against the registered packs", () => {
    render(<SlotsmithProvider locale="fr-CA" locales={[ar, fr]}><Probe /></SlotsmithProvider>);
    expect(text()).toBe("fr-CA|Vide|fr-CA|ltr");
  });
  it("lets a component's own locale replace the provider's", () => {
    render(<SlotsmithProvider locale={ar} locales={[ar, fr]}><Probe locale="fr" /></SlotsmithProvider>);
    expect(text()).toBe("fr|Vide|ar|rtl");
  });
  it("does not mix languages when a component's locale has no pack", () => {
    render(<SlotsmithProvider locale={ar} locales={[ar]}><Probe locale="en-GB" /></SlotsmithProvider>);
    expect(text()).toBe("en-GB|undefined|ar|rtl");
  });
  it("inherits the packs of an outer provider", () => {
    render(
      <SlotsmithProvider locale={ar} locales={[ar, fr]}>
        <SlotsmithProvider locale="fr"><Probe /></SlotsmithProvider>
      </SlotsmithProvider>,
    );
    expect(text()).toBe("fr|Vide|fr|ltr");
  });
  it("works without a provider when given an object", () => {
    render(<Probe locale={fr} />);
    expect(text()).toBe("fr|Vide|en-US|ltr");
  });
});
