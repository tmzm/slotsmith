import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "scripts/**/__tests__/**/*.test.ts"],
    // Regenerate the knowledge from the current source before any suite reads it.
    globalSetup: ["./scripts/__tests__/setup.ts"],
    testTimeout: 20_000,
  },
});
