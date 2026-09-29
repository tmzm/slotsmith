/**
 * File uploader classes
 *
 * Every class the file uploader's own markup and fallbacks put on an
 * element, in one place, like the other components' maps. The prefix is
 * `sfu` ("s" and the component's initials).
 */
export const classes = {
  root: "sfu",
  actions: "sfu__actions",
  error: "sfu__error",
  compact: "sfu__compact",
  hint: "sfu__hint",
  input: "sfu__input",
  icon: "sfu__icon",
  copy: "sfu__copy",
  title: "sfu__title",
  browse: "sfu__browse",
  thumb: "sfu__thumb",
  thumbImg: "sfu__thumb-img",
  meta: "sfu__meta",
  name: "sfu__name",
  sub: "sfu__sub",
  progress: "sfu__progress",
  progressBar: "sfu__progress-bar",
  action: "sfu__action",
  rejections: "sfu__rejections",
  zone: "sfu__zone",
  list: "sfu__list",
  item: "sfu__item",
} as const;
