/**
 * Data table classes
 *
 * Every class the data table's own markup and fallbacks put on an element, in
 * one place. The prefix is `sdt` ("s" and the component's initials, like
 * `sac`, `sdp` and `sfu`). A part that plays the same role as one in another
 * component has the same name as it (`__message`, `__error`, `__sr-only`).
 */
export const classes = {
  root: "sdt",
  scroll: "sdt__scroll",
  table: "sdt__table",
  head: "sdt__head",
  body: "sdt__body",
  foot: "sdt__foot",
  row: "sdt__row",
  cell: "sdt__cell",
  cellDrag: "sdt__cell--drag",
  cellSelect: "sdt__cell--select",
  checkbox: "sdt__checkbox",
  sort: "sdt__sort",
  sortIcon: "sdt__sort-icon",
  tree: "sdt__tree",
  treeSpacer: "sdt__tree-spacer",
  expand: "sdt__expand",
  skeleton: "sdt__skeleton",
  /** The empty state, named like the autocomplete's `sac__message`. */
  message: "sdt__message",
  /** The error state, named like the autocomplete's `sac__error`. */
  error: "sdt__error",
  button: "sdt__button",
  buttonIcon: "sdt__button--icon",
  pagination: "sdt__pagination",
  paginationButtons: "sdt__pagination-buttons",
  paginationInfo: "sdt__pagination-info",
  pageSize: "sdt__page-size",
  pageSizeSelect: "sdt__page-size-select",
  drag: "sdt__drag",
  /** Visually hidden text, named like the autocomplete's `sac__sr-only`. */
  srOnly: "sdt__sr-only",
} as const;
