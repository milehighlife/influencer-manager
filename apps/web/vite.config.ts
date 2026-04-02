import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
  resolve: {
    alias: [
      {
        find: /^@influencer-manager\/shared\/(.*)$/,
        replacement: resolve(__dirname, "../../packages/shared/src/$1"),
      },
    ],
  },
});
