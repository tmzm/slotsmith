import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileUploader } from "../FileUploader";
import { fileUploaderFallbacks } from "../slots/fallbacks";
import type { UploaderActionSlotProps, UploaderTriggerSlotProps } from "../slots/types";
import { deferredUpload, dropzone, fileInput, items, makeFile, renderUploader } from "./builders";

describe("variants", () => {
  it("shows the picked image in the drop zone in tile mode", async () => {
    const { user, container } = renderUploader({ variant: "tile", accept: "image/*" });
    await user.upload(fileInput(), makeFile("avatar.png", "image/png"));

    /** No list in tile mode: the zone itself became the preview. */
    expect(items()).toHaveLength(0);
    expect(container.firstElementChild).toHaveAttribute("data-variant", "tile");
    expect(within(dropzone()).getByRole("img")).toHaveAccessibleName("Preview of avatar.png");
    expect(within(dropzone()).getByRole("button", { name: "Remove file" })).toBeInTheDocument();
  });

  it("puts the progress over the tile while it uploads", async () => {
    const server = deferredUpload();
    const { user } = renderUploader({ variant: "tile", upload: server.upload });

    await user.upload(fileInput(), makeFile("avatar.png"));
    await act(async () => server.progress(60));

    expect(within(dropzone()).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
  });

  it("replaces the tile's image when a new one is picked", async () => {
    const { user } = renderUploader({ variant: "tile" });
    await user.upload(fileInput(), makeFile("one.png"));
    await user.upload(fileInput(), makeFile("two.png"));

    expect(within(dropzone()).getByRole("img")).toHaveAccessibleName("Preview of two.png");
  });

  it("renders no drop zone in compact mode", async () => {
    const { user } = renderUploader({ variant: "compact" });
    expect(screen.queryByRole("button", { name: "Add files" })).toBeNull();

    await user.upload(fileInput(), makeFile("note.txt", "text/plain"));
    expect(items()).toHaveLength(1);
  });

  it("names the limits in the hint so they're known before picking", () => {
    renderUploader({ accept: "image/*", maxSize: 2 * 1024 * 1024, maxFiles: 3, multiple: true });
    expect(screen.getByText("image/* · up to 2 MB · max 3 files")).toBeInTheDocument();
  });
});

describe("slots and labels", () => {
  it("replaces only the parts that are passed", async () => {
    const Trigger = ({ onClick, children }: UploaderTriggerSlotProps) => (
      <button type="button" data-library="trigger" onClick={onClick}>
        {children}
      </button>
    );
    const Action = ({ action, onClick, ...aria }: UploaderActionSlotProps) => (
      <button type="button" data-library={action} onClick={onClick} {...aria} />
    );

    const user = userEvent.setup();
    render(<FileUploader components={{ Trigger, Action }} />);

    expect(screen.getByRole("button", { name: "Browse" })).toHaveAttribute("data-library", "trigger");
    await user.upload(fileInput(), makeFile("x.png"));
    expect(screen.getByRole("button", { name: "Remove file" })).toHaveAttribute("data-library", "remove");
    /** Unreplaced parts still use the fallbacks. */
    expect(document.querySelector(".sfu__zone")).not.toBeNull();
  });

  it("lets a part wrap its fallback", () => {
    render(
      <FileUploader
        components={{
          Dropzone: (props) => <fileUploaderFallbacks.Dropzone {...props} className="mine" />,
        }}
      />,
    );
    expect(dropzone()).toHaveClass("sfu__zone", "mine");
  });

  it("translates every string it renders", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <FileUploader
          labels={{
            title: "اسحب الملفات هنا",
            browse: "تصفح",
            dropzone: "إضافة ملفات",
            remove: "إزالة الملف",
            ready: "جاهز",
          }}
        />
      </div>,
    );

    expect(screen.getByText("اسحب الملفات هنا")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تصفح" })).toBeInTheDocument();

    const input = screen.getByLabelText("إضافة ملفات", { selector: "input" });
    await user.upload(input, makeFile("ملف.png"));
    expect(screen.getByRole("button", { name: "إزالة الملف" })).toBeInTheDocument();
  });

  it("reports rejections instead of shouting through a toast", async () => {
    const onReject = vi.fn();
    const { user } = renderUploader({ maxSize: 1, onReject });

    await user.upload(fileInput(), makeFile("heavy.png", "image/png", 50));

    /** Politely announced, dismissible, and the app decides what else to do. */
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await user.click(within(status).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(onReject).toHaveBeenCalledOnce();
  });
});
