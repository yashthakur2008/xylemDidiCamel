# LeakLens connected application specification

Date: 2026-11-19 Pacific
Status: approach approved in chat; written specification awaiting review.

## Outcome and scope

Deliver one React/TypeScript web application in `frontend/`, with a public explanatory website, an operations workspace, and a mobile-first crew application. The crew experience is an installable progressive web app (PWA), not a native App Store release. Existing FastAPI and SQLite remain the source of truth. This specification supersedes conflicting frontend persistence/deployment assumptions in `docs/LEAKLENS-DESIGN.md`.

The user approved the dashboard plus installable crew-app approach. Separate native apps would duplicate effort; a disconnected frontend-only mock would not demonstrate the delivered backend. The connected PWA is the selected approach.

## Routes and visual design

- `/`: editorial public website focused explicitly on Water Quality. Original labeled pipe cross-section contrasts outward leakage with potential inward intrusion under pressure loss. Explain the risk/detection/response sequence, limits and pilot proposal. Link directly to operations and crew routes.
- `/operations`: utility workspace with dominant fictional-network schematic, risk-ranked selectable segments, score contributions, real API pressure traces, timestamps and explicit missing/stale states. An incident list and selected incident panel expose advisory editing/approval, crew assignment, sampling progress, pressure recovery and clearance.
- `/crew`: mobile-first approved jobs list and job detail. Present segment/location, repair and flush steps, sample ID/result entry, failed-sample recovery and chronological evidence. No fake photos or unsupported upload controls.
- Use client routing with deployment fallback and explicit unknown-route handling. Direct loads and refreshes must work.

Visual language: warm paper, ink navy, water blue, amber warning and incident-only red. Strong editorial type hierarchy, tabular numeric readings, precise ruled layouts and restrained borders. Avoid gradient blobs, generic card grids, invented metrics and glass effects. The network is a clearly labeled schematic rather than a falsely geographic map. Technical diagrams must include text explanations and accessible labels.

Preserve requested Lovable refinement: use the existing desktop app if reachable without disrupting user input. Record actual generation/refinement results separately. Do not claim Lovable was used when only a prompt was prepared, and do not send role credentials or local private files. Any generated frontend must satisfy this contract and be reviewed in the actual browser.

## Data flow and security

A typed API client handles base URL, JSON parsing, errors and role-specific bearer tokens. Separate modules own network views, incident actions, crew jobs and public explanatory content. Shared components cover status labels, forms, feedback and navigation, not a monolithic page component.

Public read endpoints power the network and event list. Poll every five seconds while visible, refresh after successful mutations, and stop background polling when hidden. Failed reads retain last-known data with a visible stale/offline warning, never a healthy indicator. Prevent overlapping duplicate mutation submissions; do not automatically retry writes.

Private local demo role tokens are entered through password inputs and held in memory only, cleared on reload or disconnect. Operator, crew and ingest credentials remain separate. A role switch changes UI, not server authorization. Never bundle tokens, place them in Vite variables, persist them in browser storage, or retrieve the private token file through a web endpoint. Public reads remain usable without credentials.

Use the existing API response as authoritative state, with no parallel localStorage incident database. Display 401/403/404/409/422 errors accurately. Render advisory text as plain text. On conflicts, refresh the server state without advancing the workflow optimistically.

## Complete demonstration path

1. Inspect risk ranking and contribution breakdown without credentials.
2. Operator starts a main-break scenario for an unused segment through the existing scenario endpoint. Show existing-state conflict with an explicit reset alternative.
3. Operator reviews/edits and approves the simulated advisory, then assigns a crew.
4. Crew records repair, flush and uniquely identified sample results.
5. A failed result visibly requires reflush and two new consecutive clear results. Duplicate samples and out-of-order actions display the backend rejection.
6. A separate demo telemetry panel accepts the ingest credential to submit a current recovery reading. Label this generated telemetry, never physical pump/valve control. Do not bypass ingestion authorization using operator credentials.
7. Operator approves clearance only when the backend permits it. Show audit trail and preserved sample evidence.
8. Reset requires a clearly destructive confirmation explaining that all demo readings, incidents and audit history are removed.

No additional backend mutation API is required. Fresh recovered pressure is necessary for clearance, so the telemetry panel is part of the demo, not an omitted manual Swagger step.

## Installability and offline behavior

Provide a manifest, original icons, standalone display mode and crew start URL. Cache versioned static application-shell assets only. Never cache authenticated API requests, tokens, incidents or mutation responses. Offline, identify that operations are unavailable and disable response submission; never queue safety-related writes. Explain installation in supported desktop browsers and iOS Add to Home Screen. HTTPS is required away from localhost. A phone cannot access the laptop via its own localhost; remote-device use requires a separately configured secure deployment.

## Accessibility and resilience

Keyboard-accessible controls, visible focus, labels and error associations, status announcements and non-color-only severity indicators. Respect reduced motion. At 390px, 768px and 1440px, no unintended horizontal page overflow. Loading, empty, missing-event, unavailable-API and permission-denied states must be intentional. Mobile task controls have at least 44px targets.

## Acceptance and evidence

- Website states Water Quality and fictional/simulation-only boundaries; all CTAs and direct routes work.
- Risk ranking and contributions match API values; graph labels use real returned timestamps/readings, with no invented live values.
- Real browser against isolated real backend completes scenario, approvals, crew work, failed sample, reflush, two clears, recovery telemetry and operator clearance. No API mock substitutes for this acceptance run.
- Verify duplicate sample, incorrect-role, premature clearance, stale readings and offline failures remain blocked and visible.
- Reload preserves server incident state but removes in-memory credentials. Reset confirmation and actual reset checked only against isolated test data.
- Inspect screenshots at desktop/tablet/mobile widths and keyboard behavior. Record Lovable use or any access blocker honestly.
- Production build, static assets and direct route fallback pass. Validate manifest/icons/service-worker scope, verify cache excludes API data, and test install launch when supported. If actual installation cannot be exercised, report that limit rather than claiming it passed.
- Existing backend tests and real HTTP acceptance continue to pass. Document local startup, API configuration, private demo access and deployment requirements.

## Honesty and submission constraints

This is a student simulation, not a utility safety system or California regulatory clearance. No real notices, equipment control, lab integration, WNTR validation, measured health benefits or live customer data. Two clear samples are the demo rule, not a statement of universal California requirements. Public hosting, production per-user authentication, native store distribution and photo uploads are outside this increment.

The supplied official-rules PDF states November 20, 2026 at 1:00 PM Eastern (10:00 AM Pacific), conflicting with the previously cited website time of 1:00 PM Pacific. Use the earlier deadline unless the organizer confirms otherwise. Division remains unconfirmed; never infer high school versus university. Required materials include a project page, registered team, slides disclosing outside help and a viewable 3–4 minute presentation/demo.

## Self-review

Checked against backend/README.md: all workflow endpoints exist, recovery requires ingest credentials, state persists server-side, and no upload endpoint exists. Selected PWA approach does not imply native distribution or live offline operations. Earlier deadline discrepancy is explicit. No placeholder requirements or promised production deployment remain.
