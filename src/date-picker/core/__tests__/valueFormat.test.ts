import { describe, expect, it, vi } from "vitest";
import { createValueCodec, dayInZone, offsetOf, startOfDayIn, todayIn } from "../valueFormat";

describe("value patterns", () => {
  it("writes the instant the day starts by default, and reads a day without a zone as that day", () => {
    const codec = createValueCodec(undefined, "America/New_York");
    expect(codec.format("2026-03-02")).toBe("2026-03-02T00:00:00-05:00");
    expect(codec.parse("2026-03-02")).toBe("2026-03-02");
    expect(codec.parse("2026-03-02T23:30")).toBe("2026-03-02");
    expect(codec.parse("2026-02-31")).toBeNull();
    expect(codec.parse("2026-03-02T03:00:00Z")).toBe("2026-03-01");
  });

  it("keeps the calendar day alone with YYYY-MM-DD", () => {
    const codec = createValueCodec("YYYY-MM-DD");
    expect(codec.format("2026-03-02")).toBe("2026-03-02");
    expect(codec.parse("2026-03-02")).toBe("2026-03-02");
  });

  it("writes and reads a pattern, padded or not", () => {
    const european = createValueCodec("DD/MM/YYYY");
    expect(european.format("2026-03-02")).toBe("02/03/2026");
    expect(european.parse("02/03/2026")).toBe("2026-03-02");
    const american = createValueCodec("M/D/YYYY");
    expect(american.format("2026-03-02")).toBe("3/2/2026");
    expect(american.parse("3/2/2026")).toBe("2026-03-02");
    expect(american.parse("12/31/2026")).toBe("2026-12-31");
  });

  it("keeps literal characters, dots included", () => {
    const dotted = createValueCodec("YYYY.MM.DD");
    expect(dotted.format("2026-03-02")).toBe("2026.03.02");
    expect(dotted.parse("2026.03.02")).toBe("2026-03-02");
    expect(dotted.parse("2026x03x02")).toBeNull();
  });

  it("reads nothing that is not a day", () => {
    const european = createValueCodec("DD/MM/YYYY");
    expect(european.parse("31/02/2026")).toBeNull();
    expect(european.parse("hello")).toBeNull();
  });

  it("uses a codec of the app's own as it is", () => {
    const codec = { format: (day: string) => day.replaceAll("-", ""), parse: (text: string) => `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}` };
    expect(createValueCodec(codec)).toBe(codec);
  });
});

describe("time zones", () => {
  it("reads the offset of an IANA zone, UTC and a fixed offset", () => {
    const march = Date.UTC(2026, 2, 12, 12);
    expect(offsetOf(march, "Asia/Tokyo")).toBe(540);
    expect(offsetOf(march, "UTC")).toBe(0);
    expect(offsetOf(march, "-03:30")).toBe(-210);
    // New York is on summer time from March 8th 2026.
    expect(offsetOf(march, "America/New_York")).toBe(-240);
    expect(offsetOf(Date.UTC(2026, 0, 12), "America/New_York")).toBe(-300);
  });

  it("reads the day a moment falls on in a zone", () => {
    const late = new Date(Date.UTC(2026, 2, 12, 20));
    expect(dayInZone(late, "UTC")).toBe("2026-03-12");
    expect(dayInZone(late, "Asia/Tokyo")).toBe("2026-03-13");
    expect(dayInZone(late, "America/Los_Angeles")).toBe("2026-03-12");
  });

  it("knows today in a zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 2, 12, 20));
    expect(todayIn("Asia/Tokyo")).toBe("2026-03-13");
    expect(todayIn("UTC")).toBe("2026-03-12");
    vi.useRealTimers();
  });

  it("finds the instant a day starts, across a daylight-saving change", () => {
    expect(startOfDayIn("2026-03-12", "Asia/Tokyo")).toEqual({ instant: Date.UTC(2026, 2, 11, 15), offset: 540 });
    // The clocks go forward at 02:00 on March 8th in New York: midnight is still on winter time.
    expect(startOfDayIn("2026-03-08", "America/New_York").offset).toBe(-300);
    expect(startOfDayIn("2026-03-09", "America/New_York").offset).toBe(-240);
  });

  it("writes and reads days as instants in a zone", () => {
    const tokyo = createValueCodec("iso-datetime", "Asia/Tokyo");
    expect(tokyo.format("2026-03-12")).toBe("2026-03-12T00:00:00+09:00");
    expect(tokyo.parse("2026-03-12T00:00:00+09:00")).toBe("2026-03-12");
    // 20:00 UTC is already the next day in Tokyo.
    expect(tokyo.parse("2026-03-12T20:00:00Z")).toBe("2026-03-13");
    expect(tokyo.parse("not a date")).toBeNull();
    expect(createValueCodec("iso-datetime", "UTC").format("2026-03-12")).toBe("2026-03-12T00:00:00+00:00");
  });
});
