import { createTheme, ThemeProvider } from "@mui/material/styles";
import { act, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import type { FileUploaderProps } from "../../index";
import { deferredUpload, dropzone, fileInput, itemNamed, items, makeFile } from "../builders";
import { muiFileUploader } from "./mui/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * MUI wrapper
 *
 * `ThemeProvider` with a default theme.
 */
const theme = createTheme();
const Wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;

/**
 * Render MUI uploader
 *
 * `<FileUploader>` with MUI v7 parts inside `ThemeProvider`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderMuiUploader = (props: Partial<FileUploaderProps> = {}) => renderIntegration(muiFileUploader, props, Wrapper);

beforeAll(stubBrowserApis);

describe("MUI v7", () => {
  failOnReactWarnings();

  it("renders the drop zone with MUI's primitives", () => {
    renderMuiUploader();

    expect(dropzone()).toHaveClass("MuiPaper-root");
    expect(screen.getByRole("button", { name: "Browse" })).toHaveClass("MuiButton-root");
  });

  it("adds a picked file as a ListItem with an Avatar thumbnail", async () => {
    const user = renderMuiUploader();

    await user.upload(fileInput(), makeFile("photo.png"));

    const row = itemNamed("photo.png");
    expect(row).toHaveClass("MuiListItem-root");
    expect(within(row).getByRole("img")).toHaveClass("MuiAvatar-img");
  });

  it("shows progress on a LinearProgress while uploading", async () => {
    const server = deferredUpload();
    const user = renderMuiUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    await act(async () => server.progress(55));

    const bar = within(itemNamed("big.png")).getByRole("progressbar");
    expect(bar).toHaveClass("MuiLinearProgress-root");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("removes a file from an IconButton action", async () => {
    const user = renderMuiUploader();

    await user.upload(fileInput(), makeFile("gone.png"));
    await user.click(within(itemNamed("gone.png")).getByRole("button", { name: "Remove file" }));

    expect(items()).toHaveLength(0);
  });

  it("shows a rejection in an Alert and dismisses it", async () => {
    const user = renderMuiUploader({ maxSize: 1 });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    const alert = screen.getByRole("status");
    expect(alert).toHaveClass("MuiAlert-root");

    await user.click(within(alert).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
