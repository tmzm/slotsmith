import { Theme } from "@radix-ui/themes";
import { act, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import type { FileUploaderProps } from "../../index";
import { deferredUpload, dropzone, fileInput, itemNamed, items, makeFile } from "../builders";
import { radixComponents } from "./radix/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Radix Themes wrapper
 *
 * `Theme` with its default accent and appearance. jsdom loads no stylesheet,
 * so the colours the parts paint with are checked as the Radix variables
 * they name, which is what makes them follow the app's `Theme`.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <Theme>{children}</Theme>;

/**
 * Render Radix Themes uploader
 *
 * `<FileUploader>` with Radix Themes parts inside `Theme`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderRadixUploader = (props: Partial<FileUploaderProps> = {}) => renderIntegration(radixComponents, props, Wrapper);

beforeAll(stubBrowserApis);

describe("Radix Themes v3", () => {
  failOnReactWarnings();

  it("renders a dashed drop zone with a Radix Button", () => {
    renderRadixUploader();

    expect(dropzone().style.borderStyle).toBe("dashed");
    expect(dropzone().style.backgroundColor).toBe("var(--gray-a2)");
    expect(screen.getByRole("button", { name: "Browse" })).toHaveClass("rt-Button");
  });

  it("marks the drop zone while a file is over it", () => {
    renderRadixUploader();

    fireEvent.dragEnter(dropzone(), { dataTransfer: { files: [], types: ["Files"] } });

    expect(dropzone()).toHaveAttribute("data-dragging");
    expect(dropzone().style.borderColor).toBe("var(--accent-8)");
  });

  it("adds a picked file as a row with its preview", async () => {
    const user = renderRadixUploader();

    await user.upload(fileInput(), makeFile("photo.png"));

    const row = itemNamed("photo.png");
    expect(within(row).getByRole("img", { name: "Preview of photo.png" }).style.borderRadius).toBe("var(--radius-2)");
  });

  it("shows a file icon in an Avatar for a file that is not an image", async () => {
    const user = renderRadixUploader();

    await user.upload(fileInput(), makeFile("notes.pdf", "application/pdf"));

    expect(itemNamed("notes.pdf").querySelector(".rt-AvatarRoot svg")).not.toBeNull();
  });

  it("shows progress on Radix's Progress while uploading", async () => {
    const server = deferredUpload();
    const user = renderRadixUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    await act(async () => server.progress(55));

    const bar = within(itemNamed("big.png")).getByRole("progressbar");
    expect(bar).toHaveClass("rt-ProgressRoot");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("removes a file from an IconButton action", async () => {
    const user = renderRadixUploader();

    await user.upload(fileInput(), makeFile("gone.png"));
    const remove = within(itemNamed("gone.png")).getByRole("button", { name: "Remove file" });
    expect(remove).toHaveClass("rt-IconButton");
    await user.click(remove);

    expect(items()).toHaveLength(0);
  });

  it("shows a rejection in a Callout and dismisses it", async () => {
    const user = renderRadixUploader({ maxSize: 1 });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    const callout = screen.getByRole("status");
    expect(callout).toHaveClass("rt-CalloutRoot");
    expect(callout).toHaveAttribute("data-accent-color", "red");

    await user.click(within(callout).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
