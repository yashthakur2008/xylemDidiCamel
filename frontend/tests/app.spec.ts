import { test, expect, type Page } from "@playwright/test";
test("public website explains quality and links to real workspaces", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Clean at the plant/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open operations", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Network intelligence" }),
  ).toBeVisible();
  await page.goto("/crew");
  await expect(
    page.getByRole("heading", { name: "Field notebook" }),
  ).toBeVisible();
});
async function credentials(page: Page) {
  await page.getByText("Demo access", { exact: true }).click();
  for (const role of ["Operator", "Crew", "Ingest"])
    await page
      .getByLabel(role + " token", { exact: true })
      .fill(process.env["LEAKLENS_" + role.toUpperCase() + "_TOKEN"]!);
}
test("real incident crosses operations and crew through failed sample recovery", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8018/api/v1/demo/reset", {
    headers: { Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN },
    data: { confirm: "RESET DEMO" },
  });
  await page.goto("/operations");
  await credentials(page);
  await page.getByRole("button", { name: "Simulate main break" }).click();
  await expect(page.getByLabel("Advisory draft")).toBeVisible();
  await page
    .getByRole("button", { name: "Approve simulated advisory", exact: true })
    .click();
  await page.getByLabel("Crew assignment").fill("CREW-01");
  await page
    .getByRole("button", { name: "Approve crew assignment", exact: true })
    .click();
  await page.getByRole("link", { name: "Crew app ↗" }).click();
  await page
    .getByRole("button", { name: "Record repair", exact: true })
    .click();
  await page.getByRole("button", { name: "Record flush", exact: true }).click();
  await page.getByLabel("Sample ID").fill("FAILED-01");
  await page.getByLabel("Sample result").selectOption("failed");
  await page
    .getByRole("button", { name: "Record sample", exact: true })
    .click();
  await expect(
    page.getByText("Reflush required", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Record flush", exact: true }).click();
  for (const id of ["CLEAR-01", "CLEAR-02"]) {
    await page.getByLabel("Sample ID").fill(id);
    await page.getByLabel("Sample result").selectOption("clear");
    await page
      .getByRole("button", { name: "Record sample", exact: true })
      .click();
    await expect(page.getByText(id, { exact: true })).toBeVisible();
  }
  await page.getByLabel("Sample ID").fill("CLEAR-02");
  await page
    .getByRole("button", { name: "Record sample", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Duplicate sample ID");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: process.env.JCODE_SCRATCH_DIR + "/leaklens-visuals/crew-active.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Operations", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve simulated all-clear", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Pressure must be fresh and recovered",
  );
  await page
    .getByRole("button", { name: "Submit recovery reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve simulated all-clear", exact: true })
    .click();
  await expect(
    page.getByText("Incident closed", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Incident closed", { exact: true }),
  ).toBeVisible();
  await page.getByText("Demo access", { exact: true }).click();
  await expect(page.getByLabel("Operator token", { exact: true })).toHaveValue(
    "",
  );
  const events = await (
    await request.get("http://127.0.0.1:8018/api/v1/events")
  ).json();
  expect(events.events[0].status).toBe("closed");
  expect(events.events[0].samples).toHaveLength(3);
});
test("responsive routes and accessible keyboard entry", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of ["/", "/operations", "/crew"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBeTruthy();
    }
  }
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
test("manifest declares installable crew entry and real icons", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.headers()["content-type"]).toContain("json");
  const manifest = await response.json();
  expect(manifest.start_url).toBe("/crew");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("image");
  }
});
test("wrong role is rejected, reset needs confirmation, offline never submits", async ({
  page,
  context,
}) => {
  await page.goto("/operations");
  await page.getByText("Demo access", { exact: true }).click();
  await page
    .getByLabel("Operator token", { exact: true })
    .fill(process.env.LEAKLENS_CREW_TOKEN!);
  await page.getByRole("button", { name: "Simulate main break" }).click();
  await expect(page.getByRole("alert")).toContainText("403");
  await page.getByText("Reset demonstration", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Delete demo data" }),
  ).toBeDisabled();
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Simulate main break" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Offline");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(
    page.getByRole("button", { name: "Simulate main break" }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).not.toContainText("Offline");
});
test("production PWA caches only static shell and opens offline without jobs", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.LEAKLENS_PRODUCTION_TEST,
    "Service worker only registers in production builds",
  );
  await page.goto("/crew");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBeTruthy();
  const client = await context.newCDPSession(page);
  const install = await client.send("Page.getInstallabilityErrors");
  expect(install.installabilityErrors).toEqual([]);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
  });
  expect(cached.some((x) => x.includes("/assets/"))).toBeTruthy();
  expect(cached.some((x) => x.includes("/api/"))).toBeFalsy();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Field notebook" }),
  ).toBeVisible();
  await expect(
    page.getByText("No approved jobs yet.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Connection unavailable");
  await context.setOffline(false);
});
test("pipe schematic compares normal pressure with intrusion potential", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Normal pressure", exact: true })
    .click();
  await expect(
    page.getByText("OUTWARD LEAKAGE / NORMAL PRESSURE", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pressure loss", exact: true })
    .click();
  await expect(
    page.getByText("POTENTIAL INWARD FLOW / PRESSURE LOSS", { exact: true }),
  ).toBeVisible();
});
test("slow real reads still settle and unsaved drafts survive another operator edit", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8018/api/v1/demo/reset", {
    headers: { Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN },
    data: { confirm: "RESET DEMO" },
  });
  const made = await (
    await request.post("http://127.0.0.1:8018/api/v1/demo/scenario", {
      headers: {
        Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN,
      },
      data: { segment_id: "CA-001" },
    })
  ).json();
  await page.route("**/api/v1/network", async (route) => {
    const response = await route.fetch();
    await new Promise((r) => setTimeout(r, 6000));
    await route.fulfill({ response });
  });
  await page.goto("/operations");
  await expect(page.getByLabel("Advisory draft")).toBeVisible({
    timeout: 14000,
  });
  await page.unroute("**/api/v1/network");
  await credentials(page);
  await page
    .getByLabel("Advisory draft")
    .fill("SIMULATION ONLY: my unsaved local draft.");
  const remote = "SIMULATION ONLY: revised by a second operator.";
  const update = await request.patch(
    `http://127.0.0.1:8018/api/v1/events/${made.event.id}/advisory`,
    {
      headers: {
        Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN,
      },
      data: { draft: remote, expected_draft: made.event.advisory.draft },
    },
  );
  expect(update.ok()).toBeTruthy();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByText(/Another operator changed/)).toBeVisible();
  await expect(page.getByLabel("Advisory draft")).toHaveValue(
    "SIMULATION ONLY: my unsaved local draft.",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Discard local edits and load server draft" })
    .click();
  await expect(page.getByLabel("Advisory draft")).toHaveValue(remote);
});
test("stalled mutation response releases busy and reconciles committed action", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8018/api/v1/demo/reset", {
    headers: { Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN },
    data: { confirm: "RESET DEMO" },
  });
  await page.route("**/api/v1/demo/scenario", async (route) => {
    const response = await route.fetch();
    await new Promise((r) => setTimeout(r, 13000));
    await route.fulfill({ response }).catch(() => {});
  });
  await page.goto("/operations");
  await credentials(page);
  await page.getByRole("button", { name: "Simulate main break" }).click();
  await expect(page.getByRole("alert")).toContainText("timed out", {
    timeout: 18000,
  });
  await expect(page.getByLabel("Advisory draft")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate main break" }),
  ).toBeEnabled();
  const events = await (
    await request.get("http://127.0.0.1:8018/api/v1/events")
  ).json();
  expect(events.events).toHaveLength(1);
});
test("risk contributions match the API and old readings become visibly stale", async ({
  page,
  request,
}) => {
  const headers = {
    Authorization: "Bearer " + process.env.LEAKLENS_OPERATOR_TOKEN,
  };
  await request.post("http://127.0.0.1:8018/api/v1/demo/reset", {
    headers,
    data: { confirm: "RESET DEMO" },
  });
  const network = await (
    await request.get("http://127.0.0.1:8018/api/v1/network")
  ).json();
  await page.goto("/operations");
  for (const segment of network.segments) {
    await page.getByRole("button", { name: new RegExp(segment.name) }).click();
    await expect(page.locator(".factor-head")).toContainText(
      `${segment.risk.score} / 100`,
    );
    for (const factor of segment.risk.factors)
      await expect(
        page
          .locator(".factor")
          .filter({ hasText: factor.name.replaceAll("_", " ") }),
      ).toContainText(
        `${factor.value} × ${factor.weight * 100}% = ${factor.contribution}`,
      );
  }
  const reading = await request.post("http://127.0.0.1:8018/api/v1/readings", {
    headers: { Authorization: "Bearer " + process.env.LEAKLENS_INGEST_TOKEN },
    data: {
      segment_id: "CA-003",
      pressure_psi: 45,
      observed_at: new Date(Date.now() - 119000).toISOString(),
    },
  });
  expect(reading.status()).toBe(201);
  await expect(page.locator(".pressure-number .badge")).toHaveText("stale", {
    timeout: 12000,
  });
  await page.getByText("Reset demonstration", { exact: true }).click();
  await page.getByLabel("Type RESET DEMO").fill("RESET DEMO");
  await credentials(page);
  await page.getByRole("button", { name: "Delete demo data" }).click();
  await expect(page.locator(".pressure-number .badge")).toHaveText("missing");
});
