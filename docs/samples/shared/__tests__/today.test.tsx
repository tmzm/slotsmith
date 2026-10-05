// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRERENDER_TODAY, useToday } from "@samples/shared/today";

function Today() {
  return <p data-testid="today">{useToday()}</p>;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 4, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useToday", () => {
  it("is a fixed ISO date", () => {
    expect(PRERENDER_TODAY).toBe("2026-03-16");
  });

  it("returns the fixed date when rendered on the server", () => {
    expect(renderToString(<Today />)).toContain(`>${PRERENDER_TODAY}<`);
  });

  it("returns the real date when rendered in the browser", () => {
    render(<Today />);
    expect(screen.getByTestId("today").textContent).toBe("2026-10-04");
  });

  it("hydrates the server markup without a mismatch, then shows the real date", async () => {
    const error = vi.spyOn(console, "error");
    const recoverable = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(<Today />);
    expect(container.textContent).toBe(PRERENDER_TODAY);

    const root = await act(async () => hydrateRoot(container, <Today />, { onRecoverableError: recoverable }));
    expect(container.textContent).toBe("2026-10-04");
    expect(recoverable).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });
});
