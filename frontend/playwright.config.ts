import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const scratch =
  process.env.JCODE_SCRATCH_DIR || join(process.cwd(), ".test-artifacts");
mkdirSync(scratch, { recursive: true });
process.env.JCODE_SCRATCH_DIR = scratch;
const dir = mkdtempSync(join(scratch, "leaklens-browser-"));
for (const role of ["OPERATOR", "CREW", "INGEST"])
  process.env["LEAKLENS_" + role + "_TOKEN"] ||=
    randomBytes(32).toString("hex");
process.env.LEAKLENS_DB = join(dir, "browser.sqlite3");
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:5178", headless: true },
  webServer: [
    {
      command:
        "cd ../backend && .venv/bin/python -m uvicorn leaklens.api:create_app --factory --host 127.0.0.1 --port 8018",
      url: "http://127.0.0.1:8018/health",
      reuseExistingServer: false,
    },
    {
      command: `LEAKLENS_API_TARGET=http://127.0.0.1:8018 npm run ${process.env.LEAKLENS_PRODUCTION_TEST ? "preview" : "dev"} -- --port 5178 --strictPort`,
      url: "http://127.0.0.1:5178",
      reuseExistingServer: false,
    },
  ],
});
