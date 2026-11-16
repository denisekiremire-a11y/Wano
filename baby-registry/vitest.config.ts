import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@data": path.resolve(__dirname, "data"),
      // `server-only` throws outside a React Server environment; tests import server modules directly.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
