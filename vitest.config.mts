import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // "server-only" throws outside a React Server Components bundle; tests import server code directly.
      "server-only": `${root}tests/stubs/server-only.ts`,
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          environment: "node",
          include: ["tests/convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup.ts"],
        },
      },
    ],
  },
});
