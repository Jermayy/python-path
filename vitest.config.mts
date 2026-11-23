import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/content/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    coverage: { provider: "v8", include: ["src/modules/**", "src/shared/**"] },
  },
});
