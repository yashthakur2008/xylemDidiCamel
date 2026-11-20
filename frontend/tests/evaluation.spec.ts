import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function setup(page: Page) {
  await page.goto("/operations");
  await page.getByText("Demo access", { exact: true }).click();
  for (const role of ["Operator", "Crew", "Ingest"])
    await page
      .getByLabel(role + " token", { exact: true })
      .fill(process.env["LEAKLENS_" + role.toUpperCase() + "_TOKEN"]!);
  await page.getByRole("link", { name: "Test mode", exact: true }).click();
  await page
    .getByLabel("Participant code", { exact: true })
    .fill("INTERNAL-01");
}
test("evaluation preserves first response and exports real saved edits", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  await expect(
    page.getByText("Sustained pressure loss", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Potentially affected area", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Mark response ready for review",
      exact: true,
    }),
  ).toBeEnabled();
  await page.locator(".detail-grid").screenshot({
    path: process.env.JCODE_SCRATCH_DIR + "/confluence-pressure.png",
  });
  const plan = page.getByLabel("Sampling plan draft", { exact: true });
  await plan.fill(
    "Confirm an upstream and downstream location with the operator before collecting samples.",
    { timeout: 5000 },
  );
  await page
    .getByRole("button", { name: "Save sampling plan", exact: true })
    .click();
  await expect(
    page.getByText("Sampling plan edited", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Investigation and remaining uncertainty", { exact: true })
    .fill(
      "Verify sensor P-001 and boundary with the operator. No confirmed contamination.",
    );
  await page
    .getByRole("button", { name: "Save investigation notes", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Mark response ready for review",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("First response frozen", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const file = await download;
  const data = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(data.provenance).toBe("simulated");
  expect(data.benchmark_result).toBeNull();
  expect(data.ready.reviewer_validated).toBe(false);
  expect(data.ready.snapshot.sampling_plan[0]).toContain(
    "upstream and downstream",
  );
  expect(data.log.some((x: any) => x.action === "sampling_edit")).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: process.env.JCODE_SCRATCH_DIR + "/confluence-evaluation-mobile.png",
    fullPage: true,
  });
});
test("ambiguous dip shows investigation not autonomous advisory and reset preserves trial", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run brief-dip trial", exact: true })
    .click();
  await expect(
    page.getByText("Investigate transient", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No sustained incident created", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Approve simulated advisory",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset test / new trial", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Prepare a repeatable trial",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Resume .*brief dip/ }).first(),
  ).toBeVisible();
});

test("trial carries the same incident through field response and reviewer assessment", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  await page
    .locator(".detail-grid > section")
    .first()
    .screenshot({
      path: process.env.JCODE_SCRATCH_DIR + "/confluence-risk.png",
    });
  await page
    .locator(".detail-grid > section")
    .last()
    .screenshot({
      path: process.env.JCODE_SCRATCH_DIR + "/confluence-pressure.png",
    });
  await page
    .getByLabel("Advisory draft")
    .fill(
      "SIMULATION ONLY: Operator reviewed North zone draft. Confirm boundary before any notice.",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByLabel("Investigation and remaining uncertainty", { exact: true })
    .fill(
      "Confirm sensor calibration, candidate boundary and sampling locations with operator.",
    );
  await page
    .getByRole("button", { name: "Save investigation notes", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Mark response ready for review",
      exact: true,
    })
    .click();
  await page
    .getByText("Score the frozen first response", { exact: true })
    .click();
  await page.getByLabel("Reviewer code", { exact: true }).fill("REVIEW-01");
  await page.getByLabel("Required items missed", { exact: true }).fill("1");
  await page.getByLabel("Corrections required", { exact: true }).fill("1");
  await page
    .getByLabel("Reviewer rationale", { exact: true })
    .fill(
      "This automated check is not a real operator trial. Confirm the boundary.",
    );
  await page
    .getByRole("button", { name: "Record reviewer assessment", exact: true })
    .click();
  await expect(page.getByText(/REVIEW-01: needs revision/)).toBeVisible();
  await page
    .getByRole("button", { name: "Approve simulated advisory", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve crew assignment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open trial crew notebook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record repair", exact: true })
    .click();
  await page.getByRole("button", { name: "Record flush", exact: true }).click();
  await page.getByLabel("Sample ID", { exact: true }).fill("FAILED-01");
  await page
    .getByRole("combobox", { name: "Sample result", exact: true })
    .selectOption("failed");
  await page
    .getByRole("button", { name: "Record sample", exact: true })
    .click();
  await page.getByRole("button", { name: "Record flush", exact: true }).click();
  for (const id of ["CLEAR-01", "CLEAR-02"]) {
    await page.getByLabel("Sample ID", { exact: true }).fill(id);
    await page
      .getByRole("combobox", { name: "Sample result", exact: true })
      .selectOption("clear");
    await page
      .getByRole("button", { name: "Record sample", exact: true })
      .click();
  }
  await page.locator(".incident").screenshot({
    path: process.env.JCODE_SCRATCH_DIR + "/confluence-response.png",
  });
  await page
    .getByRole("button", { name: "Return to operator review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit trial recovery reading", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve simulated all-clear", exact: true })
    .click();
  await expect(
    page.getByText("Incident closed", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await download;
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain("advisory_edit");
  expect(csv).toContain("needs_revision");
  expect(csv).toContain("clearance");
});

test("trial display timing does not wait for a second history request", async ({
  page,
}) => {
  await setup(page);
  let created = false;
  await page.route("**/api/v1/evaluations", async (route) => {
    if (route.request().method() === "POST") {
      created = true;
      await route.continue();
      return;
    }
    const response = await route.fetch();
    if (created) await new Promise((resolve) => setTimeout(resolve, 3500));
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Run brief-dip trial", exact: true })
    .click();
  await expect(page.getByText("Presented", { exact: true })).toBeVisible({
    timeout: 1500,
  });
});

test("saved notes normalize without locking readiness and navigation protects unsaved text", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run brief-dip trial", exact: true })
    .click();
  const notes = page.getByLabel("Investigation and remaining uncertainty", {
    exact: true,
  });
  await notes.fill("  Check sensor and boundary before deciding next steps.  ");
  await page
    .getByRole("button", { name: "Save investigation notes", exact: true })
    .click();
  await expect(notes).toHaveValue(
    "Check sensor and boundary before deciding next steps.",
  );
  await expect(
    page.getByRole("button", {
      name: "Mark response ready for review",
      exact: true,
    }),
  ).toBeEnabled();
  await notes.fill(
    "New unsaved investigation text must survive cancelled navigation.",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Operations", exact: true }).click();
  await expect(notes).toHaveValue(
    "New unsaved investigation text must survive cancelled navigation.",
  );
});

test("sampling plan retains typing made while an earlier save settles", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  let release: () => void = () => {},
    held = false;
  await page.route("**/api/v1/evaluations/*/actions", async (route) => {
    const payload = route.request().postDataJSON();
    if (payload.action !== "sampling_edit") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    held = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ response });
  });
  const plan = page.getByLabel("Sampling plan draft", { exact: true });
  try {
    await plan.fill("First submitted sampling instruction.");
    await page
      .getByRole("button", { name: "Save sampling plan", exact: true })
      .click();
    await expect.poll(() => held).toBe(true);
    await plan.fill(
      "New unsaved sampling text typed during the previous save.",
    );
    release();
    await expect(
      page.getByRole("button", { name: "Save sampling plan", exact: true }),
    ).toBeEnabled();
    await expect(plan).toHaveValue(
      "New unsaved sampling text typed during the previous save.",
    );
  } finally {
    release();
  }
});

test("sample entry retains the next ID typed while a submission settles", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve simulated advisory", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve crew assignment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open trial crew notebook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record repair", exact: true })
    .click();
  await page.getByRole("button", { name: "Record flush", exact: true }).click();
  let release: () => void = () => {},
    held = false;
  await page.route("**/api/v1/evaluations/*/actions", async (route) => {
    if (route.request().postDataJSON().action !== "sample")
      return route.continue();
    const response = await route.fetch();
    held = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ response });
  });
  const input = page.getByLabel("Sample ID", { exact: true });
  try {
    await input.fill("CLEAR-FIRST");
    await page
      .getByRole("button", { name: "Record sample", exact: true })
      .click();
    await expect.poll(() => held).toBe(true);
    await input.fill("CLEAR-NEXT");
    release();
    await expect(
      page.locator(".evidence").getByText("CLEAR-FIRST", { exact: true }),
    ).toBeVisible();
    await expect(input).toHaveValue("CLEAR-NEXT");
  } finally {
    release();
  }
});

test("advisory whitespace save leaves a clean reviewable draft", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", { name: "Run main-break trial", exact: true })
    .click();
  const draft = page.getByLabel("Advisory draft");
  await draft.fill(
    "  SIMULATION ONLY: Confirm zone boundary with an operator before any notice.  ",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(draft).toHaveValue(
    "SIMULATION ONLY: Confirm zone boundary with an operator before any notice.",
  );
  await expect(
    page.getByRole("button", {
      name: "Approve simulated advisory",
      exact: true,
    }),
  ).toBeEnabled();
});
