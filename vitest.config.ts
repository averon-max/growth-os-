import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["src/test-setup/prisma-mock.ts"],
    exclude: [
      // Integration tests — require live DATABASE_URL and real persisted data
      // Run separately with: DATABASE_URL=... npx vitest run --project=integration
      "**/node_modules/**",
      "**/saved-recovery-authority-audit.test.ts",
      "**/historical-claim-support-audit.test.ts",
      "**/historical-article-final-decision.test.ts",
      "**/final-replay-recovery-preflight.test.ts",
      "**/historical-article-recovery-audit.test.ts",
      "**/saved-article-contract-replay.test.ts",
      "**/final-recovered-article-preflight.test.ts",
    ],
  },
});
