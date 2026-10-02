/**
 * Typecheck on stop
 *
 * Runs the library's `tsc --noEmit` when a turn ends with uncommitted changes
 * under `src/`. A failure exits 2, so the errors go back to Claude to fix
 * before the turn closes. A second stop in the same chain always passes, so
 * errors Claude cannot fix never trap the session in a loop.
 */
import { execFileSync, execSync } from "node:child_process";

const input = JSON.parse(await new Response(process.stdin).text() || "{}");
if (input.stop_hook_active) process.exit(0);

const changed = execFileSync("git", ["status", "--porcelain", "--", "src", "tsconfig.json"], { encoding: "utf8" });
if (!changed.trim()) process.exit(0);

try {
  execSync("pnpm -s typecheck", { encoding: "utf8", stdio: "pipe" });
} catch (error) {
  process.stderr.write(`pnpm typecheck failed:\n${error.stdout ?? ""}${error.stderr ?? ""}`);
  process.exit(2);
}
