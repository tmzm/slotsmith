import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import type { FileUploaderProps } from "../../index";
import { deferredUpload, dropzone, fileInput, itemNamed, items, makeFile } from "../builders";
import { chakraComponents } from "./chakra/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Chakra wrapper
 *
 * `ChakraProvider` with the default system.
 */
const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
);

/**
 * Render Chakra uploader
 *
 * `<FileUploader>` with Chakra UI v3 parts inside `ChakraProvider`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderChakraUploader = (props: Partial<FileUploaderProps> = {}) =>
  renderIntegration(chakraComponents, props, Wrapper);

beforeAll(stubBrowserApis);

describe("Chakra UI v3", () => {
  failOnReactWarnings();

  it("renders the drop zone with Chakra's parts", () => {
    renderChakraUploader();

    /** A Chakra `Box`, not the fallback's plain styled `<div>`. */
    expect(dropzone()).not.toHaveClass("sfu__zone");
    expect(screen.getByRole("button", { name: "Browse" })).toHaveClass("chakra-button");
  });

  it("adds a picked file as a List.Item with an Avatar thumbnail", async () => {
    const user = renderChakraUploader();

    await user.upload(fileInput(), makeFile("photo.png"));

    const row = itemNamed("photo.png");
    expect(row).toHaveClass("chakra-list__item");
    /**
     * By alt text, not role: jsdom never loads the image (`naturalWidth` stays
     * 0), so Chakra's avatar machine keeps it `hidden` and out of the
     * accessibility tree — a jsdom limitation, not a rendering bug.
     */
    expect(within(row).getByAltText("Preview of photo.png")).toHaveClass("chakra-avatar__image");
  });

  it("shows progress on Progress.Root while uploading", async () => {
    const server = deferredUpload();
    const user = renderChakraUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    await act(async () => server.progress(55));

    const bar = within(itemNamed("big.png")).getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("removes a file from an IconButton action", async () => {
    const user = renderChakraUploader();

    await user.upload(fileInput(), makeFile("gone.png"));
    await user.click(within(itemNamed("gone.png")).getByRole("button", { name: "Remove file" }));

    expect(items()).toHaveLength(0);
  });

  it("shows a rejection in an Alert and dismisses it", async () => {
    const user = renderChakraUploader({ maxSize: 1 });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    const alert = screen.getByRole("status");
    expect(alert).toHaveClass("chakra-alert__root");

    await user.click(within(alert).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
