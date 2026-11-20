# Backend verification record

Verified November 19, 2026 Pacific. Scope is the backend, not the Lovable frontend, actual water quality, or public deployment.

## Observed results

- `cd backend && .venv/bin/python -m pytest -q`: **36 passed**, no warnings.
- `.venv/bin/python scripts/acceptance.py`: passed real Uvicorn HTTP workflow, failure/recovery, authorization and process restart checks. Uses an isolated SQLite database, not a mock service.
- Built wheel with `pip wheel --no-deps .`, installed in a fresh virtual environment, and ran the same actual HTTP/restart workflow with `LEAKLENS_ACCEPTANCE_PYTHON` pointing at the installed environment. Passed without importing the source checkout.
- `pip check`: no broken requirements. `compileall` and `git diff --check`: passed.
- Local dev launcher started on `127.0.0.1:8000`; `/health`, `/docs`, `/openapi.json`, `/api/v1/network`, `/api/v1/events` returned HTTP 200.
- Generated token file has 0600 permissions and is ignored by Git. Token values were not printed.
- Independent reviewer reproduced two defects, then verified fixes: nested corrupted persistence and renewed pressure loss before the first sample. No further must-fix in targeted recheck. Reviewer separately verified rollback after malformed save and reopened unchanged state.

## Requirement-to-evidence mapping

| Requirement | Concrete check and observed result |
|---|---|
| Explainable segment risk | `test_health_and_explainable_risk`: factor contributions sum to score, weights sum to 1, sorted network; passed |
| Pressure threshold | `test_pressure_threshold_and_sustained_detection`: 19.9 creates event after duration, 20/20.1 do not; passed |
| Sustained event, no duplicates | `test_short_dip_and_long_gap_do_not_trigger`, `test_no_duplicate_active_event`: passed |
| Fresh trustworthy input | invalid/stale/future/out-of-order, timezone, strict types and nonfinite payload tests: passed with 4xx rather than 500 |
| Operator-only approvals | auth spoofing and role tests plus actual HTTP wrong-role calls: 401/403, no advancement |
| Notice draft and assignment | `test_notice_edit_approval_and_job_gate`: edit before approval, immutable after, assignment blocked until approval; passed |
| Crew repair/flush | workflow test and actual HTTP: premature flush and early sampling rejected; passed |
| Failed sample recovery | main workflow: clear then failed resets streak, reflush mandatory, two new clears required; passed |
| Unique sample records | duplicate and concurrent duplicate tests: one success, one conflict; passed |
| Renewed pressure loss | regression cases with zero samples and existing clear samples invalidate flush/streak; passed |
| All-clear guarded | HTTP and API tests require fresh recovered pressure, eligible samples and operator action; crew and repeated approval rejected |
| Stale/missing state visible | missing network initial state, clock-advanced stale test and reviewer missing-reading clearance probe: explicit stale/missing, no clearance |
| Durable transactional state | recreated app test plus real process restart preserve closed incident, four sample records and audit; passed |
| Corruption handling | missing/bad timestamps and incomplete event persisted-state tests fail startup without overwriting database; reviewer malformed-save rollback passed |
| Frontend API boundary | typed request OpenAPI available; actual OpenAPI and CORS allow/deny checks passed. Actual Lovable wiring NOT tested |
| Reset/replay | scenario and explicit operator-only reset test passed; smoke reset applied only to isolated test database |
| Installability | wheel build, clean environment install, console entry point and installed-package HTTP workflow passed |
| Demo safety boundaries | API returns `simulated`, approval delivery is `simulated_only`, clearance is not regulatory. No outbound delivery/control connector exists |

## Remaining limitations

No frontend integration or frontend visual/accessibility testing, public HTTPS deployment, real user/crew identities, file uploads, Postgres/PostGIS, real sensor/network data, regulatory compliance review, hydraulic simulation or validated intrusion detection. SQLite JSON persistence is for a small demo. Public read endpoints and role-level shared demo credentials are explicitly unsuitable for sensitive utility data.
