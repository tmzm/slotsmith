/**
 * Renamed class
 *
 * One element's class names: the current one, which the stylesheet selects,
 * then the name the same part had before, still put on the element so an
 * app's own rules written against it keep matching.
 *
 * @param name - The current class name.
 * @param old - The deprecated class name (or names), removed in 2.0.
 * @returns Both names, current first.
 */
const renamed = (name: string, old: string) => `${name} ${old}`;

/**
 * Data table classes
 *
 * Every class the data table's own markup and fallbacks put on an element, in
 * one place. The prefix is `sdt` ("s" and the component's initials, like
 * `sac`, `sdp` and `sfu`); the second name in each entry is the `rdt` name the
 * part had until 1.6.0. A part that plays the same role as one in another
 * component has the same name as it (`__message`, `__error`, `__sr-only`).
 * The stylesheet selects only the `sdt` names, and the old ones are dropped
 * in 2.0 by deleting the second argument of each entry.
 */
export const classes = {
  root: renamed("sdt", "rdt"),
  scroll: renamed("sdt__scroll", "rdt__scroll"),
  table: renamed("sdt__table", "rdt__table"),
  head: renamed("sdt__head", "rdt__head"),
  body: renamed("sdt__body", "rdt__body"),
  foot: renamed("sdt__foot", "rdt__foot"),
  row: renamed("sdt__row", "rdt__row"),
  cell: renamed("sdt__cell", "rdt__cell"),
  cellDrag: renamed("sdt__cell--drag", "rdt__cell--drag"),
  cellSelect: renamed("sdt__cell--select", "rdt__cell--select"),
  checkbox: renamed("sdt__checkbox", "rdt__checkbox"),
  sort: renamed("sdt__sort", "rdt__sort"),
  sortIcon: renamed("sdt__sort-icon", "rdt__sort-icon"),
  tree: renamed("sdt__tree", "rdt__tree"),
  treeSpacer: renamed("sdt__tree-spacer", "rdt__tree-spacer"),
  expand: renamed("sdt__expand", "rdt__expand"),
  skeleton: renamed("sdt__skeleton", "rdt__skeleton"),
  /** The empty state, named like the autocomplete's `sac__message`. */
  message: renamed("sdt__message", "rdt__placeholder"),
  /** The error state, named like the autocomplete's `sac__error`. It had both old names. */
  error: renamed("sdt__error", "rdt__placeholder rdt__placeholder--error"),
  button: renamed("sdt__button", "rdt__button"),
  buttonIcon: renamed("sdt__button--icon", "rdt__button--icon"),
  pagination: renamed("sdt__pagination", "rdt__pagination"),
  paginationButtons: renamed("sdt__pagination-buttons", "rdt__pagination-buttons"),
  paginationInfo: renamed("sdt__pagination-info", "rdt__pagination-info"),
  pageSize: renamed("sdt__page-size", "rdt__page-size"),
  pageSizeSelect: renamed("sdt__page-size-select", "rdt__page-size-select"),
  drag: renamed("sdt__drag", "rdt__drag"),
  /** Visually hidden text, named like the autocomplete's `sac__sr-only`. */
  srOnly: renamed("sdt__sr-only", "rdt__sr"),
} as const;
