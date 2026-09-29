import type { ComponentSlug } from "../src/data/components.ts";
import { classes as ac } from "../../src/autocomplete/classes.ts";
import { classes as dt } from "../../src/data-table/classes.ts";
import { classes as dp } from "../../src/date-picker/classes.ts";
import { classes as fu } from "../../src/file-uploader/classes.ts";

const c = (name: string) => `.${name}`;

/**
 * Slot name to the CSS selector of the element its fallback renders, built from
 * each component's own class map. Slots that render only an icon or a text node
 * point at the nearest element that carries their styling.
 *
 * `slot-selectors.test.ts` fails when a slot is added to the library without an
 * entry here, or an entry outlives its slot.
 */
export const SLOT_SELECTORS: Record<ComponentSlug, Record<string, string>> = {
  "data-table": {
    Root: c(dt.root),
    Table: c(dt.table),
    Head: c(dt.head),
    Body: c(dt.body),
    HeaderRow: `${c(dt.head)} ${c(dt.row)}`,
    HeaderCell: `${c(dt.head)} ${c(dt.cell)}`,
    Foot: c(dt.foot),
    FooterRow: `${c(dt.foot)} ${c(dt.row)}`,
    FooterCell: `${c(dt.foot)} ${c(dt.cell)}`,
    Row: `${c(dt.body)} ${c(dt.row)}`,
    Cell: `${c(dt.body)} ${c(dt.cell)}`,
    Checkbox: c(dt.checkbox),
    SortTrigger: c(dt.sort),
    SortIcon: c(dt.sortIcon),
    ExpandToggle: c(dt.expand),
    Skeleton: c(dt.skeleton),
    Empty: c(dt.message),
    Error: c(dt.error),
    Pagination: c(dt.pagination),
    PaginationButton: c(dt.buttonIcon),
    PageSizeSelect: c(dt.pageSize),
    DragHandle: c(dt.drag),
  },
  autocomplete: {
    Root: c(ac.root),
    Trigger: c(ac.trigger),
    Value: c(ac.value),
    Tag: c(ac.tag),
    Clear: c(ac.clear),
    Indicator: c(ac.chevron),
    Popup: c(ac.popup),
    Search: c(ac.search),
    List: c(ac.list),
    Option: c(ac.option),
    OptionLabel: c(ac.label),
    Check: c(ac.tick),
    Empty: c(ac.message),
    Loading: c(ac.message),
    Error: c(ac.error),
    Create: c(ac.create),
    LoadMore: c(ac.more),
  },
  "date-picker": {
    Root: c(dp.root),
    Trigger: c(dp.trigger),
    Value: c(dp.value),
    Icon: c(dp.icon),
    Clear: c(dp.clear),
    Popup: c(dp.popup),
    Calendar: c(dp.calendar),
    Caption: c(dp.caption),
    Nav: c(dp.nav),
    Weekday: c(dp.weekday),
    Day: c(dp.day),
    DayContent: `${c(dp.day)} > span`,
    Footer: c(dp.footer),
  },
  "file-uploader": {
    Root: c(fu.root),
    Dropzone: c(fu.zone),
    Input: c(fu.input),
    Icon: c(fu.icon),
    Empty: c(fu.copy),
    Trigger: c(fu.browse),
    List: c(fu.list),
    Item: c(fu.item),
    Thumbnail: c(fu.thumb),
    ItemMeta: c(fu.meta),
    Progress: c(fu.progress),
    Action: c(fu.action),
    Rejections: c(fu.rejections),
  },
};
