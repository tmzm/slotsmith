/**
 * slotsmith-ai
 *
 * The command-line entry point. Each subcommand is a separate view over the
 * same generated knowledge of the slotsmith components.
 *
 * @packageDocumentation
 */

import { runAdd } from "./cli/add";
import { runMcpServer } from "./mcp";

const USAGE = `Usage: slotsmith-ai <command>

Commands:
  mcp    Start the slotsmith MCP server on stdio
  add    Copy a ready-made adapter into the project, as source you own

Add it to an MCP client, e.g. Claude Code:
  claude mcp add slotsmith -- npx -y slotsmith-ai mcp

Add an adapter:
  npx slotsmith-ai add date-picker --ui mui
  npx slotsmith-ai add --help`;

/**
 * Main
 *
 * Dispatches the first argument to its subcommand.
 *
 * @param argv - The arguments after the executable and script path.
 * @returns The process exit code, or `undefined` for a command that keeps running.
 */
async function main(argv: string[]): Promise<number | undefined> {
  const [command] = argv;
  switch (command) {
    case "mcp":
      await runMcpServer();
      return undefined;
    case "add":
      return runAdd(argv.slice(1), {
        cwd: process.cwd(),
        out: (text) => process.stdout.write(`${text}\n`),
        err: (text) => process.stderr.write(`${text}\n`),
      });
    case "--help":
    case "-h":
    case "help":
      process.stdout.write(`${USAGE}\n`);
      return 0;
    case undefined:
      process.stderr.write(`${USAGE}\n`);
      return 1;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${USAGE}\n`);
      return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code !== undefined && code !== 0) process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exitCode = 1;
  },
);
