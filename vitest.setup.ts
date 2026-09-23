import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

/**
 * Object URLs
 *
 * jsdom has no createObjectURL, and the uploader previews images with one.
 * A counter keeps them unique so tests can tell two previews apart.
 */
let objectUrls = 0;
const urls = globalThis.URL as unknown as Record<string, unknown>;
urls.createObjectURL = () => `blob:slotsmith/${(objectUrls += 1)}`;
urls.revokeObjectURL = () => {};

/**
 * Scroll into view
 *
 * jsdom has no layout, so the highlight's scroll-into-view call would throw.
 */
Element.prototype.scrollIntoView = () => {};

/**
 * Intersection observer
 *
 * jsdom has none, and the autocomplete observes a sentinel to page. Tests that
 * care about paging click the load-more button instead of faking a scroll.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}
