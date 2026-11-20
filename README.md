# LeakLens

**Water Quality: clean at the plant, protected to the tap.**

LeakLens is a student prototype connecting pipe intrusion susceptibility, sustained pressure-loss detection and human-approved incident response. Water savings are a secondary benefit, not the central challenge claim.

## What exists

- Working **FastAPI backend** with a fictional California-style network, explainable risk scores and bounded pressure history.
- Sustained low-pressure event detection, editable advisory drafts, operator-approved crew assignments, repair/flushing records and sample tracking.
- Failed-sample recovery, explicit operator clearance, audit history and persistent SQLite storage.
- Tests, real HTTP workflow/restart verification and an installable Python package.

The Lovable frontend is a separate workstream. This repository does **not** yet contain the generated website/app or claim that it is connected to the API.

## Run locally

```sh
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
.venv/bin/python -m leaklens.dev
```

API documentation: **http://127.0.0.1:8000/docs**. Health: **http://127.0.0.1:8000/health**.
The local launcher creates random role tokens in `backend/.local-tokens.json` with owner-only permissions. Keep this ignored file private. The application binds only to loopback.

See [backend setup and frontend integration](backend/README.md), [design specification](docs/LEAKLENS-DESIGN.md), and [Lovable iteration prompts](docs/LOVABLE-PASSES.md).

## Safety and evidence boundaries

All network data and notifications are simulated. The backend does not operate pumps or valves, send messages, infer contamination from pressure alone, or provide regulatory clearance. The below-20-psi reference and two-clear-sample rule are demo configuration, not a universal legal standard. California-specific sampling and notice requirements need qualified review before any pilot.

Risk weights are transparent demonstration rules, not calibrated probabilities. No WNTR/EPANET run, live sensor integration, utility pilot, health benefit, cost saving or detection accuracy is claimed. Photos, PostGIS, real identity management and work-order integrations remain future work.

## Competition

Target: Xylem Global Student Innovation Challenge 2026, **Water Quality**. Division still needs confirmation. Submission requires a project page, slides, a 3–4 minute video and disclosure of outside assistance. Deadline: November 20, 2026, 1 PM Pacific. [Official challenge page](https://xyleminnovationchallenge.bemyapp.com/).
