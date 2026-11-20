import { useEffect, useState, useRef } from "react";
import { type Tokens, human, time } from "./api";
import { useEvaluation } from "./useEvaluation";
import { SegmentDetail } from "./Operations";
import { Incident } from "./Incident";
import { TrialReview } from "./TrialReview";
const DEFAULT_RUBRIC =
  "Identify the potentially affected segment and boundary uncertainty. Explain the pressure evidence and what to investigate. Prepare operator-reviewable advisory wording, sampling locations to confirm, and a field handoff. List outstanding clearance requirements.";
export function Evaluation({
  tokens,
  onDirtyChange,
}: {
  tokens: Tokens;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const api = useEvaluation(tokens),
    run = api.run;
  const [participant, setParticipant] = useState(""),
    [type, setType] = useState("internal"),
    [rubric, setRubric] = useState(DEFAULT_RUBRIC),
    [notes, setNotes] = useState<string | null>(null),
    [crew, setCrew] = useState(false),
    [dirty, setDirty] = useState(false);
  const unsaved =
    dirty || Boolean(run && notes !== null && notes !== run.notes);
  useEffect(() => {
    onDirtyChange(unsaved);
    return () => onDirtyChange(false);
  }, [unsaved, onDirtyChange]);
  const attempted = useRef("");
  useEffect(() => {
    if (run && !run.presented_at && !api.busy && attempted.current !== run.id) {
      attempted.current = run.id;
      void api.action("presented");
    }
  }, [run?.id, run?.presented_at, api.busy]);
  const disabled = api.busy || !tokens.operator;
  const segment = run?.network.segments.find((s) => s.id === "CA-001");
  const ready = () =>
    void api.action("ready", { client_elapsed_ms: api.clientElapsed() });
  const newRun = async (scenario: string) => {
    if (await api.create(scenario, participant, type, rubric)) {
      setNotes(null);
      setCrew(false);
      setDirty(false);
    }
  };
  return (
    <main className="workspace evaluation">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">CONFLUENCE / OPERATOR EVALUATION</p>
          <h1>Operator evaluation</h1>
          <p className="muted">
            Run a simulated incident, prepare a response and review the saved
            evidence.
          </p>
        </div>
        <span className="badge">SIMULATED DATA</span>
      </div>
      <p className="notice">
        Evidence pending. Trial records are not proof of faster response.
        Operator review and a comparable baseline are still required. No actual
        sensor or operator results are prefilled.
      </p>
      {!tokens.operator && (
        <p className="notice warning">
          Configure credentials in{" "}
          <a href="/operations">Operations → Demo access</a> before starting.
          Installed desktop credentials load automatically.
        </p>
      )}
      {api.error && (
        <p className="notice error" role="alert">
          {api.error}
        </p>
      )}
      {!run ? (
        <>
          <section className="trial-setup">
            <p className="eyebrow">FREEZE THE METHOD</p>
            <h2>Prepare a repeatable trial</h2>
            <p>
              Runs use separate records. Resetting a test preserves earlier
              trials and your Operations incident data.
            </p>
            <div className="trial-fields">
              <label>
                Participant code
                <input
                  value={participant}
                  pattern={"[A-Za-z0-9_\\-]+"}
                  maxLength={80}
                  onChange={(e) => setParticipant(e.target.value)}
                  placeholder="e.g. INTERNAL-01"
                />
              </label>
              <label>
                Participant type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="internal">
                    Internal teammate usability test
                  </option>
                  <option value="operator">
                    Utility operator (self-reported)
                  </option>
                  <option value="engineer">
                    Water-system engineer (self-reported)
                  </option>
                </select>
              </label>
            </div>
            <label htmlFor="trial-rubric">Reviewable response rubric</label>
            <textarea
              id="trial-rubric"
              value={rubric}
              minLength={20}
              maxLength={3000}
              rows={4}
              onChange={(e) => setRubric(e.target.value)}
            />
            <p className="small muted">
              Have the evaluator define this before starting. Use anonymous
              participant codes, not names or utility/customer details. The
              rubric is frozen for the run.
            </p>
            <div className="actions">
              <button
                className="primary"
                disabled={
                  disabled ||
                  !/^[-A-Za-z0-9_]+$/.test(participant) ||
                  rubric.trim().length < 20
                }
                onClick={() => void newRun("main_break")}
              >
                Run main-break trial
              </button>
              <button
                disabled={
                  disabled ||
                  !/^[-A-Za-z0-9_]+$/.test(participant) ||
                  rubric.trim().length < 20
                }
                onClick={() => void newRun("brief_dip")}
              >
                Run brief-dip trial
              </button>
            </div>
          </section>
          <section className="trial-history">
            <h2>Previous trials</h2>
            <p className="small">
              Resuming keeps the original server clock. Browser-only elapsed
              time is unavailable after a reload. A new trial starts a fresh
              clock.
            </p>
            {api.runs.length ? (
              api.runs.map((r) => (
                <button
                  key={r.id}
                  disabled={disabled}
                  onClick={async () => {
                    setNotes(null);
                    setCrew(false);
                    setDirty(false);
                    await api.load(r.id);
                  }}
                >
                  Resume {r.participant_code} ·{" "}
                  {human(r.scenario).toLowerCase()} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </button>
              ))
            ) : (
              <p className="muted">
                No trials yet. Benchmark results: pending.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="trial-toolbar">
            <span className="small">
              {run.participant_code} · {human(run.participant_type)} · Trial{" "}
              {run.id.slice(0, 8)}
            </span>
            <div className="actions">
              <button
                disabled={
                  disabled ||
                  dirty ||
                  Boolean(notes !== null && notes !== run.notes)
                }
                onClick={() => api.reset()}
              >
                Reset test / new trial
              </button>
              <button
                disabled={disabled}
                onClick={() => void api.download("json")}
              >
                Export JSON
              </button>
              <button
                disabled={disabled}
                onClick={() => void api.download("csv")}
              >
                Export CSV
              </button>
            </div>
          </div>
          {!run.presented_at && (
            <button
              disabled={disabled}
              onClick={() => void api.action("presented")}
            >
              Acknowledge scenario display
            </button>
          )}
          <section className="decision-brief">
            <div>
              <p className="eyebrow">OPERATOR DECISION</p>
              <h2>
                {run.event
                  ? "Sustained pressure loss"
                  : "Investigate transient"}
              </h2>
              <p>
                {run.event
                  ? "CA-001 has sustained readings below the demonstration threshold. Prepare a response for human review. This does not confirm contamination."
                  : "A brief dip is present, but the five-second sustained condition was not met. A transient or questionable sensor reading still deserves investigation."}
              </p>
            </div>
            <div>
              <h3>Potentially affected area</h3>
              <p>
                Orchard crossing · CA-001 · fictional North zone. This is a
                candidate investigation area, not a validated affected-customer
                boundary.
              </p>
              <ul className="small">
                <li>
                  Confirm sensor quality and independent pressure readings.
                </li>
                <li>Check isolation, connectivity and customer reports.</li>
                <li>Confirm sampling locations and regulator requirements.</li>
              </ul>
            </div>
          </section>
          {segment && <SegmentDetail segment={segment} event={run.event} />}
          <section className="trial-response">
            <p className="eyebrow">INVESTIGATE BEFORE ACTING</p>
            <label htmlFor="trial-notes">
              Investigation and remaining uncertainty
            </label>
            <textarea
              id="trial-notes"
              rows={3}
              maxLength={4000}
              value={notes ?? run.notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              disabled={
                disabled ||
                (notes ?? run.notes).trim().length < 10 ||
                (notes ?? run.notes) === run.notes
              }
              onClick={async () => {
                const submitted = notes ?? run.notes;
                if (await api.action("notes", { text: submitted }))
                  setNotes((current) =>
                    current === submitted ? null : current,
                  );
              }}
            >
              Save investigation notes
            </button>
            <details>
              <summary>Frozen reviewability rubric</summary>
              <p>{run.rubric}</p>
            </details>
            <div className="actions">
              <button
                className="primary"
                disabled={
                  disabled ||
                  dirty ||
                  Boolean(notes !== null && notes !== run.notes) ||
                  Boolean(run.ready) ||
                  !run.presented_at
                }
                onClick={ready}
              >
                Mark response ready for review
              </button>
              {run.event && (
                <button
                  disabled={disabled}
                  onClick={() => void api.action("recovery", {}, "ingest")}
                >
                  Submit trial recovery reading
                </button>
              )}
            </div>
            <p className="small muted">
              Only saved work enters the frozen first response snapshot. Unsaved
              edits are excluded. A ready click does not mean the response
              passed review. No benchmark benefit is calculated.
            </p>
            {run.ready && (
              <div className="notice">
                <strong>First response frozen</strong>
                <p>
                  {run.ready.server_elapsed_seconds === null
                    ? "Server timing invalid or unavailable. Do not use this run for a timing comparison."
                    : `${run.ready.server_elapsed_seconds.toFixed(1)} seconds from server acknowledgement of display to participant declaration. Includes time away and network delay.`}{" "}
                  {run.ready.client_elapsed_ms === null
                    ? "Browser timer unavailable for resumed run."
                    : `Browser elapsed: ${(run.ready.client_elapsed_ms / 1000).toFixed(1)} seconds (client reported).`}{" "}
                  Reviewer assessment required.
                </p>
              </div>
            )}
            <TrialReview
              run={run}
              disabled={disabled}
              submit={(payload) => api.action("review", payload)}
            />
          </section>
          {run.event ? (
            <>
              <div className="trial-toolbar">
                <p className="small">
                  Same incident / {run.event.id.slice(0, 8)}. Role actions
                  remain explicitly approved.
                </p>
                <button
                  disabled={disabled || dirty}
                  onClick={() => setCrew(!crew)}
                >
                  {crew
                    ? "Return to operator review"
                    : "Open trial crew notebook"}
                </button>
              </div>
              <Incident
                key={run.event.id}
                event={run.event}
                crewMode={crew}
                act={api.act}
                disabled={disabled || !run.presented_at}
                onDirtyChange={setDirty}
              />
            </>
          ) : (
            <div className="empty">
              <h3>No sustained incident created</h3>
              <p>
                No advisory or crew assignment was generated. Record your
                investigation and what additional evidence is needed. A return
                above threshold does not prove the water is safe.
              </p>
            </div>
          )}
          <section className="trial-log">
            <h2>Test event log</h2>
            <p className="small">
              Alert display acknowledged:{" "}
              {run.presented_at
                ? new Date(run.presented_at).toLocaleString()
                : "Awaiting display acknowledgement"}
              . Before/after saved edits are included in exports. Synthetic
              trace timing is separate from response preparation timing. Exports
              preserve the original stimulus. After an app upgrade, the live
              display may use newer installed rules. Analyze the frozen original
              stimulus rather than treating the current display as the baseline.
            </p>
            <ol className="timeline">
              {run.log.map((entry, i) => (
                <li key={i}>
                  <strong>{human(entry.action)}</strong>
                  <small>
                    {time(entry.at)} · {entry.actor_role || "system"}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
