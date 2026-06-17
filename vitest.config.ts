import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // mirror the "@/..." path alias used across the app
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
