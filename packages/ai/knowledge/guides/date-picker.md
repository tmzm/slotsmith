# Date picker guide

One date, several dates, or a range, as plain `YYYY-MM-DD` strings that never shift across time zones. Full keyboard grid, min / max and blocked dates, presets, the locale's week start and right-to-left support.

```bash
npm i slotsmith
```

## Modes

`mode` is a discriminated union, so `value`, `defaultValue` and `onChange` take the right shape for each mode:

```tsx
import { DatePicker, type DateRange } from "slotsmith/date-picker";
import "slotsmith/date-picker.css";

// One date: string | null. `mode` may be left out.
<DatePicker value={due} onChange={setDue} />;

// Several dates: string[], toggled one click at a time.
<DatePicker mode="multiple" value={days} onChange={setDays} />;

// A range: { from?: string; to?: string } | null.
<DatePicker mode="range" value={stay} onChange={setStay} />;
```

In range mode the first click sets the start and the second the end; a click before the start restarts the range. While only the start is picked, the days up to the hovered or focused day carry `data-in-preview`.

## Working with ISO strings

Values are `YYYY-MM-DD` strings (`ISODate`), never `Date` objects, so a date picked in Tokyo is the same date in Los Angeles. Helpers are exported: `today()`, `addDays`, `addMonths`, `toISODate(date)`, `fromISODate(iso)` and `formatDate`.

```tsx
import { addDays, today } from "slotsmith/date-picker";

<DatePicker minDate={today()} maxDate={addDays(today(), 90)} />;
```

## Bounds and blocked dates

`minDate` / `maxDate` stop picking and paging outside the window. `disabledDates` blocks single days; blocked days stay focusable (the WAI-ARIA pattern) but cannot be picked:

```tsx
const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00`).getDay());

<DatePicker disabledDates={isWeekend} />;
```

## Presets

`presets` adds shortcuts under the grid. A preset's value has the shape of the mode:

```tsx
<DatePicker
  mode="range"
  presets={[{ label: "Next 7 days", value: { from: today(), to: addDays(today(), 6) } }]}
/>
```

## Locale, week start and RTL

`locale` drives month and weekday names and the trigger's format (`format` takes `Intl.DateTimeFormatOptions`). `weekStartsOn` defaults to the locale's first day. Under `dir="rtl"` the navigation swaps and the arrow keys follow the visual direction.

```tsx
<DatePicker locale="ar-EG" weekStartsOn={6} />
```

## Keyboard

Arrow keys move by day and week, Home / End go to the start and end of the week, PageUp / PageDown move a month and Shift+PageUp / PageDown a year. Enter or Space picks; Escape closes and returns focus to the trigger. Only the focused day has `tabIndex=0`.

## Replacing parts

`Root`, `Trigger`, `Popup`, `Calendar` and `Day` are element parts. `Day` carries `data-date`, `data-today`, `data-outside`, `data-weekend`, `data-selected`, `data-disabled`, `data-focused`, `data-in-range`, `data-in-preview`, `data-range-start` and `data-range-end`, so a range band is pure CSS. Put prices, dots or badges in the `DayContent` widget part, which receives the day itself. `Caption`, `Nav`, `Weekday`, `Footer`, `Value`, `Icon` and `Clear` are widget parts.

Replacing `Calendar` must keep forwarding `onKeyDown`: the grid owns the keyboard path.

The date picker has no virtual variant.
