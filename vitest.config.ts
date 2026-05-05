import { defineConfig } from "vitest/config";
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts", "**/*.integration.test.tsx"],
  },
});
