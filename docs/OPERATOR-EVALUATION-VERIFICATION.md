# Confluence 0.2 operator-evaluation acceptance

This report concerns the installed canonical Confluence app and its checked-in API/frontend. Lovable's separate simplified `/ops` walkthrough is not the benchmark target. Software tests use synthetic data and do not establish operator speedup, sensor accuracy, contamination, or regulatory clearance.

## Requirement-to-check map

| Requirement / changed output | Concrete acceptance path | Observed result |
|---|---|---|
| One operator decision with trace, threshold, onset and risk | Production browser evaluation and Operations views, backed by FastAPI | Main-break displays sustained loss, CA-001 risk contributions, true time-axis pressure trace, threshold policy and replay-time disclaimer. |
| Potentially affected area and missing information | Actual evaluation screen | Fictional North zone labeled candidate area, not validated customer boundary. Sensor, isolation/boundary and sampling confirmation remain explicit. |
| Same incident through response | Full production browser trial test | Edited advisory, saved investigation, frozen first answer, reviewer correction, advisory approval, crew assignment, repair, flush, failed sample, reflush, two clear samples, recovery and explicit closure completed. Export retained those actions. |
| Editable sampling plan with approval gates | Real API + browser save | Operator-only edits, stale expected-plan conflict, post-dispatch lock. New typing during delayed save is preserved. |
| Ambiguous second scenario | Real brief-dip API + browser test | Five readings, no sustained incident or advisory. Investigation remains available. |
| Repeat/reset without destructive effects | API persistence + browser reset/resume + desktop reopen | Independent run IDs, ordinary Operations record unchanged, previous trials retained. |
| Repeatable evidence export | Actual browser downloads | JSON contains frozen answer and saved plan, benchmark_result remains null. CSV contains advisory edit, reviewer assessment and clearance. |
| First answer and correction integrity | API actions and exports | First answer remains unchanged after later notes; before/after edits and reviewer records retained. Reviewer scoring is not automatic validation. |
| No false timing from UI/history latency | Delayed real history response browser test | Scenario display acknowledgement no longer waits for a second history fetch. |
| No save-related text loss | Delayed real backend response tests | Notes normalize without locking readiness; sampling-plan and next sample-ID typing survive earlier save completion. Header navigation cancellation retains unsaved notes. |
| Clock rollback and corrupt stored evidence | API tests on persisted records | Negative total and intermediate rollback invalidate timing rather than reporting a valid duration. Malformed envelope returns safe503; no evidence is silently repaired. |
| Versioned, frozen original stimulus | API creation/export across changed runtime constants | Original stimulus, trace hash, source hashes and policy retained. Current network is explicitly labeled live-derived. Legacy records remain unversioned, not given invented provenance. |
| Lab pressure replay and artifacts | Public CLI using actual events.ingest | Seven synthetic conditions match preregistered expectations. Raw bytes preserved, chart/CSV/JSON produced. Missing readings are never ingested as zero. |
| Lab edge cases | Independent 13-test suite | Invalid CSV, nonfinite values, drifted policy, mismatched expectations, overwrite refusal, formula escaping, freshness and >30-second gaps checked. |
| Genuine landing screenshots | Actual one-trial browser captures, public raw downloads | Three images from the same fictional CA-001 trial published at b2f700e; downloaded public bytes match local assets. |
| Actual Lovable developer handoff | Installed Lovable project | Original brief accepted and generated preview observed. Final publication state is recorded separately in LOVABLE-HANDOFF.md, not inferred from local work. |

## Final release checks

Final frozen-runtime, installer, native export and cross-platform acceptance results are appended after they actually finish. Earlier packaged tests are not treated as verification of later source changes.

## Real-world evidence still pending

No actual pressure rig or utility operator was available through these tools. The lab kit supplies a protocol and blank comparison forms, not fabricated observations. Ready-null runs are incomplete, not zero-time successes. The first-ready timestamp is a participant declaration split. A preregistered external timer and reviewer must establish the first genuinely reviewable version for a speed comparison. Actual participant identities and reviewer independence are self-reported, not certified by this app.

## Final local result, source 56b388b

- Full backend with the final frozen executable: **127 passed**. This includes authenticated loopback readiness, assets, actual API mutation, empty-PATH launch, EOF and termination shutdown. An earlier cold EOF launch exceeded its 20-second test deadline once (126 other cases passed). The unchanged executable then passed the entire suite. The cause of that first timeout was not established, so it is not hidden or presented as an initial clean run.
- Shell lifecycle suite: **4 passed**, covering startup deadline, missing runtime, unexpected exit and owned-child cleanup.
- Full production frontend against the real backend: **18 passed**. The same-incident workflow and both actual download formats are included, alongside delayed reads/writes, conflicts, responsive views and offline safety.
- Independent lab suite: **13 passed**. CLI seven-condition fixture run exited0 and wrote raw CSV, results and an annotated SVG. These are synthetic conformance observations only.
- Actual packaged Mac app: **9 passed** in the native acceptance suite, with empty PATH and isolated data. Includes complete response/restart, single instance, evaluation persistence, cancelled quit/reload/window-close retaining both draft and healthy backend, malformed/untrusted IPC rejection, crash escape, and native JSON/CSV downloads whose saved bytes contain schema1, version0.2.0 and available detector source hash.

The installed-app and Windows-installer boundaries are still recorded below only after their final runs complete.

### Installed Mac acceptance

The final local DMG passed `hdiutil verify`, was mounted read-only and copied to `/Users/yashthakur/Applications/Confluence.app` without replacing the older LeakLens.app. All **9 native acceptance tests passed against that installed executable**, including actual JSON/CSV file downloads, persistence and native dirty-edit protection. Test data used isolated temporary directories, not the user's existing demo records. Independent macOS CI also passed at run44722472425.

### Lovable boundary

Lovable accepted the original landing brief and produced an unpublished preview. The safe follow-up availability check found another application frontmost and only shallow Lovable accessibility groups. Final screenshot/method insertion, full mobile acceptance and publication remain blocked on safe access. The handoff at `docs/LOVABLE-HANDOFF.md` contains the exact project, pinned public screenshot URLs and verified methods URL. No claim is made that the revised public landing is live.

### Final cross-platform and public release acceptance

Final CI [44723345996](https://github.com/yashthakur2008/xylemDidiCamel/actions/runs/44723345996), source `610f29272bdd981652eb23942a70660fe854b59a`, passed on macOS and Windows. Both built and exercised the packaged application without developer runtimes. Windows additionally installed the generated NSIS setup and passed acceptance against the installed executable. The prior Windows failure was a test synchronization race: Save disabled also meant busy. The test now observes the persisted Notes entry and completed save controls before quitting, without bypassing the native dirty guard.

[Public v0.2.0 release](https://github.com/yashthakur2008/xylemDidiCamel/releases/tag/v0.2.0) contains those CI installers, not a separately rebuilt substitute. Both assets and SHA256SUMS.txt were downloaded without authentication and verified:

- `Confluence-0.2.0-arm64.dmg`: `1ad1a512dd5bd53c45fff992a6d3de47f51f94ecf72b7d11db5b16e62015bfd7`
- `Confluence.Setup.0.2.0.exe`: `cb96bf2297bc88b5c244d9e09b30147d05cb456011c1fe5864acea45e0d0bc63`

These are unsigned demonstration installers. Passing packaged/installed tests does not establish notarization, SmartScreen reputation, or empirical operator benefit. Lovable publication remains pending independently of this release.

The publicly downloaded CI Mac DMG also passed hdiutil verification, was mounted read-only and copied into an isolated scratch installation. All **9 native tests passed against that exact public artifact** (30.8 seconds), including full incident/restart, isolated trial persistence, quit/reload/close cancellation, IPC rejection, crash shutdown and real JSON/CSV saved bytes. This closes the public-download-to-running-app boundary rather than relying only on the local build.
