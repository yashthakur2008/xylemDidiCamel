# LeakLens: approved demo scope and design specification

Date: 2026-11-19 (Pacific)
Status: chat scope approved; implementation not started.

## Goal
A Water Quality competition demo connecting intrusion-prone pipe segments, sustained pressure-loss detection and human-approved incident response. Deliver a public website, utility dashboard and responsive field-crew experience. This is a student prototype, not an operational utility safety system.

## Product boundaries
- One React application, with website, operations and crew routes.
- Clearly labeled fictional California-style network and deterministic simulated telemetry. Do not claim EPANET/WNTR validation or live integration without implementing and verifying it.
- Explainable weighted risk from leak indicators and environmental exposure. Pressure and customer reports enrich incident prioritization; pressure alone is not proof of contamination.
- Sustained pressure below 20 psi triggers a demo event. Exactly 20 psi does not satisfy the less-than threshold. Treat the threshold as a cited operational reference, not a universal legal rule or proof of hydraulic intrusion.
- No pumps/valves controlled. Notices and jobs require explicit operator approval. No real SMS/email delivery.
- Two consecutive clear samples are a configurable demonstration rule, not California regulatory clearance. Failed samples reset the streak and require flushing/resampling. Operator approval remains necessary to lift the simulated advisory.
- Read-only external data architecture is future scope. Demo role switching is not authentication.

## Art direction
Engineering editorial rather than generic SaaS: warm paper background, ink navy text, restrained water-blue, amber for attention and red reserved for incidents. Strong typographic hierarchy, generous margins and precise tabular numerals. Original labeled pipe cross-sections, pressure traces and network drawings carry the story. Avoid gradient blobs, glass cards, decorative KPI rows, pill-heavy navigation and invented testimonials.

Website: asymmetrical editorial hero and technical illustration; pressure/intrusion explanation; three-stage product walkthrough; honest evidence/limitations; pilot approach; clear demo CTA.
Operations: dense but readable utility workspace. Network map dominates, with a risk-ranked segment list, selected-segment explanation, pressure trace, stale-data warning and active incident timeline.
Crew: large readable task steps, explicit location/segment IDs, approved job status, repair/flushing checklist, sample IDs/results and photo attachment. Equipment steps are fictional instructions, not executable controls.

## Demo flow
1. Normal telemetry and explainable segment ranking.
2. Start named main-break scenario. Plot sustained drop and identify affected fictional zone.
3. Operator reviews editable advisory draft and sampling plan. Approval records a simulated notice in audit history.
4. Approve crew assignment. Crew completes repair and flushing checklist and records samples.
5. Failed result requires another flush and resampling. Two consecutive clear samples make clearance eligible, not automatic.
6. Operator approves simulated clearance. Event timeline retains all decisions.
7. Reset clears demo state and returns to a reproducible starting point.

Persist versioned demo state locally, recover safely from corrupted storage, and identify local-only persistence. Reject duplicate sample IDs, missing fields and out-of-order transitions. Handle stale/missing pressure without claiming normal service. No secrets, customer data or real utility topology.

## Lovable iteration protocol
1. Generate complete composition and routes from this specification.
2. Inspect actual render. Request targeted changes for generic patterns, hierarchy and technical diagram clarity. Retain functional behavior.
3. Inspect desktop and mobile output. Refine keyboard focus, contrast, tap targets, empty/error states and reduced-motion behavior.
Record prompts and observed results. Do not claim a pass occurred merely because a prompt was prepared.

## Acceptance matrix
- Website states Water Quality focus and labels demonstration data and limitations.
- Every demo CTA and navigation route works, including direct reload.
- Risk score exposes contributing weights and values.
- Threshold tests: 19.9, 20, 20.1 psi; missing/invalid/stale readings; no duplicate active incident.
- Notice/job approval gates prevent premature crew workflow and simulated delivery.
- Failed sample resets consecutive-clear count. Duplicate IDs rejected. Clearance requires valid samples, completed work and operator action.
- Reload preserves valid local state. Reset and corrupted-storage recovery work.
- Main-break workflow passes end to end, including failure and recovery path.
- Desktop, tablet and 390px mobile layouts have no unintended horizontal scroll. Keyboard navigation and visible focus work. Reduced motion is honored.
- Production build passes and local HTTP/route/asset checks pass. Deployment configuration and demo limitations documented.

## Submission
Official deadline: November 20, 2026, 1 PM Pacific. Required: project page, slides, 3–4 minute video. Judging: Impact, Challenge Fit/Feasibility, Innovation. Confirm High School/University division before final submission. Document outside assistance and verify source citations. Do not invent measured health benefits, validated detection rates, pilot partners or costs.

## Deployment
Prefer a static deployable demo with no credentials or external runtime dependencies required for the judge walkthrough. Real backend, RBAC, sensor ingestion, PostGIS and hydraulic simulation remain explicitly future scope unless implemented. Public deployment and GitHub visibility must be checked before publishing.
