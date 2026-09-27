import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSlotsmithServer } from "./server";

export { createSlotsmithServer } from "./server";
export type { SlotsmithServerOptions } from "./server";

/**
 * Run MCP server
 *
 * Starts the server on stdio, the transport every MCP client can spawn. The
 * process then lives as long as the client keeps the pipe open. Nothing may
 * be written to stdout except protocol messages, so diagnostics go to stderr.
 *
 * @returns Once the server is connected.
 */
export async function runMcpServer(): Promise<void> {
  const server = createSlotsmithServer();
  await server.connect(new StdioServerTransport());
}
