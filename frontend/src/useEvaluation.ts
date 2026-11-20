import { useCallback, useEffect, useRef, useState } from "react";
import {
  request,
  type Act,
  type IncidentData,
  type Network,
  type Role,
  type Tokens,
} from "./api";
export type Trial = {
  id: string;
  created_at: string;
  revision: number;
  scenario: string;
  participant_code: string;
  participant_type: string;
  rubric: string;
  provenance: string;
  outcome: string;
  notes: string;
  presented_at: string | null;
  network: Network;
  event: IncidentData | null;
  ready: null | {
    at: string;
    server_elapsed_seconds: number | null;
    client_elapsed_ms: number | null;
    snapshot: unknown;
    reviewer_validated: boolean;
  };
  reviews: {
    reviewer_code: string;
    verdict: string;
    missed_items: number;
    corrections: number;
    notes: string;
    at: string;
  }[];
  log: { at: string; action: string; actor_role?: string }[];
};
export type TrialSummary = {
  id: string;
  scenario: string;
  participant_code: string;
  created_at: string;
};
const actions: Record<string, string> = {
  advisory: "advisory_edit",
  "advisory/approve": "advisory_approve",
  "sampling-plan": "sampling_edit",
  "job/approve": "job_approve",
  work: "work",
  samples: "sample",
  "clearance/approve": "clearance",
};
export function useEvaluation(tokens: Tokens) {
  const [run, setRun] = useState<Trial | null>(null),
    [runs, setRuns] = useState<TrialSummary[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    timer = useRef<number | null>(null);
  const list = useCallback(async () => {
    if (!tokens.operator) return;
    const result = await request<{ runs: TrialSummary[] }>(
      "/evaluations",
      tokens.operator,
    );
    setRuns(result.runs);
  }, [tokens.operator]);
  useEffect(() => {
    void list().catch((e) => setError(String(e)));
  }, [list]);
  async function exclusive(operation: () => Promise<void>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Reconcile uncertain writes. Never resubmit them automatically.
      if (run)
        try {
          setRun(
            await request<Trial>("/evaluations/" + run.id, tokens.operator),
          );
        } catch {
          /* retain current evidence */
        }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function create(
    scenario: string,
    participant_code: string,
    participant_type: string,
    rubric: string,
  ) {
    return exclusive(async () => {
      if (!tokens.operator)
        throw new Error(
          "Enter the operator token in Operations → Demo access.",
        );
      const result = await request<Trial>("/evaluations", tokens.operator, {
        scenario,
        participant_code,
        participant_type,
        rubric,
      });
      timer.current = null;
      setRun(result);
      setRuns((current) => [
        {
          id: result.id,
          scenario: result.scenario,
          participant_code: result.participant_code,
          created_at: result.created_at,
        },
        ...current,
      ]);
    });
  }
  async function load(id: string) {
    return exclusive(async () => {
      timer.current = null;
      setRun(await request<Trial>("/evaluations/" + id, tokens.operator));
    });
  }
  async function action(
    action: string,
    payload: unknown = {},
    role: Role = "operator",
  ) {
    if (!run) return false;
    return exclusive(async () => {
      if (!tokens[role])
        throw new Error(
          `Missing ${role} credential. Configure Demo access in Operations.`,
        );
      if (action === "presented") timer.current = performance.now();
      setRun(
        await request<Trial>(`/evaluations/${run.id}/actions`, tokens[role], {
          action,
          payload,
          expected_revision: run.revision,
        }),
      );
    });
  }
  const act: Act = async (path, role, body) => {
    const suffix = path.split("/").slice(3).join("/");
    const kind = actions[suffix];
    if (!kind) {
      setError("Unsupported evaluation action.");
      return false;
    }
    return action(kind, body || {}, role);
  };
  async function download(format: "json" | "csv") {
    if (!run) return;
    await exclusive(async () => {
      const signal = AbortSignal.timeout(10000);
      const response = await fetch(
        `/api/v1/evaluations/${run.id}/export?format=${format}`,
        {
          signal,
          cache: "no-store",
          headers: { Authorization: "Bearer " + tokens.operator },
        },
      );
      const text = await response.text();
      if (!response.ok) throw new Error("Export failed: " + response.status);
      const url = URL.createObjectURL(
        new Blob(
          [
            format === "json"
              ? JSON.stringify(JSON.parse(text), null, 2)
              : text,
          ],
          { type: format === "json" ? "application/json" : "text/csv" },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `confluence-${run.id}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
  function reset() {
    setRun(null);
    timer.current = null;
    void list().catch((e) => setError(String(e)));
  }
  return {
    run,
    runs,
    busy,
    error,
    create,
    load,
    action,
    act,
    download,
    reset,
    clientElapsed: () =>
      timer.current === null ? null : performance.now() - timer.current,
  };
}
