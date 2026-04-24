import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "coach-skills": path.resolve(__dirname, "../coach-skills/src/index.ts"),
    },
  },
  define: {
    global: "globalThis",
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api/shc": {
        target: "http://localhost:3000",
        rewrite: (p) => p.replace(/^\/api\/shc/, "/shc"),
      },
    },
  },
});
