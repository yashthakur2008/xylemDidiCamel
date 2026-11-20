# Protocol v1: bounded pressure-event replay and supervised bench observation

## Scope and safety boundary

This is a demonstration method, not contamination detection, regulatory
clearance, or validation of public-health decisions. Low pressure is a simulated
risk signal. No microbiological inference follows from a pressure trace.

Start with synthetic fixtures and built-in app simulations. No external people
are recruited or contacted. No software here controls pumps, valves, sensors,
SCADA, or any lab hardware. No external advisories or messages are sent.

Physical data collection, if separately authorized, is performed only by a
qualified on-site supervisor using their approved, isolated, non-potable bench
apparatus, operating limits, PPE, inspection, containment, and stop procedure.
Do not connect to drinking-water/service infrastructure. Do not introduce
biological/chemical contaminants. Do not intentionally create unsafe pressure,
backflow, flooding or electrical exposure. The numeric synthetic inputs below
are software fixtures, **not hardware setpoints**. If an approved safe apparatus
cannot produce a condition, label it untested and use synthetic input instead.
Stop on unsafe conditions, leaks outside containment, unexpected equipment
behavior, uncertain calibration, lost supervision, or participant discomfort.
Only the supervisor performs hardware operations and emergency isolation.

## Preregister before acquiring or viewing evaluation outcomes

Copy this protocol to the run record. Fill date, owner, purpose, evidence class,
app build/source hashes, anonymous source IDs, instrument/calibration/units and
uncertainty, acquisition clock origin and cadence, approved hardware limits and
stop authority (if applicable). Record planned conditions, order, repetition
count, independent run-state IDs, exclusions, expected JSON, and analysis version.
Freeze and timestamp/hash those records before acquisition. Deviations belong in
an append-only note, not a rewritten hypothesis. Report every planned run,
including invalid, stopped, missing and inconclusive runs. No optional stopping
or discarding inconvenient outcomes. Do not manufacture observations to complete
a condition.

### Fixed software conditions and expected outcomes

All examples below are **synthetic**, `(elapsed seconds: psi)`. For each independent
trace use CA-001 and a fresh state. A listed gap is absence of an observed reading,
not evidence that pressure stayed low throughout that gap.

| Condition | Input schedule | Preregistered outcome |
|---|---|---|
| sustained | 0:45, 1:12, 6:12, 10:12, 11:45 | Exactly 1 alert, t=6, low_since=1 |
| brief | 0:45, 1:12, 5:12, 6:45, 10:45 | 0 sustained alerts |
| baseline | 0:45, 5:45, 10:45 | 0 alerts |
| threshold | 0:20, 5:20, 10:20 | 0 alerts, strict threshold |
| missing | 0:45, 1:12, 6:blank/missing, 32:12, 37:12 | 1 missing, 4 ingested, 1 alert at 37, low_since=32 |
| gap30 | 0:12, 30:12 | 1 alert at 30, low_since=0 |
| gap31 | 0:12, 31:12 | 0 alerts, continuity reset |

Invalid inputs (nonfinite, duplicate/out-of-order time, unknown segment,
status/psi contradiction, overlong trace) are rejected, not classified as
negative detections. No measured-data performance rate may be inferred from
these deterministic software checks. For a measured bench experiment preregister
its feasible schedules and expected criteria independently. Do not reuse the
synthetic labels as if they were measured ground truth.

## Execution and preservation

1. Verify permissions and supervision if physical collection is contemplated.
   Otherwise remain in synthetic/simulation mode. Record the evidence class.
2. For the installed Confluence app evaluation, the evaluation owner starts a
   separate isolated run state per condition, preserving the main demo DB.
   Initially exercise built-in simulations only. Record actions and outcomes
   without implying those buttons replay the CSV. No resets of the main app.
3. For trace acquisition, preserve the original device export unchanged and hash
   it. Create the seven-column CSV as a separately identified derivative if
   conversion is needed. Document conversion, units, clock origin, missing
   samples, calibration and fictional segment mapping. Keep both files.
4. Register expected outcomes, then run the CLI in README. It creates an empty
   dictionary state per trace and never touches app persistence. A second CLI
   invocation is independent of the first. Never combine repetitions under one
   trace ID. If data exceed 110 s, reject or explicitly redesign independent
   windows before analysis, retaining the complete original export.
5. Check exit status and every expected comparison. Retain raw, hashes, frozen
   expectations, counts, SVG, JSON/CSV, protocol version and deviations. Review
   missing rows and rejected traces rather than converting them to zero psi.
6. Report detection timestamps on the trace axis and low origins. Separate any
   human stopwatch task timing from detector timing. Neither is network latency.
   Report uncertainty and small-sample limitations. A software alert is not
   confirmation of a physical leak or contamination.

## Human comparison, only if separately authorized

Use the blank template and rubric. Teammate exercises are internal usability
feedback, **not operator validation**, regardless of job title or convenient
access. This kit does not authorize recruitment or contact. No completed human
results are supplied. A later operator study requires its own approved protocol,
consent/privacy process and predefined sampling/analysis plan.
