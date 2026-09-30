import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveDir } from "../serve.ts";

/** Sends a raw request path, so `..` segments reach the server unnormalised. */
function get(origin: string, path: string): Promise<{ status: number; type: string; body: string }> {
  const { hostname, port } = new URL(origin);
  return new Promise((done, fail) => {
    const req = request({ hostname, port, path, method: "GET" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => (body += chunk));
      res.on("end", () => done({ status: res.statusCode ?? 0, type: String(res.headers["content-type"] ?? ""), body }));
    });
    req.on("error", fail);
    req.end();
  });
}

describe("serveDir", () => {
  let parent: string;
  let server: { url: string; close(): Promise<void> };

  beforeAll(async () => {
    parent = mkdtempSync(join(tmpdir(), "serve-"));
    const root = join(parent, "site");
    mkdirSync(join(root, "theming"), { recursive: true });
    writeFileSync(join(root, "index.html"), "<p>home</p>");
    writeFileSync(join(root, "theming", "index.html"), "<p>theming</p>");
    writeFileSync(join(root, "app.css"), "body{}");
    writeFileSync(join(parent, "secret.txt"), "secret");
    server = await serveDir(root, 0);
  });

  afterAll(async () => {
    await server.close();
    rmSync(parent, { recursive: true, force: true });
  });

  it("serves a directory's index.html with an HTML content type", async () => {
    const res = await get(server.url, "/theming/");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/^text\/html/);
    expect(res.body).toBe("<p>theming</p>");
  });

  it("serves files with their content type", async () => {
    const res = await get(server.url, "/app.css");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/^text\/css/);
  });

  it("returns 404 for a directory without its trailing slash", async () => {
    expect((await get(server.url, "/theming")).status).toBe(404);
  });

  it("returns 404 for paths that leave the root", async () => {
    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/%2e%2e%2fsecret.txt", "/theming/..%2f..%2fsecret.txt"]) {
      const res = await get(server.url, path);
      expect(res.status, path).toBe(404);
      expect(res.body).not.toContain("secret");
    }
  });

  it("returns 404 for a missing file and a malformed escape", async () => {
    expect((await get(server.url, "/nope/")).status).toBe(404);
    expect((await get(server.url, "/%E0%A4%A")).status).toBe(404);
  });
});
