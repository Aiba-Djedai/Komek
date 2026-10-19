import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command:
      "PORT=3002 DATABASE_PATH=/tmp/komek-browser-" +
      Date.now() +
      '.sqlite npx concurrently -k "node server/index.js" "vite --host 127.0.0.1 --port 5174 --strictPort"',
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    timeout: 30000,
  },
  workers: 1,
  reporter: "list",
});
