# Offline Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship an offline LeakLens application with a bundled backend on macOS and Windows.

**Architecture:** Electron owns a sandboxed React window and a PyInstaller backend child. The child serves packaged assets and the existing API on a dynamically bound loopback socket. Credentials pass over child stdin and a narrow isolated preload bridge, never command-line arguments or public files.

**Tech Stack:** Electron, electron-builder, PyInstaller, existing React/TypeScript and FastAPI/SQLite, Playwright.

**Spec:** docs/superpowers/specs/2026-11-20-desktop-app-design.md

## Global Constraints
- Keep the landing page on Lovable.
- Each installation is an independent simulation with local persistent data.
- Neither Node nor Python nor a separately started server is required on the user's machine.
- No real notices or equipment controls.
- Unsigned demo builds must be clearly labeled with platform trust warnings.
- A Windows build alone does not establish Windows runtime acceptance.

## Task 1: Bundled backend runtime
Files: create `backend/leaklens/desktop.py`, `backend/tests/test_desktop.py`, `desktop/scripts/build-backend.py`.
Interface: `create_desktop_app(db_path, tokens, assets)` returns FastAPI. CLI reads JSON `{db_path, tokens, assets}` from stdin, binds 127.0.0.1:0, writes one JSON readiness line `{port}` to stdout. Existing API paths remain unchanged. Authenticated `/desktop/ready` returns simulation status. A parent stdin EOF watcher shuts down the server.
- [x] Add failing TestClient tests: known SPA routes return index, existing asset returns file, `/api/missing` stays404, traversal and unknown routes fail, ready requires operator token, content security policy excludes remote resources.
- [x] Run `cd backend && .venv/bin/python -m pytest tests/test_desktop.py -q` and observe missing implementation failure.
- [x] Implement route allowlists, resolved-path containment, no-store responses, restrictive CSP and authenticated readiness. Use `socket.bind(('127.0.0.1',0))` and `uvicorn.Server.run(sockets=[sock])` to avoid port reservation races. Keep configuration private in stdin.
- [x] Run all backend tests. Bundle executable using PyInstaller onedir with package and uvicorn dependencies. Test the frozen executable with an isolated database.
- [x] Commit only task files after checks.

## Task 2: Desktop shell and offline frontend
Files: create `desktop/package.json`, `desktop/src/main.cjs`, `desktop/src/backend.cjs`, `desktop/src/preload.cjs`, `frontend/src/desktop.ts`. Modify App/main/styles for desktop mode, add local-font assets if available.
Interface: preload exposes only `window.leaklensDesktop.credentials(): Promise<Tokens>` and `isDesktop:true`. Main validates sender frame and origin. Backend manager returns `{origin,tokens,stop}` only after authenticated readiness.
- [x] Write Node lifecycle tests for child readiness, deadline, unexpected exit and shutdown. Write desktop acceptance test asserting sandbox/no Node exposure and operations initial route.
- [x] Observe failures before implementing.
- [x] Implement child spawning without shell, stderr diagnostics with no tokens, startup timeout, EOF cleanup, single-instance lock and platform app-data DB path. Close only owned child. Show a native startup error dialog on failure.
- [x] Use `BrowserWindow({webPreferences:{preload,contextIsolation:true,sandbox:true,nodeIntegration:false}})`. Deny permissions, navigation outside local origin and new windows. Only explicitly allowed HTTPS documentation URLs can open externally.
- [x] Start `/operations`. Hide marketing route, manual credential forms and PWA installation controls in desktop mode. Initialize credentials through preload. Do not register service worker in desktop mode. Use bundled or system fonts so no network font request is needed.
- [x] Build frontend and run desktop lifecycle tests and actual Electron launch acceptance. Existing web behavior remains unchanged.
- [x] Commit task files after passing checks.

## Task 3: Installers and acceptance
Files: create `desktop/tests/desktop.spec.cjs`, `desktop/playwright.config.cjs`, `.github/workflows/desktop.yml`, `desktop/README.md`. Update root README and verification document.
Interface: `npm run build` prepares frontend and backend, `npm run dist` creates platform installers, `npm run test:desktop` exercises a packaged executable using a temporary application-data directory.
- [x] Configure electron-builder resources to include only frontend dist and frozen backend. Set app ID `org.leaklens.desktop`, productName LeakLens, mac DMG and Windows NSIS. Never package .env, token files, source DBs, test artifacts or developer environments.
- [x] Run packaged application with `PATH` excluding developer runtimes. Execute full incident flow using real UI, failed sample and reflush, recovery and all-clear. Quit/relaunch and verify persistence.
- [x] Test duplicate launch, failed backend startup, owned-process shutdown and no remote network requests. Capture desktop screenshot evidence.
- [x] Configure macOS and Windows CI to build platform-specific Python runtime and installer. Windows runner executes packaged smoke acceptance. Upload unsigned artifacts, no signing credentials assumed.
- [x] Run existing 54+ backend tests, production browser regressions and desktop tests. Record exact platform evidence, untested paths, build artifact locations and unsigned limitations.
- [x] Commit implementation and documentation only after observed checks.

## Task 4: Approved publication
- [x] Inspect tracked paths and full git history for local databases, tokens, credentials and unrelated private files. Do not print credential values.
- [x] Recheck authenticated GitHub identity and exact intended public repository `yashthakur2008/xylemDidiCamel`. Create only if absent, configure origin and push current work without rewriting timestamps.
- [x] Observe desktop CI results. Fix packaging/runtime failures, rerun until successful or report concrete external blocker.
- [x] Provide repository and downloadable artifacts with exact macOS/Windows validation and signing status. Lovable hosting is not changed.

## Plan self-review
Every spec section maps to a task: runtime/data/security to1–2, distribution and acceptance to3, approved source publication to4. Browser checks are regression evidence only, not substitutes for packaged launch. Shared backend, app stores, native widget rewrite and automatic updates remain excluded.
