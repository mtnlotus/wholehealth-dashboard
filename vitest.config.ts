import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

const localCoachSkills = path.resolve(__dirname, "../coach-skills/src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: fs.existsSync(localCoachSkills)
      ? { "coach-skills": localCoachSkills }
      : {},
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
