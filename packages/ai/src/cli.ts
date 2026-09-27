/**
 * slotsmith-ai
 *
 * The command-line entry point. Each subcommand is a separate view over the
 * same generated knowledge of the slotsmith components.
 *
 * @packageDocumentation
 */

const USAGE = `Usage: slotsmith-ai <command>

Commands:
  mcp    Start the slotsmith MCP server on stdio`;

/**
 * Main
 *
 * Dispatches the first argument to its subcommand.
 *
 * @param argv - The arguments after the executable and script path.
 * @returns The process exit code.
 */
async function main(argv: string[]): Promise<number> {
  const [command] = argv;
  if (command === "--help" || command === "-h" || command === undefined) {
    process.stdout.write(`${USAGE}\n`);
    return command === undefined ? 1 : 0;
  }
  process.stderr.write(`Unknown command: ${command}\n\n${USAGE}\n`);
  return 1;
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code !== 0) process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exitCode = 1;
  },
);
