import { useEffect, useState } from "react";
import { type IncidentData, type Act, human, time } from "./api";
export function Incident({
  event,
  crewMode,
  act,
  disabled,
}: {
  event: IncidentData;
  crewMode: boolean;
  act: Act;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(event.advisory.draft),
    [crew, setCrew] = useState("CREW-01"),
    [sample, setSample] = useState(""),
    [result, setResult] = useState("clear");
  useEffect(() => {
    setDraft(event.advisory.draft);
  }, [event.id, event.advisory.draft]);
  const path = `/events/${event.id}`,
    closed = event.status === "closed";
  return (
    <section className="incident">
      <header className="incident-header">
        <div>
          <p className="eyebrow">RESPONSE RECORD / {event.segment_id}</p>
          <h2>{closed ? "Incident closed" : `${event.zone} zone response`}</h2>
          <p className="small">
            Detected {new Date(event.detected_at).toLocaleString()} · Simulated
            event
          </p>
        </div>
        <span className={"badge " + (closed ? "" : "warning")}>
          {human(event.status)}
        </span>
      </header>
      <div className="response-grid">
        <div>
          {!crewMode ? (
            <>
              <section className="workflow-step">
                <p className="eyebrow">01 / ADVISORY REVIEW</p>
                <label>
                  Advisory draft
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    readOnly={event.advisory.approved || closed}
                    rows={4}
                  />
                </label>
                <div className="actions">
                  <button
                    disabled={
                      disabled ||
                      closed ||
                      event.advisory.approved ||
                      draft === event.advisory.draft
                    }
                    onClick={() =>
                      void act(
                        path + "/advisory",
                        "operator",
                        { draft },
                        "PATCH",
                      )
                    }
                  >
                    Save draft
                  </button>
                  <button
                    className="primary"
                    disabled={
                      disabled ||
                      closed ||
                      event.advisory.approved ||
                      draft !== event.advisory.draft
                    }
                    onClick={() =>
                      void act(path + "/advisory/approve", "operator")
                    }
                  >
                    {event.advisory.approved
                      ? "Advisory approved"
                      : "Approve simulated advisory"}
                  </button>
                </div>
                <p className="small muted">
                  No real messages are sent. Save edits before approval.
                </p>
              </section>
              <section className="workflow-step">
                <p className="eyebrow">02 / CREW DISPATCH</p>
                <label>
                  Crew assignment
                  <input
                    value={event.job.approved ? event.job.crew || "" : crew}
                    onChange={(e) => setCrew(e.target.value)}
                    readOnly={event.job.approved}
                    pattern="[A-Za-z0-9_-]+"
                    maxLength={80}
                  />
                </label>
                <button
                  disabled={
                    disabled ||
                    closed ||
                    !event.advisory.approved ||
                    event.job.approved ||
                    !crew.trim()
                  }
                  onClick={() =>
                    void act(path + "/job/approve", "operator", { crew })
                  }
                >
                  {event.job.approved
                    ? "Crew assignment approved"
                    : "Approve crew assignment"}
                </button>
              </section>
              <section className="workflow-step">
                <p className="eyebrow">04 / OPERATOR SIGN-OFF</p>
                <p>
                  {event.clear_streak} / {event.policy.required_clear_samples}{" "}
                  consecutive clear samples. Fresh recovered pressure is also
                  required.
                </p>
                <button
                  className="primary"
                  disabled={
                    disabled || closed || event.status !== "clearance_pending"
                  }
                  onClick={() =>
                    void act(path + "/clearance/approve", "operator")
                  }
                >
                  Approve simulated all-clear
                </button>
                <p className="small muted">
                  Not regulatory clearance. No real notice is distributed.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="workflow-step">
                <p className="eyebrow">
                  ASSIGNED CREW / {event.job.crew || "AWAITING APPROVAL"}
                </p>
                <p>
                  Fictional {event.zone} zone · segment {event.segment_id}.
                  Record demo actions only. This is not an instruction to
                  operate real equipment.
                </p>
                <div className="task-row">
                  <span>
                    <b>01</b> Repair recorded
                  </span>
                  <button
                    disabled={
                      disabled ||
                      closed ||
                      !event.job.approved ||
                      event.job.repaired
                    }
                    onClick={() =>
                      void act(path + "/work", "crew", { step: "repair" })
                    }
                  >
                    {event.job.repaired ? "Repair complete" : "Record repair"}
                  </button>
                </div>
                <div className="task-row">
                  <span>
                    <b>02</b> Flush recorded
                  </span>
                  <button
                    disabled={
                      disabled ||
                      closed ||
                      !event.job.repaired ||
                      event.job.flushed
                    }
                    onClick={() =>
                      void act(path + "/work", "crew", { step: "flush" })
                    }
                  >
                    {event.job.flushed ? "Flush complete" : "Record flush"}
                  </button>
                </div>
                {event.status === "reflush_required" && (
                  <p className="notice warning">
                    Reflush required. Previous results remain in the record; the
                    consecutive-clear count has reset.
                  </p>
                )}
              </section>
              <section className="workflow-step">
                <p className="eyebrow">03 / SAMPLING NOTEBOOK</p>
                {event.sampling_plan.map((p) => (
                  <p className="small" key={p}>
                    {p}
                  </p>
                ))}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await act(path + "/samples", "crew", {
                        sample_id: sample,
                        result,
                      })
                    )
                      setSample("");
                  }}
                >
                  <label>
                    Sample ID
                    <input
                      required
                      pattern="[A-Za-z0-9_-]+"
                      maxLength={80}
                      value={sample}
                      onChange={(e) => setSample(e.target.value)}
                      placeholder="e.g. NORTH-001"
                    />
                  </label>
                  <label>
                    Sample result
                    <select
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                    >
                      <option value="clear">Clear</option>
                      <option value="failed">Failed</option>
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={disabled || closed || !event.job.flushed}
                  >
                    Record sample
                  </button>
                </form>
                <p className="small muted">
                  Entered demonstration results, not a laboratory connection.
                  Never enter real customer information.
                </p>
              </section>
            </>
          )}
        </div>
        <aside>
          <section className="evidence">
            <p className="eyebrow">SAMPLE EVIDENCE</p>
            <div className="sample-count">
              {event.clear_streak}
              <small>
                {" "}
                / {event.policy.required_clear_samples} consecutive clear
              </small>
            </div>
            {event.samples.length ? (
              event.samples.map((s) => (
                <div className="sample-row" key={s.sample_id}>
                  <span>
                    <strong>{s.sample_id}</strong>
                    <small>{time(s.recorded_at)}</small>
                  </span>
                  <span
                    className={
                      "badge " + (s.result === "failed" ? "warning" : "")
                    }
                  >
                    {human(s.result)}
                  </span>
                </div>
              ))
            ) : (
              <p className="small muted">No samples recorded.</p>
            )}
          </section>
          <section className="evidence">
            <p className="eyebrow">DECISION TRAIL</p>
            <ol className="timeline">
              {event.audit.map((a, i) => (
                <li key={i}>
                  <strong>{human(a.action)}</strong>
                  <small>
                    {time(a.at)} / {a.actor_role}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
