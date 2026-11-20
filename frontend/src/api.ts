export type Role = "operator" | "crew" | "ingest";
export type Tokens = Record<Role, string>;
export type Reading = { pressure_psi: number; observed_at: string };
export type Risk = {
  score: number;
  factors: {
    name: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
  model: string;
};
export type Segment = {
  id: string;
  name: string;
  zone: string;
  risk: Risk;
  readings: Reading[];
  latest_reading: Reading | null;
  telemetry_status: string;
};
export type IncidentData = {
  id: string;
  segment_id: string;
  zone: string;
  status: string;
  detected_at: string;
  advisory: { draft: string; approved: boolean };
  job: {
    approved: boolean;
    crew: string | null;
    repaired: boolean;
    flushed: boolean;
  };
  sampling_plan: string[];
  samples: { sample_id: string; result: string; recorded_at: string }[];
  clear_streak: number;
  policy: { required_clear_samples: number };
  audit: { action: string; actor_role: string; at: string }[];
};
export type Network = { segments: Segment[]; name: string };
export async function request<T>(
  path: string,
  token = "",
  body?: unknown,
  method?: string,
  signal?: AbortSignal,
): Promise<T> {
  const timeout = AbortSignal.timeout(10000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const verb = method || (body === undefined ? "GET" : "POST");
  try {
    const response = await fetch("/api/v1" + path, {
      method: verb,
      signal: combined,
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        `${response.status}: ${typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((x: { msg: string }) => x.msg).join("; ") : "Request failed"}`,
      );
    return data;
  } catch (error) {
    if (timeout.aborted)
      throw new Error(
        verb === "GET"
          ? "Read timed out. Retry refresh when the connection recovers."
          : "Request timed out. The action may have been recorded. Inspect the refreshed record before retrying; nothing was automatically resubmitted.",
      );
    throw error;
  }
}
export const human = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export const time = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
export type Act = (
  path: string,
  role: Role,
  body?: unknown,
  method?: string,
) => Promise<boolean>;
