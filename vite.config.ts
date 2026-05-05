import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

const localCoachNotes = path.resolve(__dirname, "../coach-notes/src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: fs.existsSync(localCoachNotes)
      ? { "coach-notes": localCoachNotes }
      : {},
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
