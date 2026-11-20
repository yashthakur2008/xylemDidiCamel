# LeakLens offline desktop application

## Approved scope
Keep the landing page on Lovable. Deliver an installable desktop application for macOS and Windows, not a browser shortcut. Reuse the verified React interface and FastAPI incident workflow. Each installation is an independent simulation with local persistent data. Shared multi-user synchronization is out of scope.

## Application architecture
A desktop shell owns one application window and one bundled Python backend process. Package frontend assets and a platform-specific Python executable with the application. Neither Node nor Python nor a separately started server is required on the user's machine. The renderer runs the operations and crew screens, not the marketing landing page. The shell implementation will be selected after investigating packaging compatibility.

The backend binds only to loopback on an available port. The shell waits for authenticated readiness before showing the interface and stops only its own child process on exit. Startup failure shows an actionable error rather than a blank window. A second application launch focuses the existing window rather than starting another writer.

## Data and security
Store the SQLite database in the platform application-data directory, outside installation assets, preserving it across restarts and upgrades. Generate private per-launch credentials. Do not embed reusable tokens in distributed assets or log them. Deliver credentials through a narrowly scoped trusted desktop bridge, with no general filesystem or process access exposed to the renderer. This is a single-user demonstration, not production identity management. Keep existing operator/crew approval semantics and simulation labels.

Serve packaged assets and API through a controlled local origin. Reject unexpected navigation and new windows. External documentation links may open in the system browser, but the product itself runs in its desktop window. Disable web service-worker caching in desktop mode. No telemetry, notifications to real customers, equipment controls, or cloud services are introduced.

## Distribution
Produce a macOS application/disk image and Windows installer using platform-specific build jobs. Document supported architectures based on produced artifacts rather than claiming unbuilt variants. Signing and Apple notarization require external credentials and are not assumed available. Unsigned demo builds must be clearly labeled with platform trust warnings. No bypass of OS security settings is automated. Public GitHub publication has been approved, but uploaded files and history must first be checked for private credentials and local data.

## Acceptance evidence
1. Install or launch the packaged macOS application without development servers, Node, or Python on PATH.
2. Exercise risk selection, pressure-loss simulation, reviewed advisory approval, assignment, repair, flushing, failed sampling and reflush, two clear samples, pressure recovery, and operator all-clear through the desktop UI.
3. Quit and reopen the packaged application and verify persisted incident/audit data.
4. Test duplicate launch, backend startup failure, clean shutdown, and absence of orphaned owned backend processes.
5. Verify network-independent launch and workflows. Avoid relying on externally hosted fonts.
6. Confirm platform build outputs and installer metadata. A Windows build alone does not establish Windows runtime acceptance; report untested Windows execution explicitly unless a Windows runner exercises the actual packaged program.
7. Re-run existing backend and web regression tests after shared-code changes.

## Non-goals
App Store submission, shared hosted databases, real utility data, operational safety certification, automatic updates, native widget rewrites, and mobile-store distribution.
