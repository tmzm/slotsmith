/**
 * Lockfile guard
 *
 * Blocks direct edits to `pnpm-lock.yaml`. Only pnpm writes the lockfile;
 * change `package.json` and run `pnpm install` instead.
 */
const input = JSON.parse(await new Response(process.stdin).text() || "{}");
const path = String(input.tool_input?.file_path ?? "");

if (/(^|[\\/])pnpm-lock\.yaml$/.test(path)) {
  process.stderr.write("pnpm-lock.yaml is written by pnpm only. Change package.json and run `pnpm install` instead.\n");
  process.exit(2);
}
