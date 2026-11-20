# Blank comparison rubric: internal exercises are not operator validation

No participants have been recruited and no results are populated. Use
`operator-comparison.csv` only after separate authorization. Keep identities and
contact details out of the dataset. Record an anonymous participant code and
explicit `evidence_class` (initially `internal-teammate`). Do not relabel teammate
feedback as external operator validation or claim representative usability.

## Freeze before an authorized session

* Specify comparator A (for example the same raw pressure table) and B
  (Confluence's simulation view), scenario, exact task, start/stop actions and
  expected answers. Actual CSV replay artifacts and app built-in simulation
  exercises are different stimuli. Do not treat them as interchangeable.
* Predetermine condition order/counterbalancing, repetitions, training, assistance
  allowed and exclusion/stop rules. Use an isolated app run state for each
  simulation. Preserve the main demo DB. No physical network or public notices.
* Example task categories: identify the affected fictional segment, distinguish
  sustained low pressure from brief/missing telemetry, locate pressure evidence,
  recognize that advisory/clearance requires human and regulatory review.
* Capture task seconds with a separate stopwatch only if preregistered.
  Leave unavailable measurements blank, never zero. No detector-latency claim.

## Per-task scoring anchors (blank until observed)

| Score | Meaning |
|---|---|
| 0 | Incorrect or not completed within the preregistered task limit |
| 1 | Correct only with assistance, or materially incomplete explanation |
| 2 | Correct and complete independently, with evidence identified |

Record assistance count, errors, missing-data interpretation and safety-boundary
recognition separately. A safety error (for example treating simulation as
permission to act on live infrastructure) is flagged, not hidden in a mean score.
Use neutral task wording and do not coach an answer before scoring. Record
withdrawals, interruptions and unusable timings as such. Keep optional notes
anonymous and paraphrased with permission.

## Analysis/reporting contract

Report paired task-time differences only for valid comparable pairs, score
counts, assistance/error counts, exclusions and denominator. Summarize small
internal samples descriptively. Do not claim statistical superiority, field
readiness, health outcomes, or operator validation. Qualitative comments are
preliminary internal feedback. Preserve blank cells for uncollected values.
