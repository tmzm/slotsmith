import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  dropFiles,
  dropzone,
  fileInput,
  itemNamed,
  items,
  makeFile,
  renderUploader,
} from "./builders";

describe("picking files", () => {
  it("adds a file picked through the input", async () => {
    const onFilesChange = vi.fn();
    const { user } = renderUploader({ onFilesChange });
    const file = makeFile("report.pdf", "application/pdf");

    await user.upload(fileInput(), file);

    expect(items()).toHaveLength(1);
    expect(within(items()[0]!).getByText("report.pdf")).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([file]);
  });

  it("adds dropped files and clears the drag state", async () => {
    renderUploader({ multiple: true });
    const zone = dropzone();

    fireEvent.dragEnter(zone, { dataTransfer: { files: [], types: ["Files"] } });
    expect(zone).toHaveAttribute("data-dragging");

    await dropFiles(zone, [makeFile("a.png"), makeFile("b.png")]);
    expect(zone).not.toHaveAttribute("data-dragging");
    expect(items()).toHaveLength(2);
  });

  it("keeps the drag state while moving over a child element", () => {
    renderUploader();
    const zone = dropzone();
    const child = within(zone).getByText("Browse");
    const dataTransfer = { files: [], types: ["Files"] };

    fireEvent.dragEnter(zone, { dataTransfer });
    fireEvent.dragEnter(child, { dataTransfer });
    fireEvent.dragLeave(zone, { dataTransfer });
    expect(zone).toHaveAttribute("data-dragging");

    fireEvent.dragLeave(child, { dataTransfer });
    expect(zone).not.toHaveAttribute("data-dragging");
  });

  it("replaces the file when multiple is off", async () => {
    const { user } = renderUploader();
    await user.upload(fileInput(), makeFile("first.png"));
    await user.upload(fileInput(), makeFile("second.png"));

    expect(items()).toHaveLength(1);
    expect(screen.getByText("second.png")).toBeInTheDocument();
  });

  it("opens the dialog from the keyboard", async () => {
    renderUploader();
    const input = fileInput();
    const click = vi.spyOn(input, "click");

    dropzone().focus();
    fireEvent.keyDown(dropzone(), { key: "Enter" });
    fireEvent.keyDown(dropzone(), { key: " " });

    expect(click).toHaveBeenCalledTimes(2);
  });

  it("removes a file and lets the same one be picked again", async () => {
    const onFilesChange = vi.fn();
    const { user } = renderUploader({ onFilesChange });
    const file = makeFile("again.png");

    await user.upload(fileInput(), file);
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    expect(items()).toHaveLength(0);
    expect(onFilesChange).toHaveBeenLastCalledWith([]);

    await user.upload(fileInput(), file);
    expect(items()).toHaveLength(1);
  });

  it("keeps two files with the same name apart", async () => {
    const { user } = renderUploader({ multiple: true });
    await user.upload(fileInput(), [makeFile("same.png"), makeFile("same.png")]);
    expect(items()).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Remove file" })[0]!);
    expect(items()).toHaveLength(1);
  });

  it("refuses dropped files the constraints reject and says why", async () => {
    const onReject = vi.fn();
    renderUploader({ accept: "image/*", maxSize: 4, onReject, multiple: true });

    /**
     * Dropped, not picked: the file dialog already filters by `accept`, so the
     * JS-side type check is there for drops, which the browser never filters.
     */
    await dropFiles(dropzone(), [
      makeFile("doc.pdf", "application/pdf"),
      makeFile("big.png", "image/png", 100),
    ]);

    expect(items()).toHaveLength(0);
    const alert = screen.getByRole("status");
    expect(within(alert).getByText(/doc\.pdf is not an allowed file type/)).toBeInTheDocument();
    expect(within(alert).getByText(/big\.png is too large \(max 4 B\)/)).toBeInTheDocument();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("stops at maxFiles and explains the rest", async () => {
    const { user } = renderUploader({ multiple: true, maxFiles: 2 });
    await user.upload(fileInput(), [makeFile("a.png"), makeFile("b.png"), makeFile("c.png")]);

    expect(items()).toHaveLength(2);
    expect(screen.getByText("Only 2 files allowed")).toBeInTheDocument();
  });

  it("does nothing at all when disabled", async () => {
    renderUploader({ disabled: true });
    const zone = dropzone();

    expect(zone).toHaveAttribute("aria-disabled", "true");
    expect(zone).toHaveAttribute("tabindex", "-1");
    await dropFiles(zone, [makeFile()]);
    expect(items()).toHaveLength(0);
  });

  it("starts from existing urls when editing a record", () => {
    renderUploader({ defaultValue: ["https://cdn.test/logo.png"], multiple: true });
    const item = itemNamed("logo.png");
    expect(item).toBeTruthy();
    expect(within(item).getByRole("img")).toHaveAttribute("src", "https://cdn.test/logo.png");
  });

  it("previews a picked image straight away, without waiting for a server", async () => {
    const { user } = renderUploader();
    await user.upload(fileInput(), makeFile("shot.png", "image/png"));

    await waitFor(() =>
      expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("blob:")),
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Preview of shot.png");
  });
});
