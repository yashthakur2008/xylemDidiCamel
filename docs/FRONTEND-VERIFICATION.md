# Connected application acceptance evidence

Verified 2026-11-19 Pacific / 2026-11-20 UTC. This report records the connected web prototype acceptance. Subsequent desktop installation and public release evidence is in [DESKTOP-VERIFICATION.md](DESKTOP-VERIFICATION.md). Neither increment is an operational utility system.

## Acceptance map

| Requirement / changed output | Concrete check | Observed behavior |
|---|---|---|
| Water Quality public website and working routes | Chromium visits `/`, follows Open operations, directly loads `/crew`, unknown route test | Correct headings, route content and not-found screen render; production SPA direct loads succeed |
| Original pressure explanation | Browser toggles Normal pressure and Pressure loss | Same crack with reversed arrows and matching outward/inward labels; schematic labeled conceptual |
| Explainable risk ranking | Browser selects all three segments and compares score/contribution text with actual `/network` response | Every displayed contribution and total matches API values |
| Missing and stale telemetry | Empty demo plus real 119-second-old reading; wait for expiry and poll | Missing initially, stale after freshness expiry, missing again after explicit UI reset |
| Connected sustained-pressure scenario | Browser clicks Simulate main break against real Uvicorn/SQLite | Incident and real stored pressure trace appear; no local event reducer substitutes for backend |
| Operator advisory and assignment gates | Full browser workflow plus 54 backend contract/edge tests | Advisory approval precedes assignment; crew cannot bypass operator authorization |
| Safe concurrent review | Two-client backend tests, browser remote edit while local text is dirty | Required `expected_draft` checked atomically for PATCH and approval; stale content returns 409 without audit/state mutation. Dirty browser text remains and requires explicit conflict resolution |
| Crew repair, flush and sample response | Actual browser navigates from operations to crew and submits actions | Failed sample requires reflush; two new clear IDs produce eligibility; failed evidence remains |
| Duplicate and premature clearance rejection | Same browser submits duplicate ID and tries clearance while pressure is low | Visible 409 errors, no incorrect progression |
| Recovery and human all-clear | Browser submits 45 psi using ingest credential, then operator approval | Event closes only after explicit sign-off; remains simulation-only |
| Persistence and credentials | Browser reload plus independent actual-server restart acceptance | Incident/samples/audit persist in SQLite; browser role token inputs clear on reload |
| Role enforcement | Crew token submitted to operator scenario action | Server403 displayed, no incident mutation |
| Offline and unavailable behavior | Browser offline toggle and reload | Actions disabled, no queued writes, static shell opens without pretending cached jobs are current; reconnect clears connection error |
| Slow/hung networks | Delay actual backend read responses six seconds; delay successful mutation response thirteen seconds | Slow reads settle without polling starvation. Ten-second request deadline releases busy state and reconciles recorded incident without resubmitting |
| Desktop/tablet/mobile layout | Actual 390/768/1440px route visits and active crew at390px | No horizontal page overflow; desktop network and active mobile crew screenshots inspected |
| Keyboard/reduced motion | Browser Tab targets visible skip link; CSS inspection | Named form controls and focus styles present; reduced-motion media rule suppresses motion. No claim of comprehensive screen-reader certification |
| PWA manifest and icons | Actual manifest/icon HTTP requests and Chromium `Page.getInstallabilityErrors` | Standalone crew start URL, valid icon responses and empty installability error list |
| Service worker privacy | Inspect actual CacheStorage keys after production registration | Only application-shell/static assets cached; no `/api/` data or bearer credentials |
| Production packaging | TypeScript check, Vite production build, production-preview browser suite | Build succeeds and real frontend/backend integration works from built assets, not only dev mode |
| Local delivery | Read-only HTTP probes to5173 website/operations/crew/API and8000 health/OpenAPI | All200; current backend requires reviewed advisory content. Existing live database preserved on restart |
| Requested Lovable iterations | Background AX inspection of signed-in desktop app | Shallow tree exposed no editor; deeper inspection timed out. No successful Lovable submission or repeated generations claimed |

## Test commands

```sh
cd frontend
npm run build
LEAKLENS_PRODUCTION_TEST=1 npm run test:e2e
cd ../backend
.venv/bin/python -m pytest -q
.venv/bin/python scripts/acceptance.py
```

Final production run: **10/10 browser cases passed**, production build succeeded, and production dependency audit reported zero vulnerabilities. The browser suite contains ten acceptance cases. It starts real Uvicorn with temporary SQLite and randomized role credentials. Most cases use unmodified real requests. Two fault-injection cases delay actual backend responses to reproduce network races; they supplement, not replace, the complete unmodified real-browser workflow. All destructive resets are confined to isolated test databases.

Backend suite: 54 passing tests. Real HTTP acceptance also passes and restarts the server to prove persistence. Prior installed-wheel verification predates the advisory contract hardening; source/package build acceptance should not be confused with a fresh installed-wheel recheck.

## Issues found and fixed during acceptance

- Missing frontend and routes, then missing workflow controls, were observed as red browser tests before implementation.
- Reconnected UI kept an obsolete offline error. Separate connection and mutation error state now resolve correctly.
- Production cache entries varied on Origin, causing offline JS/CSS misses. Static allowlisted cache lookups now ignore Vary; API caching remains bypassed.
- Polling every five seconds invalidated slower successful requests. Polling now waits for settlement and coalesces reads.
- Requests had no deadline. Ten-second deadlines cover headers and JSON bodies, with explicit uncertain-write messaging and reconciliation, never automatic write retry.
- Advisory approval/edit races could approve unseen content or overwrite another operator's update. Required exact expected-content guards now execute inside the transaction.
- Remote draft updates could silently overwrite local typing. Dirty drafts now survive with explicit conflict/discard controls.

## Delivery limits

- PWA installability and offline launch were checked in Chromium. An OS-installed app launch or physical iPhone/Android installation was not performed.
- GitHub source and desktop installers were subsequently published, as documented in DESKTOP-VERIFICATION.md. Hosted backend service, per-user identity and production utility readiness remain outside this offline demo. The existing Lovable landing page was not changed.
- External Google Fonts were removed during desktop delivery. System fonts and local assets require no remote resources or map tiles.
- No real notices, equipment controls, laboratory integration, photo uploads, WNTR/EPANET validation or California regulatory certification.
- Visual review is documented human-agent inspection of real screenshots, not proof of an Awwwards-level result or successful Lovable use.
