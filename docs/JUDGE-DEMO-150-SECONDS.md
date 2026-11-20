# Confluence: 150-second judge demonstration

**Role:** “I’m acting as the utility operator.” This is role-play, not a claim that the presenter is a utility operator. **Format:** three minimal slides, one continuous live incident, exactly **2:30** including transitions. Speak only the quoted script below. All data, field actions, notices and sample results are simulated.

## Choose the simplest current path

Use **Operations → Crew app → Operations**, preferably in the freshly rebuilt native desktop app. It supplies local credentials automatically. The same sequence works in the local browser app after entering credentials. Do not open the public marketing site during the presentation.

**Important source correction:** the earlier “sampling editing is only in evaluation” limitation does not match the current working source. `Incident.tsx` renders `SamplingPlan` in Operations as well as Test mode. `SamplingPlan.tsx` offers **Sampling plan draft → Save sampling plan**, backed by `PATCH /events/{id}/sampling-plan`. Editing locks after dispatch. Verify this in the actual build you will present. An older installed binary may not include it. Rebuild/use the current local frontend before the clock, rather than mixing an Operations incident with an unrelated trial.

**Test mode is not the Operations incident board.** `/evaluation` creates isolated trial records with a participant code, participant type and frozen rubric. **Run main-break trial** creates the trial scenario. **Reset test / new trial** preserves earlier trials and Operations records. It is useful for separately rehearsing/reviewing a response, not required for this live demonstration. If used outside the clock, choose **Internal teammate usability test**, not “Utility operator,” unless that description is true. Trial timing is not evidence of faster response. Do not claim operator validation, a physical test rig, actual telemetry, or measured impact.

## Preparation outside the 150-second clock

1. Launch and check the exact build beforehand. In desktop, wait for local backend readiness and the intro to finish. In the browser, run the backend/frontend using their READMEs, open `/operations`, expand **Demo access**, and enter the local **Operator token**, **Crew token**, and **Ingest token**. Collapse access afterward. Tokens stay in browser memory, so use the in-app navigation rather than reloading or opening a new app tab.
2. Rehearse once in disposable demo data. If a clean board is needed, **Reset demonstration → Type RESET DEMO → Delete demo data** deletes **all** Operations incidents, readings, samples and audit history. Only do this outside the clock and only if that data is disposable. Do not reset evidence you want to retain. Test-mode reset does not clean Operations.
3. Start with **CA-001 / Orchard crossing**, **no stored readings** (Pressure record shows missing/no readings), no active incident, and **Backend connected**. The scenario endpoint rejects replay if CA-001 already has readings, even when its previous incident is closed. Do not pre-detect, pre-approve, pre-dispatch, or pre-record samples for the timed run. The incident must begin live.
4. Confirm **Sampling plan draft** exists during rehearsal, and both edits save before dispatch. Keep the default `CREW-01`. Practice typing the two short additions and sample IDs below. No prepared customer notices, actual sampling locations, or real personal data are needed.
5. Open `docs/demo-slides.html` locally in a separate browser window. It has no dependencies. Left/right arrows change slides. `N` toggles speaker notes, off by default. Keep notes hidden on the projected screen. Prepare one keyboard switch between slides and the app. Use a readable landscape window and rehearse the actual scrolling at that size.
6. Time a manual run on the presentation machine. The schedule reserves click time, but is **not** a measured human completion-time claim. If loading consumes the budget, omit commentary, not approvals or evidence. Never announce closure before **Incident closed** is visible. If the backend is unavailable, say the live workflow could not be completed rather than showing an unlabelled recording or pretending success.

## Minimal slide text

### Slide 1 · 00:00–00:12

**Confluence**
Pressure evidence. Human decisions.
A simulated utility response, start to finish.

### Slide 2 · 00:12–00:22

**One incident. A visible decision trail.**
Detect → Review → Dispatch → Repair + sample → Approve
People authorize the response.

### Slide 3 · 02:20–02:30

**Evidence before all-clear.**
Repair + flush · Two clear simulated samples · Fresh pressure · Human approval
Prototype demonstrated. Real-world impact unmeasured.

## Exact run of show

The intervals below are contiguous and total **150 seconds**. Talk while clicking, then use the remainder of each interval for the indicated interaction and confirmation. The quoted passages are the entire **245-word** spoken script (whitespace-delimited count). Actions, headings and slide text are not extra narration.

| Clock | Seconds | Screen and exact action | Spoken script |
|---|---:|---|---|
| 00:00–00:12 | 12 | Slide 1. No application interaction yet. | “I’m acting as the utility operator. Confluence connects pressure evidence to a human-approved response. Everything today is simulated: no actual contamination, equipment operation, or public notice.” |
| 00:12–00:22 | 10 | Right arrow to slide 2. Switch to the already-open Operations app at the end of this interval. | “I’ll take one incident from detection through field records to explicit clearance. Watch who approves each step, and what evidence remains.” |
| 00:22–00:38 | 16 | **Simulate main break**. Wait for the response record. Point to the **Pressure record**, then scroll to **Advisory review**. | “Here’s a simulated main break. Sustained low pressure triggers this record. The risk score helps prioritize investigation. Neither that score nor this alert proves contamination.” |
| 00:38–01:05 | 27 | Read the draft, append ` Demo review complete.` to **Advisory draft**, click **Save draft**, and wait. Read **Sampling plan draft**, append ` Demo location review pending.` to the existing instruction, click **Save sampling plan**, and wait. Preserve the original utility/regulator caveat. | “I review and edit the advisory before approving it. I also review the sampling plan, retaining the requirement to confirm locations with the utility and regulator.” |
| 01:05–01:18 | 13 | Click **Approve simulated advisory**. Wait for **Advisory approved**. Keep `CREW-01`, click **Approve crew assignment**, and wait for **Crew assignment approved**. | “These edits are saved. I explicitly approve the simulated advisory, then approve the crew assignment. This records the handoff without sending any real public message.” |
| 01:18–01:35 | 17 | Click **Crew app** in desktop, or **Crew app ↗** in browser. Confirm the assigned CA-001 incident. Click **Record repair**, wait for **Repair complete**, then **Record flush**, wait for **Flush complete**. | “Now I’m showing the crew’s view. The approved job is available. I record the simulated repair, then the flush. These are records, not equipment controls.” |
| 01:35–01:56 | 21 | In **Sampling notebook**, enter `DEMO-01` in **Sample ID**, leave **Sample result = Clear**, click **Record sample**, and wait for the ID to clear/evidence to appear. Repeat with `DEMO-02`. Show **2 / 2 consecutive clear**. | “I enter two distinct, simulated clear sample results. These are demonstration entries, not laboratory findings. Two clear results make clearance eligible, but do not close anything.” |
| 01:56–02:10 | 14 | Click **Operations**, then **Submit recovery reading** near the top. Wait for refresh. Point to **45 psi** and **fresh** in Pressure record, then scroll to **Operator sign-off**. | “Back in Operations, I submit a fresh simulated recovery reading. Pressure recovery is additional evidence. The operator still has to make the final approval.” |
| 02:10–02:20 | 10 | Click **Approve simulated all-clear**. Wait for **Incident closed**. Point briefly to **Decision trail**. Do not switch away before closure is visible. | “I explicitly approve the simulated all-clear. The incident closes with its decision trail preserved. This is not regulatory clearance, and no actual notice is distributed.” |
| 02:20–02:30 | 10 | Switch back to slide 2, then right arrow to slide 3. Stop at 02:30. | “That’s the complete prototype workflow: evidence, human approvals, and a traceable response. Real-world accuracy and response-time benefits still need validation with utilities.” |

## What each live click actually does

All paths below are relative to `/api/v1`. `{id}` is the incident created live. The frontend supplies bearer role credentials. Switching views alone does not grant permissions.

| UI action | Request / role | Observable gate or result |
|---|---|---|
| Simulate main break | `POST /demo/scenario`, operator, `{segment_id: "CA-001"}` | Requires no existing readings on the selected segment. Deterministic fictional readings create `detected`. The below-20-psi, at-least-five-second demonstration rule is evaluated from supplied observations. You do not wait five real seconds for a sensor. |
| Save draft | `PATCH /events/{id}/advisory`, operator, `{draft, expected_draft}` | Saved text must match the reviewed server version before approval. |
| Save sampling plan | `PATCH /events/{id}/sampling-plan`, operator, `{plan, expected_plan}` | One instruction per line. Current-content guard. Locked after crew dispatch. There is no separate “approve sampling” button. |
| Approve simulated advisory | `POST /events/{id}/advisory/approve`, operator, `{expected_draft}` | `advisory_active`, simulated-only delivery. |
| Approve crew assignment | `POST /events/{id}/job/approve`, operator, `{crew: "CREW-01"}` | Requires approved advisory. `responding`. UI blocks dispatch while the sampling plan has unsaved edits. |
| Record repair / Record flush | `POST /events/{id}/work`, crew, `{step: "repair"}` then `{step: "flush"}` | Approved assignment required. Repair precedes flush. Flush enters `sampling`. |
| Record sample, twice | `POST /events/{id}/samples`, crew, `{sample_id: "DEMO-01", result: "clear"}`, then `DEMO-02` | Unique IDs, repair and current flush required. Two consecutive clears enter `clearance_pending`, not `closed`. |
| Submit recovery reading | `POST /readings`, ingest, `{segment_id: "CA-001", pressure_psi: 45, observed_at: current ISO time}` | Fresh recovered observation. This does not close the incident. Submit late in the demo so it stays fresh at approval. |
| Approve simulated all-clear | `POST /events/{id}/clearance/approve`, operator | Checks clear evidence and fresh recovered pressure, then `closed`. `regulatory_clearance` remains false. |

After every mutation, wait for its visible result before the next click. Controls are disabled while requests/refreshes are pending. Do not double-click or assume a timeout means nothing was saved.

## Optional failed-sample branch: only after the timed demo or in rehearsal

Not part of the 150 seconds. Use a new disposable incident, or branch **before clearance** during an untimed walkthrough. After repair/flush, record `DEMO-FAIL` with **Sample result = Failed**. Show **Reflush required** and the clear streak reset to zero. Click **Record flush** again. Explicitly change the dropdown back to **Clear** because it retains Failed. Record two new IDs, `DEMO-03` and `DEMO-04`. Return to Operations, submit fresh recovery, and explicitly approve simulated all-clear. The failed result stays in the audit/evidence. Do not describe the failure as actual contamination. Closed incidents cannot take further samples.

## Source and test traceability

Checked against the current working source, including uncommitted app refinements, on 2026-11-20. The packaged app must be rebuilt to match it.

- `frontend/src/App.tsx`: Operations/crew routing, scenario and recovery controls, browser token entry, reset warning.
- `frontend/src/Incident.tsx` and `SamplingPlan.tsx`: literal labels, advisory and sampling edits, approval ordering, crew work, samples and all-clear.
- `frontend/src/Evaluation.tsx`: isolated trial setup and non-impact claims, distinct from Operations.
- `frontend/src/useBackend.ts` and `api.ts`: role-token calls, mutation refresh, disabled busy state and API prefix.
- `backend/leaklens/response_api.py`, `workflow.py`, `events.py`, `network.py`: routes, transition guards, pressure policy, synthetic scenario and explicit simulated clearance.
- `frontend/tests/app.spec.ts`: real Operations → Crew → Operations flow, failed sample/reflush, duplicate IDs, rejection before recovered pressure, closure persistence.
- `backend/tests/test_workflow.py`: advisory/dispatch gates, complete failed-sample recovery, explicit clearance, wrong-role rejection and stale-draft protection.
- `backend/tests/test_evaluation.py`: normal-event sampling-plan edit endpoint and stale-content guard, isolated trial lifecycle and real clearance guards.

The tests establish software behavior, not drinking-water safety, detection accuracy, response-time savings, or a guaranteed 150-second human presentation.

### Validation performed for this handoff

- `backend/.venv/bin/python -m pytest -q backend/tests/test_workflow.py backend/tests/test_evaluation.py`: **67 passed**.
- Standalone HTML opened from a local file in headless Chromium. Checked arrow navigation and bounds, notes hidden by default/toggle behavior, all three slides at 1440, 1024 and 390 pixel widths, desktop viewport fit, and no JavaScript errors.
- Programmatically checked contiguous timeline intervals totaling **150 seconds**, **245 spoken words**, and matching HTML speaker notes.
- A timed human rehearsal on the final installed build has **not** been performed as part of this documentation task. Complete that preparation before presenting.
