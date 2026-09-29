/**
 * Date picker classes
 *
 * Every class the date picker's own markup and fallbacks put on an
 * element, in one place, like the other components' maps. The prefix is
 * `sdp` ("s" and the component's initials).
 */
export const classes = {
  root: "sdp",
  header: "sdp__header",
  cell: "sdp__cell",
  weekdays: "sdp__weekdays",
  columnheader: "sdp__columnheader",
  week: "sdp__week",
  chevron: "sdp__chevron",
  icon: "sdp__icon",
  todayIcon: "sdp__today-icon",
  clear: "sdp__clear",
  caption: "sdp__caption",
  select: "sdp__select",
  nav: "sdp__nav",
  weekday: "sdp__weekday",
  footer: "sdp__footer",
  preset: "sdp__preset",
  presetToday: "sdp__preset--today",
  today: "sdp__today",
  trigger: "sdp__trigger",
  value: "sdp__value",
  valueEmpty: "sdp__value--empty",
  popup: "sdp__popup",
  calendar: "sdp__calendar",
  day: "sdp__day",
} as const;
