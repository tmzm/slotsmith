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
