import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "scripts/**/__tests__/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
