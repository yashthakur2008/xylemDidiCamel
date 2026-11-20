# Confluence lab protocol and replay kit

Canonical app: the installed LeakLens desktop app rebranded **Confluence**.
The Python package remains `leaklens`. This kit uses the current repository's
`backend/leaklens/events.py:ingest`, not `backend/build/lib`, an API server, or a
second detector implementation. It makes no backend/frontend changes.

**Evidence status:** fixtures are synthetic software test inputs, not laboratory
measurements. No operator validation or physical experiment has been performed
by this kit. Preliminary teammate observations must be labeled
`internal-teammate`, never operator validation.

## Run from the repository root

Use the existing backend Python environment (Python 3.11+ and the app's existing
FastAPI/Pydantic dependencies). The lab code adds **no third-party dependencies**:
CSV, JSON, hashes, SVG, CLI and tests use the standard library.

```sh
backend/.venv/bin/python -m unittest lab.test_replay -v
backend/.venv/bin/python -m lab.replay lab/fixtures/synthetic.csv \
  --expected lab/fixtures/expected.json \
  --evidence-kind synthetic --source-note 'Synthetic regression fixture v1' \
  --out lab/runs/synthetic-001
```

For genuinely collected, supervised data, only after following [PROTOCOL.md](PROTOCOL.md):

```sh
backend/.venv/bin/python -m lab.replay lab/raw/session-001.csv \
  --expected lab/raw/session-001.expected.json \
  --evidence-kind supervised-lab \
  --source-note 'Approved bench protocol v1; acquisition record session-001' \
  --out lab/runs/session-001
```

For internal teammate exercises use `--evidence-kind internal-teammate` instead.
`lab/raw/` and `lab/runs/` are ignored to prevent accidental publication of data.
The actual trace replay path is this CLI, **not** the desktop built-in simulation
buttons. Initial app evaluation uses built-in simulations only, each in a
separate isolated app run state selected by the evaluation owner. Do not reset
or reuse the main demonstration database. This CLI does not open any database,
start the app, make network requests, or select/change app run states.

## CSV contract

Exact UTF-8 header (UTF-8 BOM accepted):

```csv
trace_id,scenario,segment_id,elapsed_s,pressure_psi,sample_status,source_id
```

The standard-library CSV parser runs in strict mode. Unterminated quoted fields
or unexpected text after a closing quote fail with exit 2 before artifacts are
created. Correctly quoted fields containing commas remain supported.

* Each `trace_id` is an independent run with an empty in-memory state. Its
  `scenario` is constant. Different segments share only that trace's state.
* `segment_id` must be a current fictional ID: `CA-001`, `CA-002`, `CA-003`.
  Map a bench sensor to a fictional segment in the acquisition record. Never
  imply these IDs identify a real distribution network.
* `elapsed_s`: finite seconds relative to acquisition origin, **0 through 110**.
  Strictly increasing per trace/segment, including missing rows. Different
  segments may share timestamps. Input order is validated before merge by time.
  Maximum 10,000 rows per file. No duplicate time, NaN or infinity is accepted.
* `pressure_psi`: finite 0..300 for `sample_status=observed`. This is a software
  input bound, **not** a safe bench pressure or an instruction to apply pressure.
* `sample_status=missing` requires blank psi and makes **no call to ingest**.
  An `observed` row with blank psi is rejected, never imputed as zero. No
  interpolation. Missing is telemetry availability, not a water-quality sample.
* `trace_id`, `scenario`, `source_id` are nonblank source labels. Keep source
  identifiers anonymous and record device/file lineage outside the raw trace.
  Whitespace is stripped for analysis only. The exact original bytes are kept.

### Detector and time contract

The CLI fails if the current policy is not low **<20 psi**, duration **>=5 s**,
maximum consecutive observed reading gap **30 s**, freshness **120 s**.
Exactly 20 psi is not low. A gap strictly greater than 30 resets low continuity.
Missing rows neither reset nor advance the detector. The next observed reading
applies the gap rule. Detection happens only on an ingested reading, not a timer.
Recovery does not close an event. The CLI does not execute clearance/workflow
transitions, so an active event is counted once, even after subsequent low runs.

Historical absolute acquisition dates are not in this CSV schema. Preserve them
in the acquisition record and `--source-note`; never call historical input live
telemetry. For each trace the CLI sets:

```
origin = current UTC - (last elapsed_s + 1 second)
observed_at = origin + elapsed_s
```

Intervals are preserved to Python datetime's microsecond precision. The 110 s
bound leaves nine seconds of headroom inside the real 120 s freshness check.
There is **no clock patch, freshness bypass, time compression, or sleep**. If a
slow/suspended process exceeds freshness, real ingest rejects the run (exit 2).
Longer traces must not be silently truncated/compressed: preregister independent
<=110 s windows and document lost cross-window continuity, or design a separate
historical ingestion facility outside this kit. Rebased replay cannot establish
original freshness, sensor/network delay, UI responsiveness, or real-time latency.

`detection_elapsed_s` is the input row that first created the event.
`low_since_elapsed_s` is the event's low-pressure origin, translated back to
trace-relative time. The backend `detected_at` is replay processing wall time and
is deliberately **not used as a detection latency**.

## Artifacts and exit codes

A new `--out` directory is required. Existing paths are never overwritten.

| File | Contract |
|---|---|
| `raw.csv` | Byte-for-byte preserved input, including line endings |
| `expected.json` | Byte-for-byte frozen expectations, if supplied |
| `results.json` | Schema version 1, policy, per-condition counts/times, parsed points, provenance |
| `results.csv` | Per trace/segment summary, time arrays as JSON cells, formula-like text prefixed with an apostrophe |
| `chart.svg` | Annotated pressure chart with threshold, alerts/low origins, missing markers and broken lines at missing rows or observed gaps >30 s |

Provenance records SHA-256 of raw and expected files and the backend events,
network and models source files, plus `lab/replay.py` and `lab/PROTOCOL.md`.
It also records source note, evidence kind, analysis UTC and
per-trace rebase origins. Hashes establish content identity, not authenticity or
proof that expectations were registered before acquisition. Preserve the signed
or timestamped protocol separately. Chart connecting lines are visual guides,
not inferred readings or evidence of continuity between samples. Observed gaps
strictly greater than 30 seconds are annotated as continuity resets, including
when an explicit missing row lies between the observations.

For spreadsheet safety, derived CSV text beginning with `=`, `+`, `-` or `@`
(after leading whitespace) gets an apostrophe prefix. JSON keeps the analyzed
labels unchanged and is the canonical machine-readable summary. `raw.csv` is
always byte-exact, **not spreadsheet-sanitized**. Inspect untrusted raw CSV in a
plain-text editor or import it explicitly as text, not by opening it as a
spreadsheet with automatic formula interpretation.

Exit **0**: analysis succeeded (all supplied expectations match).
Exit **1**: artifacts written but one or more expected outcomes mismatched.
Exit **2**: invalid input, incompatible policy, ingest failure, or I/O failure.
Without `--expected`, `expectation_match` is null, not a pass. A filesystem failure
while writing can leave partial output; retain it as failed and use a new path.

Expected JSON has a `results` array with exactly one entry for every
`(trace_id, segment_id)`, each containing `alert_count`, `detection_elapsed_s`,
and `low_since_elapsed_s`. See [fixtures/expected.json](fixtures/expected.json).
Freeze it **before** the run. Never edit expectations to fit results. The shipped
fixture outcomes are preregistered for software regression only.

See [PROTOCOL.md](PROTOCOL.md) for conditions and safe boundaries and
[comparison-rubric.md](comparison-rubric.md) for a blank human comparison method.
