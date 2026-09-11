/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pagesはリポジトリ名のサブパスで配信されるため、baseを合わせる（技術提案書21章）。
export default defineConfig({
  base: "/Welgain_analysis/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
