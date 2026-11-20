const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  testMatch: "desktop.spec.cjs",
  workers: 1,
  timeout: 90000,
  reporter: "list",
  use: { trace: "retain-on-failure" },
});
