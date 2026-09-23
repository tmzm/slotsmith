import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploader, type FileUploaderProps } from "../FileUploader";
import type { UploadContext } from "../core/types";

/**
 * File builder
 *
 * A real `File`, so the component under test sees what a browser would give it.
 *
 * @param name - The file name.
 * @param type - The MIME type.
 * @param size - How many bytes to allocate.
 * @returns The file.
 */
export function makeFile(name = "photo.png", type = "image/png", size = 8): File {
  return new File([new Uint8Array(size)], name, { type });
}

/**
 * Render uploader
 *
 * Renders `<FileUploader>` with a `userEvent` instance.
 *
 * @param props - Props to add or override.
 * @returns The render result plus `user`.
 */
export function renderUploader(props: Partial<FileUploaderProps> = {}) {
  const user = userEvent.setup();
  const result = render(<FileUploader {...props} />);
  return { ...result, user };
}

/**
 * Deferred upload
 *
 * An `upload` function whose promise you resolve by hand, so a test can watch
 * the in-flight state instead of racing it.
 *
 * @returns The upload function plus controls for the call it received.
 */
export function deferredUpload() {
  let resolve!: (value: { url: string }) => void;
  let reject!: (error: Error) => void;
  let context!: UploadContext;
  let calls = 0;

  const upload = (_file: File, ctx: UploadContext) => {
    calls += 1;
    context = ctx;
    return new Promise<{ url: string }>((res, rej) => {
      resolve = res;
      reject = rej;
    });
  };

  return {
    upload,
    resolve: (url = "https://cdn.test/photo.png") => resolve({ url }),
    reject: (message = "500") => reject(new Error(message)),
    progress: (percent: number) => context.onProgress(percent),
    get signal() {
      return context.signal;
    },
    get calls() {
      return calls;
    },
  };
}

/**
 * Drop zone
 *
 * @returns The drop target.
 */
export const dropzone = () => screen.getByRole("button", { name: "Add files" });

/**
 * File input
 *
 * @returns The real `<input type="file">`.
 */
export const fileInput = () => screen.getByLabelText("Add files", { selector: "input" });

/**
 * Items
 *
 * File rows only — the rejection list renders `<li>`s too, so counting every
 * listitem would count refusals as files.
 *
 * @returns The rendered file rows.
 */
export const items = () => Array.from(document.querySelectorAll<HTMLLIElement>("li[data-status]"));

/**
 * Item named
 *
 * @param name - The file name to find.
 * @returns That item's row.
 */
export const itemNamed = (name: string) =>
  items().find((item) => within(item).queryByText(name))!;

/**
 * Drop files
 *
 * Fires the drag sequence a browser would: enter, over, drop.
 *
 * @param user - The userEvent instance (unused, kept for symmetry).
 * @param target - The drop zone.
 * @param files - The files being dropped.
 */
export async function dropFiles(target: HTMLElement, files: File[]) {
  const { fireEvent } = await import("@testing-library/react");
  const dataTransfer = {
    files,
    items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })),
    types: ["Files"],
    dropEffect: "none",
  };
  fireEvent.dragEnter(target, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
}
