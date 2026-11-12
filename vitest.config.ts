import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Pure logic only: Node already provides Web Crypto, CompressionStream and navigator.locks.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
