import { useEffect, useState } from "react";
import { type IncidentData, type Act } from "./api";
export function SamplingPlan({
  event,
  act,
  disabled,
  onDirty,
}: {
  event: IncidentData;
  act: Act;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const server = event.sampling_plan.join("\n");
  const [text, setText] = useState(server),
    [base, setBase] = useState(server);
  const dirty = text !== base,
    conflict = server !== base;
  useEffect(() => {
    if (!dirty) {
      setText(server);
      setBase(server);
    }
  }, [server, dirty]);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const locked = event.job.approved || event.status === "closed";
  return (
    <section className="workflow-step">
      <p className="eyebrow">SAMPLING PLAN / OPERATOR REVIEW</p>
      <label htmlFor="sampling-plan-draft">Sampling plan draft</label>
      <textarea
        id="sampling-plan-draft"
        rows={3}
        value={text}
        readOnly={locked}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="small muted">
        One instruction per line. Confirm locations and requirements with the
        utility and regulator. This demo is not an approved sampling procedure.
      </p>
      {(conflict || (locked && dirty)) && (
        <div className="notice warning">
          <p>
            The server plan changed or was dispatched. Your local text is
            preserved.
          </p>
          <p>Current plan: {server}</p>
          <button
            onClick={() => {
              setText(server);
              setBase(server);
            }}
          >
            Discard local plan and reload
          </button>
        </div>
      )}
      <button
        disabled={
          disabled || locked || conflict || !dirty || text.trim().length < 10
        }
        onClick={async () => {
          const submittedText = text;
          const plan = text
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
          if (
            await act(
              `/events/${event.id}/sampling-plan`,
              "operator",
              { plan, expected_plan: base.split("\n") },
              "PATCH",
            )
          ) {
            setText((current) =>
              current === submittedText ? plan.join("\n") : current,
            );
            setBase(plan.join("\n"));
          }
        }}
      >
        Save sampling plan
      </button>
      {locked && <p className="small">Plan locked after crew dispatch.</p>}
    </section>
  );
}
