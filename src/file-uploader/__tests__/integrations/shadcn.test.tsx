import { act, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { FileUploaderProps } from "../../index";
import { deferredUpload, dropzone, fileInput, itemNamed, items, makeFile } from "../builders";
import { shadcnFileUploader } from "./shadcn/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Render shadcn uploader
 *
 * `<FileUploader>` with shadcn/ui parts.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderShadcnUploader = (props: Partial<FileUploaderProps> = {}) => renderIntegration(shadcnFileUploader, props);

beforeAll(stubBrowserApis);

describe("shadcn/ui", () => {
  failOnReactWarnings();

  it("renders the drop zone with shadcn's parts", () => {
    renderShadcnUploader();

    expect(dropzone()).toHaveAttribute("data-slot", "dropzone");
    expect(screen.getByRole("button", { name: "Browse" })).toHaveAttribute("data-slot", "button");
  });

  it("adds a picked file as a file item with an Avatar thumbnail", async () => {
    const user = renderShadcnUploader();

    await user.upload(fileInput(), makeFile("photo.png"));

    const row = itemNamed("photo.png");
    expect(row).toHaveAttribute("data-slot", "file-item");
    expect(within(row).getByRole("img")).toHaveAttribute("data-slot", "avatar-image");
  });

  it("shows progress on the Progress primitive while uploading", async () => {
    const server = deferredUpload();
    const user = renderShadcnUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    await act(async () => server.progress(55));

    const bar = within(itemNamed("big.png")).getByRole("progressbar");
    expect(bar).toHaveAttribute("data-slot", "progress");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("removes a file from a ghost icon Button", async () => {
    const user = renderShadcnUploader();

    await user.upload(fileInput(), makeFile("gone.png"));
    await user.click(within(itemNamed("gone.png")).getByRole("button", { name: "Remove file" }));

    expect(items()).toHaveLength(0);
  });

  it("shows a rejection in an Alert and dismisses it", async () => {
    const user = renderShadcnUploader({ maxSize: 1 });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    const alert = screen.getByRole("status");
    expect(alert).toHaveAttribute("data-slot", "alert");

    await user.click(within(alert).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("never submits a surrounding form from its buttons", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const Form = ({ children }: { children: ReactNode }) => (
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>{children}</form>
    );
    const user = renderIntegration(shadcnFileUploader, { maxSize: 20 }, Form);

    await user.click(screen.getByRole("button", { name: "Browse" }));
    await user.upload(fileInput(), makeFile("kept.png"));
    await user.click(within(itemNamed("kept.png")).getByRole("button", { name: "Remove file" }));
    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));
    await user.click(within(screen.getByRole("status")).getByRole("button", { name: "Dismiss" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
