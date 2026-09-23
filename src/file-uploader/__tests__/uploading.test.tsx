import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  deferredUpload,
  fileInput,
  itemNamed,
  items,
  makeFile,
  renderUploader,
} from "./builders";

describe("uploading", () => {
  it("uploads on pick, reports progress, then settles as done", async () => {
    const server = deferredUpload();
    const onUploaded = vi.fn();
    const onUrlsChange = vi.fn();
    const { user } = renderUploader({ upload: server.upload, onUploaded, onUrlsChange });

    await user.upload(fileInput(), makeFile("photo.png"));
    const row = itemNamed("photo.png");
    expect(within(row).getByText("Uploading…")).toBeInTheDocument();

    await act(async () => server.progress(42));
    expect(within(row).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");

    await act(async () => {
      server.resolve("https://cdn.test/photo.png");
    });

    await waitFor(() => expect(within(itemNamed("photo.png")).getByText("Uploaded")).toBeInTheDocument());
    expect(onUploaded).toHaveBeenCalledOnce();
    expect(onUrlsChange).toHaveBeenLastCalledWith(["https://cdn.test/photo.png"]);
  });

  it("shows the failure and retries the same file", async () => {
    const first = deferredUpload();
    const { user } = renderUploader({ upload: first.upload });

    await user.upload(fileInput(), makeFile("flaky.png"));
    await act(async () => {
      first.reject("503 Service Unavailable");
    });

    const row = itemNamed("flaky.png");
    await waitFor(() => expect(within(row).getByText("503 Service Unavailable")).toBeInTheDocument());

    await user.click(within(itemNamed("flaky.png")).getByRole("button", { name: "Retry upload" }));
    expect(first.calls).toBe(2);
    expect(within(itemNamed("flaky.png")).getByText("Uploading…")).toBeInTheDocument();
  });

  it("cancels an upload in flight and aborts the request", async () => {
    const server = deferredUpload();
    const { user } = renderUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("big.png"));
    expect(server.signal.aborted).toBe(false);

    await user.click(screen.getByRole("button", { name: "Cancel upload" }));
    expect(server.signal.aborted).toBe(true);
    expect(within(itemNamed("big.png")).getByText("Ready")).toBeInTheDocument();
  });

  it("aborts the request when the file is removed mid-upload", async () => {
    const server = deferredUpload();
    const { user } = renderUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("gone.png"));
    await user.click(screen.getByRole("button", { name: "Remove file" }));

    expect(server.signal.aborted).toBe(true);
    expect(items()).toHaveLength(0);
  });

  it("aborts in-flight uploads when the component unmounts", async () => {
    const server = deferredUpload();
    const { user, unmount } = renderUploader({ upload: server.upload });

    await user.upload(fileInput(), makeFile("leaving.png"));
    unmount();

    expect(server.signal.aborted).toBe(true);
  });

  it("keeps only `concurrency` uploads in flight", async () => {
    let started = 0;
    let peak = 0;
    const release: (() => void)[] = [];
    const upload = () => {
      started += 1;
      peak = Math.max(peak, started);
      return new Promise<void>((resolve) =>
        release.push(() => {
          started -= 1;
          resolve();
        }),
      );
    };

    const { user } = renderUploader({ upload, multiple: true, concurrency: 2 });
    await user.upload(fileInput(), [makeFile("1.png"), makeFile("2.png"), makeFile("3.png"), makeFile("4.png")]);

    expect(peak).toBe(2);
    await act(async () => {
      release.shift()?.();
    });
    expect(peak).toBe(2);
    await act(async () => release.forEach((fn) => fn()));
  });

  it("waits for uploadAll when autoUpload is off", async () => {
    const server = deferredUpload();
    const { user } = renderUploader({ upload: server.upload, autoUpload: false });

    await user.upload(fileInput(), makeFile("later.png"));
    expect(server.calls).toBe(0);
    expect(within(itemNamed("later.png")).getByText("Ready")).toBeInTheDocument();
  });

  it("never uploads without an upload function", async () => {
    const onUrlsChange = vi.fn();
    const { user } = renderUploader({ onUrlsChange });

    await user.upload(fileInput(), makeFile("local.csv", "text/csv"));

    const row = itemNamed("local.csv");
    expect(within(row).queryByRole("progressbar")).toBeNull();
    expect(within(row).queryByText("Uploading…")).toBeNull();
    expect(onUrlsChange).toHaveBeenLastCalledWith([]);
  });

  it("takes a plain url string as the upload result", async () => {
    const upload = async () => "https://cdn.test/plain.png";
    const onUrlsChange = vi.fn();
    const { user } = renderUploader({ upload, onUrlsChange });

    await user.upload(fileInput(), makeFile("plain.png"));
    await waitFor(() => expect(onUrlsChange).toHaveBeenLastCalledWith(["https://cdn.test/plain.png"]));
  });

  it("keeps what the server returned alongside the url", async () => {
    const upload = async () => ({ url: "https://cdn.test/a.png", data: { id: "media_1" } });
    const onValueChange = vi.fn();
    const { user } = renderUploader({ upload, onValueChange });

    await user.upload(fileInput(), makeFile("a.png"));
    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ status: "done", url: "https://cdn.test/a.png", data: { id: "media_1" } }),
      ]),
    );
  });
});
