# Confluence Operator Evaluation Implementation Plan

> Execute inline with independent lab and Lovable workstreams. Use TDD and review before delivery.

**Goal:** Deliver an operator-centered installed demo and repeatable evidence collection without claiming unmeasured benefits.
**Architecture:** Existing domain workflow stays canonical. An isolated run table holds state and audit snapshots. A dedicated frontend test workspace reuses incident and network components. Lab CLI reuses the detector independently.
**Tech Stack:** FastAPI, SQLite, React/TypeScript, Electron, Python stdlib.
**Spec:** ../specs/2026-11-20-operator-evaluation.md

## Constraints
Preserve existing user data; no real notices or equipment actions; results pending until measured; Lovable owns landing changes; explicitly label old web preview versus installed canonical app.

## Task 1: Atomic sampling-plan editing and isolated evaluation API
Files: backend/leaklens/models.py, workflow.py, response_api.py, evaluation.py, evaluation_api.py, tests/test_evaluation.py.
- [ ] Add failing API tests: trial state does not alter /events, brief dip has zero incidents, preserved prior trials, run action logs before/after text, edit stale guard 409, read-only roles rejected.
- [ ] Implement `EvaluationStore` with transactional run documents and `evaluation_router(store, allow)` mounted at /api/v1/evaluations. Run create freezes participant code/type, rubric, scenario and policy. GET returns state/network/event and log, exports serialized immutable snapshots. POST action routes only known typed workflow actions.
- [ ] Add `SamplingPlan` body `{plan, expected_plan}` and domain `edit_sampling_plan` with current-content equality check before mutation.
- [ ] Run backend pytest and commit only task files.

## Task 2: Operator decision and evaluation UI
Files: frontend/src/Evaluation.tsx, evaluationApi.ts, SamplingPlan.tsx, Operations.tsx, Incident.tsx, App.tsx, styles.css, tests/evaluation.spec.ts.
- [ ] Write browser acceptance for isolated repeatable trial, ready declaration/export, brief-dip uncertainty and saved edits.
- [ ] Add /evaluation navigation, token-aware trial actions, explicit start/ready markers, run history and downloads. Use same Incident component and real backend actions for main-break workflow.
- [ ] Show onset/threshold/potential area/unknowns with time-scaled pressure trace and outstanding clearance checklist. Preserve local dirty sampling plan.
- [ ] Rebrand display strings Confluence while preserving legacy data directory and internal IDs.
- [ ] Build and run complete real-HTTP production suite and commit.

## Task 3: Lab kit and Lovable
- [ ] Lab/statistics agent owns lab/: preregistered fixtures, raw CSV provenance, real-detector replay, annotated SVG and results tables, blank human-comparison forms, tests. No invented empirical results.
- [ ] Lovable liaison submits approved brief to correct existing project, previews mobile CTA and evidence pending. If UI access prevents submission, record precise blocker and handoff artifact rather than pretend completion.

## Task 4: Acceptance and distribution
- [ ] Rebuild bundled backend and frontend, test actual packaged app and persistent prior-data compatibility.
- [ ] Independent review of run timing, provenance, authorization and state isolation; fix defects and repeat checks.
- [ ] Publish updated source and installers only after native acceptance. Document per-requirement evidence and external lab/operator limitations.
