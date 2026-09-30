/**
 * A static server for a built site, on `node:http`. Directory format only:
 * `/x/` serves `/x/index.html`; any path that is not a file is a 404, as a
 * missing trailing slash would be on the host.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

/**
 * Serves a directory until closed.
 *
 * @param dir - The directory to serve.
 * @param port - The port; 0 picks a free one.
 * @returns The origin it listens on (`http://127.0.0.1:<port>`) and a close function.
 */
export function serveDir(dir: string, port: number): Promise<{ url: string; close(): Promise<void> }> {
  const root = resolve(dir);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      const file = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
      if (file !== root && !file.startsWith(root + sep)) throw new Error("outside the root");
      if (!(await stat(file)).isFile()) throw new Error("not a file");
      const body = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  return new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => {
      const { port: bound } = server.address() as AddressInfo;
      done({
        url: `http://127.0.0.1:${bound}`,
        close: () =>
          new Promise<void>((closed) => {
            server.closeAllConnections();
            server.close(() => closed());
          }),
      });
    });
  });
}
