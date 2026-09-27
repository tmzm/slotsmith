import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  // The bin is executed directly, so it needs a shebang.
  banner: { js: "#!/usr/bin/env node" },
});
