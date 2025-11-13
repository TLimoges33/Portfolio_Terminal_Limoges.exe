import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/**", "tests/**", "*.config.js", "dist/**"],
    },
  },
  build: {
    target: "es2015",
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
      },
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  server: {
    port: 8000,
    open: true,
  },
  preview: {
    port: 8000,
  },
});
