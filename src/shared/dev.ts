/**
 * Node's `process`, typed locally
 *
 * `@types/node`'s ambient global is not visible under every tsconfig this
 * file is built with (the declaration-emit pass excludes it), so this types
 * only the one property read below instead of depending on that ambient
 * global. The runtime check stays a literal `process.env.NODE_ENV` so a
 * consumer's bundler can still replace it at build time.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;

/**
 * Is development
 *
 * `process` is guarded because a browser bundle that skips define-time
 * replacement of `process.env.NODE_ENV` has no such global at all; such a
 * bundle counts as development.
 *
 * @returns `false` only when `NODE_ENV` is `"production"`.
 */
export function isDevelopment(): boolean {
  return !(typeof process !== "undefined" && process.env.NODE_ENV === "production");
}

/**
 * Development warnings
 *
 * A set of warnings that are each logged once per key and only in
 * development: they point at setup mistakes to notice while building, not
 * something to log in production.
 *
 * @returns `warn(key, message)`, and `reset()` to forget what was logged (for tests).
 */
export function createDevWarnings() {
  const warned = new Set<string>();
  return {
    warn(key: string, message: string): void {
      if (!isDevelopment() || warned.has(key)) return;
      warned.add(key);
      console.warn(message);
    },
    reset(): void {
      warned.clear();
    },
  };
}
