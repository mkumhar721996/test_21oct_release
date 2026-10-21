import { defineConfig } from "@playwright/test";

const port = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
