# LeakLens web + crew app

One React/TypeScript application with a public website (`/`), operations dashboard (`/operations`) and installable crew PWA (`/crew`). It uses the real FastAPI backend, not a separate browser simulation database.

## Local start

Start the backend in one terminal using `backend/README.md`, then:

```sh
cd frontend
npm ci
npm run build
npm run preview -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173**. For development use `npm run dev -- --port 5173 --strictPort` instead. Both servers proxy `/api` to `http://127.0.0.1:8000`; override with `LEAKLENS_API_TARGET` before starting if needed. The frontend is bound to loopback, not your LAN. The production preview is for local evaluation, not an internet-facing production server.

Node 22 was used for verification. `package-lock.json` pins dependencies. No cloud account is necessary for this local demo.

## Private demo access

Public network and incident reads need no token. Expand **Demo access** and enter the matching values from the local, ignored `backend/.local-tokens.json` file into the Operator, Crew and Ingest fields. Keep these credentials private. Do not paste them into Lovable, GitHub, screenshots of source, or build environment variables.

Credentials stay in memory across in-app navigation and clear on reload or **Clear credentials**. The backend checks roles. This is role-token protection for a private prototype, not per-user authentication or crew-specific access control.

## Demo walkthrough

1. Open Operations, select Orchard crossing, inspect the 86/100 risk breakdown and missing telemetry.
2. Enter demo credentials. Click **Simulate main break**. A pressure trace and incident appear.
3. Review the advisory. If editing, save it before approval. Approve the simulated advisory and crew assignment.
4. Open **Crew app** through navigation. Record repair, then flush.
5. Enter a unique sample ID with **Failed**. The current flush becomes invalid. Record another flush.
6. Enter two different sample IDs with **Clear**. Prior failed evidence remains visible.
7. Return to Operations and click **Submit recovery reading** using the Ingest credential. It records a fictional 45 psi observation, not an equipment action.
8. Approve the simulated all-clear. Reload to see persistent server records; re-enter credentials for further writes.

The scenario requires an unused segment. To repeat from scratch, expand **Reset demonstration**, read the deletion warning and type `RESET DEMO`. Reset permanently removes the demo history, so do not use it on records you want to retain.

## PWA and phone use

The production build includes a standalone manifest, 192/512px icons and a versioned static-shell service worker. Chromium's actual installability check returns no errors. In a supported browser use Install app from its menu/address bar. On iOS use Safari → Share → Add to Home Screen. Native App Store distribution is not included, and physical-device installation has not been verified.

The shell opens offline, but API data and credentials are never cached by the service worker. Response actions require a connection, and writes are never queued or automatically retried. Google-hosted fonts currently have system-font fallbacks; internet loss does not prevent shell use.

A phone's `localhost` is the phone, not this laptop. Cross-device use needs a secure reachable deployment. Installation away from localhost requires HTTPS.

## Deployment boundary

Build output is `frontend/dist`. A hosting server must serve this directory, use SPA fallback for `/`, `/operations` and `/crew`, and reverse-proxy `/api/` to the backend **before** the SPA fallback. Keep the backend on a persistent writable SQLite volume with private role credentials supplied server-side. Serve `/sw.js` and `/index.html` with revalidation so upgrades are discovered.

Do not publish role tokens in static files. A static-only host will display the website but cannot supply the connected app without an API. Before real utility use, replace role tokens with per-user access control, add HTTPS, operational monitoring and regulatory review. No public deployment has been performed.

## Verification

```sh
npm run build
LEAKLENS_PRODUCTION_TEST=1 npm run test:e2e
# Development suite omits the production-only service worker check:
npm run test:e2e
```

Tests launch real Uvicorn on 8018 with temporary SQLite data and random role tokens, and a frontend on 5178. They do not reset the live localhost demo. `JCODE_SCRATCH_DIR` can select the test artifact directory. Install Chromium once with `npx playwright install chromium`.

See `docs/FRONTEND-VERIFICATION.md` for the acceptance map and remaining limits.
