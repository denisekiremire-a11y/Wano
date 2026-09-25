import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The real "server-only" package throws unconditionally outside
      // Next's build (which aliases it away via webpack) — see
      // create-compiler-aliases.js. Stub it for the test runner instead.
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    testTimeout: 20000,
  },
});
