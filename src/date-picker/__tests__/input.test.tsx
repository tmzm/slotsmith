import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker, type DatePickerProps } from "../DatePicker";
import { createInputCodec, parseInput } from "../core/inputText";
import { at, day, dialog, freezeToday, isOpen } from "./builders";

freezeToday();

/** Renders the picker with its default trigger, the text field. */
function renderField(props: Partial<DatePickerProps> = {}) {
  const user = userEvent.setup();
  render(<DatePicker aria-label="Due" {...(props as DatePickerProps)} />);
  return user;
}

const field = () => screen.getByRole("combobox", { name: "Due" }) as HTMLInputElement;
const toggle = () => screen.getByRole("button", { name: "Open calendar" });

describe("the text field", () => {
  it("is the default trigger: a combobox field with the locale's date order and a calendar button", () => {
    renderField({ defaultValue: "2026-03-05" });
    expect(field().tagName).toBe("INPUT");
    expect(field()).toHaveAttribute("aria-haspopup", "dialog");
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveValue("03/05/2026");
    expect(field()).toHaveAttribute("placeholder", "MM/DD/YYYY");
    expect(toggle()).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("is named by a label pointing at its id", () => {
    render(
      <>
        <label htmlFor="due">Due date</label>
        <DatePicker id="due" />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Due date" })).toHaveAttribute("id", "due");
  });

  it("reads a typed date on Enter", async () => {
    const onChange = vi.fn();
    const user = renderField({ onChange });
    await user.type(field(), "3/20/2026{Enter}");
    expect(onChange).toHaveBeenCalledWith(at("2026-03-20"));
    expect(field()).toHaveValue("03/20/2026");
  });

  it("reads a typed date when focus leaves", async () => {
    const onChange = vi.fn();
    const user = renderField({ onChange });
    await user.type(field(), "03/21/2026");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(at("2026-03-21"));
  });

  it("puts the value back for text that is not a date, or names a blocked day", async () => {
    const onChange = vi.fn();
    const user = renderField({ defaultValue: "2026-03-05", onChange, disabledDates: (date) => date.startsWith("2026-03-14") });
    await user.clear(field());
    await user.type(field(), "02/31/2026{Enter}");
    expect(field()).toHaveValue("03/05/2026");
    await user.clear(field());
    await user.type(field(), "03/14/2026{Enter}");
    expect(field()).toHaveValue("03/05/2026");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the value when the text is emptied", async () => {
    const onChange = vi.fn();
    const user = renderField({ defaultValue: "2026-03-05", onChange });
    await user.clear(field());
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("drops the typing with Escape", async () => {
    const user = renderField({ defaultValue: "2026-03-05" });
    await user.clear(field());
    await user.type(field(), "04/0");
    await user.keyboard("{Escape}");
    expect(field()).toHaveValue("03/05/2026");
  });

  it("types in the locale's order", async () => {
    const onChange = vi.fn();
    const user = renderField({ locale: "de", onChange, labels: { openCalendar: "Open calendar" } });
    expect(field()).toHaveAttribute("placeholder", "DD.MM.YYYY");
    await user.type(field(), "20.03.2026{Enter}");
    expect(onChange).toHaveBeenCalledWith(at("2026-03-20"));
  });

  it("types a range and several dates", async () => {
    const onRange = vi.fn();
    const user = renderField({ mode: "range", onChange: onRange });
    await user.type(field(), "03/05/2026 – 03/09/2026{Enter}");
    expect(onRange).toHaveBeenCalledWith({ from: at("2026-03-05"), to: at("2026-03-09") });
  });

  it("clears into the field, not the page", async () => {
    const user = renderField({ defaultValue: "2026-03-05" });
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
  });
});

describe("opening the calendar", () => {
  it("stays closed on a click in the field by default", async () => {
    const user = renderField();
    await user.click(field());
    expect(isOpen()).toBe(false);
  });

  it("opens from the calendar button and moves focus into the grid", async () => {
    const user = renderField({ defaultValue: "2026-03-05" });
    await user.click(toggle());
    expect(dialog()).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(day("2026-03-05")).toHaveFocus();
  });

  it("opens with Down Arrow and moves into the grid", async () => {
    const user = renderField();
    field().focus();
    await user.keyboard("{ArrowDown}");
    expect(day("2026-03-12")).toHaveFocus();
  });

  it("returns focus to the field after a pick", async () => {
    const onChange = vi.fn();
    const user = renderField({ onChange });
    await user.click(toggle());
    await user.click(day("2026-03-18"));
    expect(onChange).toHaveBeenCalledWith(at("2026-03-18"));
    expect(isOpen()).toBe(false);
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue("03/18/2026");
  });

  describe("with openOnFocus", () => {
    it("opens when the field is focused, and keeps focus there for typing", async () => {
      const user = renderField({ openOnFocus: true });
      await user.click(field());
      expect(isOpen()).toBe(true);
      expect(field()).toHaveFocus();
    });

    it("shows the month being typed", async () => {
      const user = renderField({ openOnFocus: true });
      await user.click(field());
      await user.type(field(), "05/20/2026");
      expect(day("2026-05-20")).toHaveAttribute("data-focused");
      expect(field()).toHaveFocus();
    });

    it("does not open again when focus comes back after a pick", async () => {
      const user = renderField({ openOnFocus: true });
      await user.click(field());
      await user.click(day("2026-03-18"));
      expect(field()).toHaveFocus();
      expect(isOpen()).toBe(false);
    });

    it("closes with Escape and keeps focus in the field", async () => {
      const user = renderField({ openOnFocus: true });
      await user.click(field());
      await user.keyboard("{Escape}");
      expect(isOpen()).toBe(false);
      expect(field()).toHaveFocus();
    });
  });
});

describe("the button trigger", () => {
  it("is still one combobox showing the formatted date", () => {
    render(<DatePicker trigger="button" aria-label="Due" defaultValue="2026-03-05" />);
    const combobox = screen.getByRole("combobox", { name: "Due" });
    expect(combobox.tagName).toBe("DIV");
    expect(combobox).toHaveTextContent("Mar 5, 2026");
    expect(screen.queryByRole("button", { name: "Open calendar" })).toBeNull();
  });
});

describe("reading typed text", () => {
  it("takes any separator and the locale's digits", () => {
    const codec = createInputCodec("en-US");
    expect(codec.parse("3-5-2026")).toBe("2026-03-05");
    expect(codec.parse("3 5 2026")).toBe("2026-03-05");
    expect(codec.parse("26/3/5")).toBeNull();
    expect(createInputCodec("ar-EG").parse("٠٥/٠٣/٢٠٢٦")).toBe("2026-03-05");
  });

  it("orders a range typed backwards, and refuses a list with a bad day", () => {
    const codec = createInputCodec("en-US");
    expect(parseInput("range", "03/09/2026 - 03/05/2026", codec)).toEqual({ from: "2026-03-05", to: "2026-03-09" });
    expect(parseInput("multiple", "03/07/2026, 03/05/2026", codec)).toEqual(["2026-03-05", "2026-03-07"]);
    expect(parseInput("multiple", "03/07/2026, 13/45/2026", codec)).toBeUndefined();
  });
});
