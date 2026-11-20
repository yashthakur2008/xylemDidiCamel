import { test, expect } from "@playwright/test";
import type { Network } from "../src/api";

test("network uses shared pipe geometry and preserves segment selection", async ({
  page,
}) => {
  await page.goto("/operations");
  const map = page.getByRole("img", {
    name: "Fictional network with three risk-ranked segments. Select a segment from the adjacent list.",
  });
  await expect(map).toBeVisible();
  await expect(map.locator(".pipe-flow")).toHaveCount(3);
  for (const flow of await map.locator(".pipe-flow").all()) {
    const href = await flow.getAttribute("href");
    expect(href).toBeTruthy();
    await expect(map.locator(`.pipe-outline[href="${href}"]`)).toHaveCount(1);
  }
  const network: Network = await (
    await page.request.get("/api/v1/network")
  ).json();
  for (const id of ["CA-002", "CA-003", "CA-001"]) {
    const button = page.getByRole("button", { name: new RegExp(id) });
    await button.focus();
    await button.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(`.network-sensor[data-segment="${id}"]`),
    ).toHaveAttribute("data-selected", "true");
    const segment = network.segments.find((segment) => segment.id === id)!;
    await expect(page.locator(".pressure-number")).toContainText(
      segment.latest_reading
        ? String(segment.latest_reading.pressure_psi)
        : "No reading",
    );
    if (segment.readings.length)
      await expect(
        page.getByRole("img", {
          name: new RegExp(`Pressure record for ${id}`),
        }),
      ).toBeVisible();
    else
      await expect(
        page.getByText("Missing telemetry does not mean normal pressure.", {
          exact: false,
        }),
      ).toBeVisible();
  }
  await page.locator(".network-layout").screenshot({
    path: `${process.env.JCODE_SCRATCH_DIR}/network-desktop.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.locator(".network-layout").screenshot({
    path: `${process.env.JCODE_SCRATCH_DIR}/network-mobile.png`,
  });
});

test("simulated activity is staggered, non-mutating and stops offscreen", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && request.url().includes("/api/"))
      mutations.push(request.url());
  });
  await page.goto("/operations");
  const panel = page.locator(".network-panel");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toHaveAttribute("data-motion", "running");
  const flow = page.locator(".pipe-flow").first();
  const offset = await flow.evaluate(
    (el) => getComputedStyle(el).strokeDashoffset,
  );
  await expect
    .poll(() => flow.evaluate((el) => getComputedStyle(el).strokeDashoffset))
    .not.toBe(offset);
  const selected = await page
    .locator(".segment[aria-pressed=true]")
    .textContent();
  await expect(page.locator(".network-sensor[data-scanning=true]")).toHaveCount(
    1,
  );
  await expect(page.locator(".sensor-popup")).toHaveCount(1, {
    timeout: 12000,
  });
  await expect(page.locator(".sensor-popup")).toContainText(
    "Simulated · pressure check",
  );
  expect(
    await page
      .locator(".sensor-popup")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(11);
  expect(
    await page.locator(".sensor-popup").evaluate((el) => ({
      name: getComputedStyle(el).animationName,
      duration: getComputedStyle(el).animationDuration,
    })),
  ).toEqual({ name: "network-popup", duration: "2.2s" });
  await expect(page.locator(".segment[aria-pressed=true]")).toHaveText(
    selected!,
  );
  await expect(
    page.locator('.sensor-popup[data-segment="CA-001"]'),
  ).toHaveCount(1);
  await expect(page.locator(".sensor-popup")).toHaveCount(0);
  await expect(
    page.locator('.sensor-popup[data-segment="CA-002"]'),
  ).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator(".sensor-popup")).toHaveCount(1);
  expect(mutations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(panel).toHaveAttribute("data-motion", "paused");
  await expect(page.locator(".sensor-popup")).toHaveCount(0);
  expect(
    await flow.evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toHaveAttribute("data-motion", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel).toHaveAttribute("data-motion", "paused");
  await expect(page.locator(".sensor-popup")).toHaveCount(0);
});

test("reduced motion removes ongoing water and sensor animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/operations");
  await expect(page.locator(".network-panel")).toHaveAttribute(
    "data-motion",
    "paused",
  );
  await expect(page.locator(".pipe-flow")).toHaveCount(3);
  expect(
    await page
      .locator(".pipe-flow")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await expect(page.locator(".sensor-popup")).toHaveCount(0);
});

test("contextual simulation stays legible inside the mobile network", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/operations");
  await page.locator(".network-stage").scrollIntoViewIfNeeded();
  const popup = page.locator(".sensor-popup");
  await expect(popup).toBeVisible({ timeout: 12000 });
  const bounds = (await popup.boundingBox())!;
  const stage = (await page.locator(".network-stage").boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(stage.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(stage.x + stage.width);
  expect(
    await popup.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(11);
  await page.locator(".network-panel").screenshot({
    path: `${process.env.JCODE_SCRATCH_DIR}/network-mobile-activity.png`,
  });
});
