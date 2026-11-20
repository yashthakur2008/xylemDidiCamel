import { useState } from "react";
import { type Trial } from "./useEvaluation";
export function TrialReview({
  run,
  disabled,
  submit,
}: {
  run: Trial;
  disabled: boolean;
  submit: (payload: unknown) => Promise<boolean>;
}) {
  const [code, setCode] = useState(""),
    [verdict, setVerdict] = useState("needs_revision"),
    [missed, setMissed] = useState(""),
    [corrections, setCorrections] = useState(""),
    [notes, setNotes] = useState("");
  if (!run.ready) return null;
  return (
    <details className="trial-review">
      <summary>Score the frozen first response</summary>
      <p className="small">
        The evaluator must judge the snapshot below against the rubric fixed
        before this trial. This records a human assessment, not automatic
        validation or a comparative speedup.
      </p>
      <pre className="snapshot">
        {JSON.stringify(run.ready.snapshot, null, 2)}
      </pre>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await submit({
            reviewer_code: code,
            verdict,
            missed_items: Number(missed),
            corrections: Number(corrections),
            notes,
          });
        }}
      >
        <label>
          Reviewer code
          <input
            required
            pattern={"[A-Za-z0-9_\\-]+"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          First response verdict
          <select value={verdict} onChange={(e) => setVerdict(e.target.value)}>
            <option value="needs_revision">Needs revision</option>
            <option value="reviewable">Reviewable against rubric</option>
          </select>
        </label>
        <div className="trial-fields">
          <label>
            Required items missed
            <input
              required
              type="number"
              min="0"
              max="100"
              value={missed}
              onChange={(e) => setMissed(e.target.value)}
            />
          </label>
          <label>
            Corrections required
            <input
              required
              type="number"
              min="0"
              max="100"
              value={corrections}
              onChange={(e) => setCorrections(e.target.value)}
            />
          </label>
        </div>
        <label>
          Reviewer rationale
          <textarea
            required
            minLength={10}
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button disabled={disabled}>Record reviewer assessment</button>
      </form>
      {run.reviews.map((r, i) => (
        <p key={i}>
          {r.reviewer_code}: {r.verdict.replaceAll("_", " ")} · {r.missed_items}{" "}
          missed · {r.corrections} corrections. {r.notes}
        </p>
      ))}
    </details>
  );
}
