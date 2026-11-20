# Connected LeakLens Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a polished website, backend-connected operations workspace and installable crew PWA.

**Architecture:** React/TypeScript with Vite serves three routes. A typed API module and in-memory role credentials connect to the existing FastAPI source of truth. Static-only service-worker caching keeps offline mutations unavailable.

**Tech Stack:** React, TypeScript, Vite, CSS, Playwright, existing FastAPI/SQLite.

**Spec:** docs/superpowers/specs/2026-11-19-connected-app-design.md

## Global constraints
- Simulation-only fictional network; no real notices or controls.
- No embedded credentials, credential storage or API service-worker caching.
- API errors never advance workflow; no automatic write retries.
- 390/768/1440px layouts, keyboard focus, reduced motion and accessible labels.
- Use earlier official-rules deadline, 10 AM Pacific, unless organizer resolves discrepancy.

## Files and interfaces
- frontend/src/api.ts: types and `request<T>(path, token?, body?, method?)` HTTP client.
- frontend/src/App.tsx: route navigation, API polling and ephemeral credential state.
- frontend/src/Website.tsx: editorial public content and intrusion schematic.
- frontend/src/Operations.tsx: network, risk, pressure and incident selection.
- frontend/src/Incident.tsx: operator approvals, crew work/sample forms and audit.
- frontend/src/styles.css: shared editorial and responsive visual system.
- frontend/public/{manifest.webmanifest,sw.js,icon.svg}: installable shell, never cached API.
- frontend/tests/app.spec.ts: actual browser acceptance against isolated backend.
- frontend/README.md: startup, demo access, installation and deployment boundaries.

### Task 1: Runnable shell and public website
- [x] Add package scripts `dev`, `build`, `preview`, `test:e2e`, TypeScript configuration and Vite SPA entry.
- [x] Write browser route smoke tests before implementation: `await page.goto('/'); await expect(page.getByRole('heading', {name: /Clean at the plant/})).toBeVisible();` and direct `/operations`, `/crew` reload checks.
- [x] Run tests, observe missing implementation failure.
- [x] Implement three-route shell, navigation and editorial website with annotated SVG pressure schematic.
- [x] Run build and route tests, commit only frontend changes.

### Task 2: Connected operations and crew workflow
- [x] Add real browser scenario test: operator token entered, create incident, approve advisory and job, crew repair/flush, failed sample, reflush, two clears, ingestion recovery, operator clearance.
- [x] Run test and observe missing controls/flow failure.
- [x] Implement typed API client and polling: use `fetch`, reject `!response.ok`, parse `detail` strings/validation arrays. Abort reads on cleanup and suppress overlapping writes.
- [x] Implement memory-only credential panel with distinct role password fields; no localStorage/sessionStorage tokens.
- [x] Implement network schematic, selection, risk contribution rows and pressure trace from API readings, explicit missing/stale state.
- [x] Implement advisory editing, approval, crew assignment, repair/flush, unique sample entry and audit using exact existing endpoints in backend/README.md.
- [x] Add demo telemetry recovery through ingest credential and reset confirmation explaining deletion.
- [x] Run actual browser workflow, verify server state, commit.

### Task 3: PWA and robust delivery
- [x] Write manifest/cache and viewport checks: `expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()` at all required widths.
- [x] Verify tests fail before assets/responsive support exist.
- [x] Add standalone manifest with crew start URL and icons; service worker only caches explicit same-origin static shell assets and bypasses `/api`, `/health`, all non-GET and cross-origin requests.
- [x] Disable mutations on offline/unavailable backend and provide visible error/retry state. Add unknown route view and install help.
- [x] Run production build, direct route asset tests, actual workflow, wrong-role and duplicate sample rejection, reload credential clearing, offline behavior, viewport screenshots and keyboard inspection.
- [x] Run existing 36 backend tests plus real HTTP acceptance. Document honest install/deployment limits, start localhost, commit final fixes.

## Self-review
All spec areas map to the three deliverables. Photos and native distribution are excluded. Real browser integration must not be replaced by mocked unit tests. Lovable access/refinement should be attempted without desktop focus theft and reported honestly if blocked. User approved specification and asked to finish, so execute inline without another execution-choice prompt.

## Execution outcome
Connected implementation committed in 65080b5, then hardened through independent review. Actual production browser workflow and static-only offline shell tested. Lovable automation remained blocked; no cloud deployment or physical-device installation claimed. Exact evidence and limitations are in docs/FRONTEND-VERIFICATION.md.
