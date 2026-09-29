import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js swaps this for an empty module at build time; tests run
      // outside Next, so point it at a stub instead.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 20000,
    // The RLS suites each CREATE ROLE/GRANT a shared Postgres test role in
    // their own beforeAll — running those DDL statements from more than
    // one file at once races on Postgres's shared catalog rows ("tuple
    // concurrently updated"). Run test files sequentially to avoid it; the
    // whole suite still finishes in a couple of seconds.
    fileParallelism: false,
  },
});
