# Desktop delivery verification

Verified November 20, 2026. Product scope is an offline single-user simulation, not shared utility infrastructure. Lovable landing-page hosting was not changed.

## Requirement-to-evidence map

| Requirement | Observed check and result |
|---|---|
| Actual desktop application | Electron window launches directly into Operations, no browser address bar or browser shortcut. Renderer has no Node `require`, sandbox and context isolation are enabled. |
| No Python/Node installation required | Actual packaged macOS executable runs with an empty PATH. Frozen Python runtime is included. Packaged Windows executable also passes CI acceptance with an empty PATH. |
| Installable Mac app | `npm run dist` produced `LeakLens-0.1.0-arm64.dmg`. `hdiutil verify` checksum valid. Mounted read-only, copied app to `~/Applications/LeakLens.app`, unmounted, then ran the full acceptance suite against that installed copy. Both tests passed. |
| Windows executable/installer | Final native CI run 44707848005 succeeded on both platforms. Windows built the NSIS setup, installed it silently into an isolated runner directory, and passed both acceptance tests against the installed executable with empty PATH. Mac packaged acceptance also passed on the native runner. |
| Offline operations | No remote resource URLs in renderer performance entries, no service-worker registration, remote network requests blocked by the shell. Explicit offline event and false navigator.onLine do not disable the local API. Real loopback workflow succeeds. This does not claim physical Wi-Fi hardware was switched off. |
| Full Water Quality demo | Real desktop UI: simulate pressure loss, review/approve advisory, assign crew, repair, flush, failed sample, required reflush, two clear samples, pressure recovery, operator all-clear. Final state is Incident closed. |
| Failure guards | Duplicate sample ID rejected. Premature all-clear rejected while pressure is low. Source/frozen backend tests cover stale advisory guards, roles, bad telemetry and closed-state mutations. |
| Persistent local data | Quit and reopen installed app using same temporary application-data directory: closed incident and all three samples remain. Database is outside application resources. |
| Child lifecycle | Missing executable, startup timeout and early exit return failures. Real source/frozen backend exits on stdin EOF. Packaged desktop test captures owned backend child PID and verifies it no longer exists after app exit, as well as verifying port closure. |
| Single application instance | Second launch with same application-data directory exits successfully, existing window remains the only application window and its backend still responds. |
| Security boundaries | Authenticated readiness, exact loopback Host/Origin validation, no inherited development CORS grants, asset traversal checks, restrictive CSP, narrow sender-validated credentials bridge. Native permissions, new windows, external navigation and webviews denied. Independent static review found no significant new runtime/security defects. |
| No bundled local secrets/data | Installed Resources contains no `.env`, `.local-tokens.json` or SQLite database. app.asar lists only package metadata and three desktop runtime files. Initial Git history scan checked 79 unique blobs across eight commits, with no common credential-pattern or private-file findings. |
| Existing product regression | Production frontend build succeeds, all 10 real-HTTP browser acceptance tests pass. Backend suite including frozen executable: 85 passed with no skips. Four Node child-lifecycle tests pass. |
| Honest distribution | Unsigned demo status is documented. Apple notarization, Windows publisher signing and store certification are not claimed. |

## Commands used

```sh
cd backend
LEAKLENS_FROZEN_EXECUTABLE="$PWD/../desktop/build/backend/leaklens-backend" .venv/bin/python -m pytest tests -q
# 85 passed

cd ../frontend
npm run build
LEAKLENS_PRODUCTION_TEST=1 npm run test:e2e
# 10 passed

cd ../desktop
npm test
# 4 passed
LEAKLENS_PACKAGED="$HOME/Applications/LeakLens.app/Contents/MacOS/LeakLens" npm run test:desktop
# 2 passed against installed app, including restart and PID-exit assertions
```

## Distribution boundaries

Mac build targets Apple Silicon, Windows build targets x64. Intel Mac and Windows ARM are not claimed. Signing/notarization credentials were not supplied. Downloaded unsigned files can trigger Gatekeeper/SmartScreen, and those trust prompts were not bypassed. Local DMG installation is not a test of Internet-download quarantine behavior.

The desktop reuses React rendered inside Electron, rather than native OS widget implementations. It is a standalone installed application with a bundled backend, not a PWA. Electron was selected for compatibility with the existing interface and acceptance tooling, with the trade-off of a larger installer.

Public source: https://github.com/yashthakur2008/xylemDidiCamel

Release: https://github.com/yashthakur2008/xylemDidiCamel/releases/tag/v0.1.0

Native build and Windows installer acceptance: https://github.com/yashthakur2008/xylemDidiCamel/actions/runs/44707848005

Release assets come from that successful CI run, pinned to source commit a546b48. The installed local Mac copy was built from identical application sources locally. Installer byte checksums can differ between independent builds. The release includes SHA256SUMS.txt for its exact downloadable artifacts.

Opening the installed app for the user through the environment open tool was suppressed by NO_BROWSER/JCODE_NO_BROWSER/test-harness restrictions. Installed-app launch was nevertheless exercised successfully by the desktop acceptance runner.
