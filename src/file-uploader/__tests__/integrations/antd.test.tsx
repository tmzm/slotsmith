import { ConfigProvider, theme } from "antd";
import { act, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import type { FileUploaderProps } from "../../index";
import { deferredUpload, dropzone, fileInput, itemNamed, items, makeFile } from "../builders";
import { antdFileUploader } from "./antd/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Ant Design wrapper
 *
 * `ConfigProvider` with the default theme.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;

/** The default theme's tokens, to check the colours the parts paint with. */
const token = theme.getDesignToken();

/**
 * CSS colour
 *
 * @param color - A token colour, in any CSS syntax.
 * @returns The same colour as the DOM reports it.
 */
function cssColor(color: string) {
  const probe = document.createElement("i");
  probe.style.backgroundColor = color;
  return probe.style.backgroundColor;
}

/**
 * Render Ant Design uploader
 *
 * `<FileUploader>` with Ant Design v6 parts inside `ConfigProvider`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderAntdUploader = (props: Partial<FileUploaderProps> = {}) => renderIntegration(antdFileUploader, props, Wrapper);

beforeAll(stubBrowserApis);

describe("Ant Design v6", () => {
  failOnReactWarnings();

  it("renders the drop zone like Ant's dragger, with an Ant Button", () => {
    renderAntdUploader();

    expect(dropzone().style.borderStyle).toBe("dashed");
    expect(dropzone().style.backgroundColor).toBe(cssColor(token.colorFillAlter));
    expect(screen.getByRole("button", { name: "Browse" })).toHaveClass("ant-btn");
  });

  it("marks the drop zone while a file is over it", () => {
    renderAntdUploader();

    fireEvent.dragEnter(dropzone(), { dataTransfer: { files: [], types: ["Files"] } });

    expect(dropzone()).toHaveAttribute("data-dragging");
    expect(dropzone().style.borderColor).toBe(cssColor(token.colorPrimary));
  });

  it("adds a picked file as a row with an Avatar thumbnail", async () => {
    const user = renderAntdUploader();

    await user.upload(fileInput(), makeFile("photo.png"));

    const row = itemNamed("photo.png");
    expect(within(row).getByRole("img", { name: "Preview of photo.png" }).closest(".ant-avatar")).not.toBeNull();
  });

  it("shows progress on Ant's Progress while uploading", async () => {
    const server = deferredUpload();
    const user = renderAntdUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    await act(async () => server.progress(55));

    const bar = within(itemNamed("big.png")).getByRole("progressbar");
    expect(bar).toHaveClass("ant-progress");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("removes a file from a Button action", async () => {
    const user = renderAntdUploader();

    await user.upload(fileInput(), makeFile("gone.png"));
    const remove = within(itemNamed("gone.png")).getByRole("button", { name: "Remove file" });
    expect(remove).toHaveClass("ant-btn");
    await user.click(remove);

    expect(items()).toHaveLength(0);
  });

  it("shows a rejection in an Alert and dismisses it", async () => {
    const user = renderAntdUploader({ maxSize: 1 });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    const alert = screen.getByRole("status");
    expect(alert).toHaveClass("ant-alert-error");

    await user.click(within(alert).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
