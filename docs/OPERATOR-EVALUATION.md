# Confluence operator-evaluation runbook

## What this can establish

The installed Confluence app is the canonical workflow. The Lovable `/ops` walkthrough is a separate simplified implementation, not a substitute benchmark target. The app's built-in scenarios are **simulated**, not sensor or historical measurements. Automated acceptance runs establish software behavior, not improved operator performance.

The question for a future comparison is: **Does Confluence help a participant prepare a complete, reviewable response faster, without missing required items?** A response-ready click alone does not answer this question. No benefit or accuracy figure is prefilled or calculated.

## Run a repeatable session

1. Launch the installed Confluence app and open **Test mode**. No browser or manual credentials are needed in the desktop build.
2. Use an anonymous participant code. Select Internal, Operator or Engineer accurately. These are self-reported labels, not verified qualifications. Do not enter customer information.
3. Have the qualified reviewer define the required response items before starting. Enter the rubric, then choose **Run main-break trial** or **Run brief-dip trial**. The rubric is frozen for that run.
4. Review the pressure trace, threshold, onset, segment risk contributions and potentially affected area. Record sensor-quality, boundary and sampling uncertainties. Pressure loss does not confirm contamination.
5. Edit and save the investigation notes, advisory and sampling plan. Unsaved text is excluded from the evidence record. Explicit operator approval remains separate from editing.
6. Click **Mark response ready for review** once. This freezes the first saved answer. The server interval is from acknowledgement of display to the participant's declaration, and includes time away and network delay. The browser interval is client-reported and unavailable after resuming. Neither is a validated time-to-reviewable-response measure.
7. Open **Score the frozen first response**. A reviewer assesses the frozen answer against the original rubric, recording missed items, corrections and rationale. A self-reported reviewer code does not establish independence. Subsequent saved edits remain in the event log without replacing the first answer.
8. Continue the same incident: approve advisory, assign crew, open the trial crew notebook, record repair/flush and samples. A failed sample requires another flush. Two consecutive clear samples, fresh recovered pressure and explicit sign-off are demonstration gates, not regulatory clearance.
9. Export **JSON** (canonical complete machine-readable record) or **CSV** (event log with saved before/after edits). Retain the original export before analysis. Treat free-text fields as private research data. Exports contain no role tokens.
10. **Reset test / new trial** returns to setup while retaining prior runs. Resume them from the list. It does not reset normal Operations or delete trial evidence. A run with no ready declaration is incomplete, not a zero-time success or a negative result.

## Scenarios and detector expectations

| Scenario | Trace, seconds:psi | Expected software behavior |
|---|---|---|
| Main break | 0:45, 1:12, 6:12, 10:12 | Sustained event on the t=6 reading, low-pressure origin t=1. Investigation and explicit response workflow available. |
| Brief dip | 0:45, 1:12, 5:12, 6:45, 10:45 | No sustained incident. Investigate transient and data quality. No advisory is automatically created. |

Inputs are replayed without wall-clock waiting. The displayed detection timestamp is ingestion processing time, **not physical sensor latency**. Below 20 psi for at least 5 seconds, with no consecutive observed gap over 30 seconds, is this demo's policy only.

## Separate physical pressure testing

Use [the lab protocol](../lab/PROTOCOL.md) under the lab supervisor's operating limits. The [CLI kit](../lab/README.md) calls the application's actual detector, keeps raw CSV and provenance hashes, and outputs a chart and condition summaries. Missing pressure is not zero. No rig commands are provided by the app. Real traces are replayed through the CLI, not imported by the desktop simulation buttons.

The seven preregistered fixtures test sustained loss, brief dip, steady baseline, exactly-20 threshold, missing data, an exactly-30-second gap and an over-30-second gap. These are **synthetic conformance tests**, not seven lab trials. Alert count means latched incident creation, not every independent low episode. All-missing or prematurely ended traces cannot establish a completed negative trial.

## Human comparison and limitations

Use the [blank comparison protocol and rubric](../lab/comparison-rubric.md). Compare two genuinely comparable incidents and alternate order when possible. Record all participants and cases, including incomplete/abandoned runs, initial omissions, corrections and the first version that the reviewer actually accepts. Keep the timer running externally until that point or the preregistered cap. The app's first-ready timestamp is a split, not that endpoint.

Do not omit unready trials from denominators or assign them zero seconds. App exports do not independently certify participant identity, physical onset, calibration, reviewer independence, or historical authenticity. A small internal teammate exercise must be labeled internal usability testing. Claims of faster operator response require the operator-reviewed comparison, not software tests or a fast automated screenshot.

## Release and landing distinction

Confluence retains the legacy `LeakLens` local data directory. Installers remain unsigned student-demo builds. Independent installations do not synchronize. The public landing's publication state and exact Lovable handoff are recorded in [LOVABLE-HANDOFF.md](LOVABLE-HANDOFF.md).
