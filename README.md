# Confluence

**Water Quality: clean at the plant, protected to the tap.**

Confluence (formerly LeakLens) is a student prototype connecting pipe intrusion susceptibility, sustained pressure-loss detection and human-approved incident response. Water savings are a secondary benefit, not the central challenge claim.

## Desktop application

Confluence has a standalone **macOS and Windows desktop app** with its own window, bundled backend, automatic local access, and persistent offline data. No browser, Python installation, or terminal setup is required for installer users. The landing page remains hosted on Lovable.

See [desktop installation and build instructions](desktop/README.md) and [release downloads](https://github.com/yashthakur2008/xylemDidiCamel/releases). Builds are **unsigned student demos**, not notarized or App Store releases. Each installation is independent, with no shared cloud synchronization.

## What exists

- Working **FastAPI backend** with a fictional California-style network, explainable risk scores and bounded pressure history.
- Sustained low-pressure event detection, editable advisory drafts, operator-approved crew assignments, repair/flushing records and sample tracking.
- Failed-sample recovery, explicit operator clearance, audit history and persistent SQLite storage.
- Tests, real HTTP workflow/restart verification and an installable Python package.

- Connected **React website, operations dashboard and mobile crew PWA**, including a risk schematic, pressure traces, sample workflow and audit trail.
- Production browser acceptance tests against real FastAPI, plus offline-shell and Chromium installability checks.

Open the local website at **http://127.0.0.1:5173**, operations at **/operations**, or the crew app at **/crew** after starting both services. The Lovable `/ops` browser walkthrough is a separate, simplified implementation. Use the installed Confluence app for the canonical evaluation workflow. See [Lovable handoff status](docs/LOVABLE-HANDOFF.md).

## Operator evaluation and lab evidence

Open **Test mode** in Confluence. Set an anonymous participant code and freeze a reviewability rubric before choosing the sustained main-break or ambiguous brief-dip scenario. Save investigation notes, advisory and sampling-plan changes. Mark the first response ready, record reviewer assessment, and export JSON or CSV. Each trial is isolated and retained when starting another trial. Normal Operations records are not reset.

See the [evaluation runbook](docs/OPERATOR-EVALUATION.md) and [lab replay kit](lab/README.md). The kit exercises the actual detector using timestamped CSV, preserves raw input, and produces annotated charts plus counts. Shipped fixtures are synthetic. **No real sensor accuracy or faster operator-response result is claimed.** Physical rig trials and an operator-reviewed baseline comparison remain to be collected.

## Run locally

```sh
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
.venv/bin/python -m leaklens.dev
```

API documentation: **http://127.0.0.1:8000/docs**. Health: **http://127.0.0.1:8000/health**.
The local launcher creates random role tokens in `backend/.local-tokens.json` with owner-only permissions. Keep this ignored file private. The application binds only to loopback.

In a second terminal:

```sh
cd frontend
npm ci
npm run build
npm run preview -- --port 5173 --strictPort
```

See [frontend setup and demo walkthrough](frontend/README.md), [backend setup and frontend integration](backend/README.md), [design specification](docs/LEAKLENS-DESIGN.md), and [Lovable iteration prompts](docs/LOVABLE-PASSES.md).

## Safety and evidence boundaries

All network data and notifications are simulated. The backend does not operate pumps or valves, send messages, infer contamination from pressure alone, or provide regulatory clearance. The below-20-psi reference and two-clear-sample rule are demo configuration, not a universal legal standard. California-specific sampling and notice requirements need qualified review before any pilot.

Risk weights are transparent demonstration rules, not calibrated probabilities. No WNTR/EPANET run, live sensor integration, utility pilot, health benefit, cost saving or detection accuracy is claimed. Photos, PostGIS, real identity management and work-order integrations remain future work.

## Competition

Target: Xylem Global Student Innovation Challenge 2026, **Water Quality**. Division still needs confirmation. Submission requires a project page, slides, a 3–4 minute video and disclosure of outside assistance. Deadline discrepancy: the supplied official-rules PDF says November 20, 2026, **1 PM Eastern / 10 AM Pacific**; the website previously cited 1 PM Pacific. Use the earlier deadline unless the organizer confirms otherwise. [Official challenge page](https://xyleminnovationchallenge.bemyapp.com/).
