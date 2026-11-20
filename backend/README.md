# LeakLens backend

Simulation-only FastAPI service. Python 3.11+; verified locally on Python 3.13. Uses SQLite, no external database account needed. This is a runnable competition backend, **not an operational water-utility safety system**.

## Setup and run

From `backend/`:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
.venv/bin/python -m leaklens.dev --port 8000
```

The launcher creates `.local-tokens.json` (mode 0600) containing independent random `operator`, `crew` and `ingest` tokens. It never prints their values. Read them locally only when needed for `/docs` authorization or your local integration. Do not commit or paste them into Lovable prompts. Existing token files are reused. Delete/replace only that local file to rotate demo tokens, then restart.

- Swagger UI: `/docs` (its UI assets require internet access).
- Raw OpenAPI: `/openapi.json` (served locally, no external UI dependency).
- Health: `/health`.
- SQLite: `backend/data/demo.sqlite3`, overridable with `LEAKLENS_DB`.
- Launcher binds to `127.0.0.1`, not your LAN.

## API contract

Public reads contain **fictional demo data only**. Mutations require `Authorization: Bearer <role-token>`. Role names in headers or JSON do not grant access. Tokens identify a role, not a person or particular crew, and are not production IAM.

Prefix: `/api/v1`.

| Method / path | Role | Body / behavior |
|---|---|---|
| GET `/network` | public | `{simulated, name, policy, segments}`; each segment has `risk`, `readings`, `latest_reading`, `telemetry_status` |
| GET `/events` | public | `{simulated, events}` |
| GET `/events/{id}` | public | complete event including advisory, job, samples, policy snapshot and audit |
| POST `/readings` | ingest | `{segment_id, pressure_psi, observed_at}`; 201 `{simulated, reading, event}`; `event` may be null |
| PATCH `/events/{id}/advisory` | operator | `{draft}`; editable only before approval |
| POST `/events/{id}/advisory/approve` | operator | no body; logs simulated delivery only |
| POST `/events/{id}/job/approve` | operator | `{crew}`; requires approved advisory |
| POST `/events/{id}/work` | crew | `{step: "repair"}` then `{step: "flush"}` |
| POST `/events/{id}/samples` | crew | `{sample_id, result: "clear" \| "failed"}` |
| POST `/events/{id}/clearance/approve` | operator | no body; requires sample eligibility and fresh recovered pressure |
| POST `/demo/scenario` | operator | `{segment_id: "CA-001"}`; creates a deterministic main-break fixture; 201 |
| POST `/demo/reset` | operator | `{confirm: "RESET DEMO"}`; deletes all demo incidents, readings and audit history |

Event mutations return the complete updated event. IDs are generated UUIDs; segments are `CA-001`, `CA-002`, `CA-003`. Names and coordinates are fictional fixtures, not actual utility pipe locations. Sample IDs and crew names allow ASCII letters, numbers, `_` and `-`, up to 80 characters. Sample IDs are unique within an event. Advisory text is plain text, 10–4000 trimmed characters; render it as text, never raw HTML.

Errors: 401 missing/invalid token, 403 wrong role, 404 unknown event/segment, 409 invalid transition/duplicate/out-of-order action, 422 invalid payload. `{detail}` is either a message or a validation list (`loc`, `msg`, `type`). Never infer success solely from a resolved fetch promise.

### Detection policy

- Inputs: finite numeric pressure 0–300 psi and timezone-aware ISO timestamp. Booleans and numeric strings rejected.
- Readings must be no older than 120 seconds and no more than 5 seconds in the future.
- Timestamps must strictly increase within a segment.
- Event after sub-20 readings spanning at least 5 seconds with at most 30 seconds between observations. Exactly 20 does not trigger. A recovered reading or longer gap resets the low streak. This is a **demo heuristic**, not a hydraulic model or high-speed transient detector.
- One active event per segment. Latest 120 readings retained per segment. Stale/missing state is explicit.
- Risk score: 40% leak evidence + 30% sewer proximity + 20% flood exposure + 10% pipe age. Inputs normalized 0–100; contribution breakdown included. Uncalibrated, not a probability.
- Policy/weights live in `leaklens/network.py`; event policies are snapshotted. There is currently no runtime policy-edit API.

### Response policy

`detected → advisory_active → responding → sampling → clearance_pending → closed`

A failed sample creates `reflush_required`, resets consecutive clear results and requires another recorded flush. Previous sample/audit evidence remains. A new low-pressure reading after clear results also invalidates eligibility and requires reflush/resampling. Closed events reject response mutations. Two clear results alone never close an incident: a fresh recovered reading plus explicit operator approval are required. All approvals remain simulated; `regulatory_clearance` is always false.

Sample entry is an operator/crew record of a result, not a lab integration. Sampling locations, collection timing, laboratory qualifications and regulator-specific release conditions are **not validated by this prototype**. Public reads expose every demo event and its notes, so never enter real customer or utility-sensitive information.

## Connect the Lovable frontend

1. Use local API base `http://127.0.0.1:8000/api/v1` for an exported frontend running on this laptop. Do not assume a hosted Lovable runtime can reach your laptop's loopback interface.
2. Fetch `/network` and `/events`, then poll while demo scenarios run. The backend is the source of truth; do not also mutate an independent localStorage event state.
3. During a private localhost demo, accept the appropriate role token through a temporary password input and retain it in memory only. **Never hardcode tokens in source, `VITE_*` variables, public bundles or prompts.** A real deployment requires per-user login/session auth instead.
4. Call the dedicated mutation endpoints and replace local event state with the returned object. Display 409/422 validation errors without advancing the UI.
5. Keep simulated-data badges and no-real-delivery language. Role-switch UI is not authentication; the backend token controls permissions.
6. Default allowed origins: `http://localhost:5173,http://127.0.0.1:5173`. Set `LEAKLENS_CORS_ORIGINS` to comma-separated exact frontend origins when needed. Wildcard is rejected. CORS is not authorization.

```js
// token is entered by the demo operator at runtime, never embedded in a build.
async function approveAdvisory(apiBase, eventId, token) {
  const response = await fetch(`${apiBase}/events/${eventId}/advisory/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Invalid request');
  return body;
}
```

## Verification

```sh
.venv/bin/python -m pytest -q
# Real Uvicorn server, real HTTP, isolated temp DB, then a second process verifies persistence:
.venv/bin/python scripts/acceptance.py
# Optional against your running localhost demo; EXPLICITLY RESETS all demo state:
.venv/bin/python scripts/smoke.py --reset-demo
```

Test coverage includes risk arithmetic, 19.9/20/20.1 boundary, sustained duration, gap/reset rules, stale/future/out-of-order inputs, nonfinite JSON errors, role guards, notice/job gates, failed samples, concurrent duplicate sample IDs, renewed pressure loss, approval/closure guards, CORS and reopened databases. The actual HTTP script exercises failure/recovery and process restart. These checks validate the software workflow, not scientific detection accuracy or regulatory suitability.

## Packaging and deployment

```sh
python3 -m pip install ./backend  # from repository root
```

For a privately hosted demo, supply three distinct random ASCII environment tokens of at least 32 characters: `LEAKLENS_OPERATOR_TOKEN`, `LEAKLENS_CREW_TOKEN`, `LEAKLENS_INGEST_TOKEN`. Also set `LEAKLENS_DB` to a writable **persistent** volume path and `LEAKLENS_CORS_ORIGINS` to the exact frontend origin. Missing/duplicate/short tokens fail startup.

```sh
python3 -m uvicorn leaklens.api:create_app --factory --host 127.0.0.1 --port 8000
```

Bind through a properly configured HTTPS reverse proxy before remote use. This repository does not deploy a public server or configure TLS. SQLite serializes writes and persists state but stores one JSON document, so this is intentionally a small-demo store, not scalable telemetry storage. Use one worker for the demo; use Postgres/PostGIS, migrations, scoped user identity, rate limits, backups, monitoring, retention policies and reviewed notices before any real pilot. Reset permanently removes the demo audit; the audit is not tamper-evident. No photos/file uploads, SMS/email, SCADA integration or WNTR/EPANET simulation implemented.
