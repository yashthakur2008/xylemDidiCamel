import { test, expect } from "@playwright/test";
import { join } from "node:path";

test("app workspace has a compact sidebar and responsive header without changing website", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/operations");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await expect(page.locator(".app-sidebar")).toBeVisible();
  await expect(page.locator(".app-topbar")).toBeVisible();
  expect(
    (await page.locator(".app-topbar").boundingBox())!.height,
  ).toBeLessThan(65);
  await expect(
    page.getByText("DISTRIBUTION INTELLIGENCE", { exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: join(process.env.JCODE_SCRATCH_DIR!, `app-refined-${width}.png`),
      fullPage: true,
    });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBeTruthy();
    await expect(
      page.getByRole("link", { name: "Test mode", exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Test mode", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Operator evaluation", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".app-sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Clean at the plant/ }),
  ).toBeVisible();
});

test("startup moves the actual brand to its measured final position and does not replay on navigation", async ({
  page,
}) => {
  await page.goto("/operations");
  const brand = page.locator(".app-brand");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-intro",
    "playing",
  );
  const start = await brand.boundingBox();
  expect(start!.width).toBeGreaterThan(500);
  await page.screenshot({
    path: join(process.env.JCODE_SCRATCH_DIR!, "app-intro.png"),
  });
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-intro",
    "complete",
  );
  const final = await brand.boundingBox();
  expect(final!.width).toBeLessThan(220);
  expect(final!.x).toBeLessThan(40);
  expect(final!.y).toBeLessThan(40);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const stable = await brand.boundingBox();
  expect(Math.abs(stable!.x - final!.x)).toBeLessThan(0.5);
  expect(Math.abs(stable!.width - final!.width)).toBeLessThan(0.5);
  await page.getByRole("link", { name: "Test mode", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-intro",
    "complete",
  );
});

test("reduced motion and resize reveal usable content without a stuck intro", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/operations");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-intro",
    "complete",
  );
  await expect(
    page.getByRole("heading", { name: "Network intelligence" }),
  ).toBeVisible();
  expect(await page.locator("#main").evaluate((el) => el.inert)).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-intro",
    "complete",
  );
  expect(await page.locator("#main").evaluate((el) => el.inert)).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
});

test('keyboard skip link is above app chrome and moves focus to content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/operations');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  expect(await skip.evaluate(el => {
    const box = el.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === el;
  })).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('primary simulation action is discoverable without scrolling on desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/operations');
  await expect(page.getByRole('button', { name: 'Simulate main break', exact: true })).toBeInViewport();
});
