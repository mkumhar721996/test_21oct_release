import { defineConfig } from "@playwright/test";

const port = 3000;
const apiPort = 3101;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${port}` },
  webServer: [
    {
      command: "node tests/e2e/stub-api.mjs",
      env: { STUB_API_PORT: String(apiPort) },
      url: `http://localhost:${apiPort}/defects`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm build && pnpm start --port ${port}`,
      env: {
        API_BASE_URL: `http://localhost:${apiPort}`,
        SESSION_SECRET: "fake-session-secret",
        API_SERVICE_TOKEN: "fake-service-token",
      },
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
