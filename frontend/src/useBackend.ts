import { useCallback, useEffect, useRef, useState } from "react";
import {
  request,
  type Network,
  type IncidentData,
  type Tokens,
  type Act,
} from "./api";
export function useBackend(enabled: boolean, tokens: Tokens) {
  const [network, setNetwork] = useState<Network | null>(null),
    [events, setEvents] = useState<IncidentData[]>([]),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [message, setMessage] = useState(""),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    generation = useRef(0);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const gen = ++generation.current;
    try {
      const [n, e] = await Promise.all([
        request<Network>("/network", "", undefined, undefined, signal),
        request<{ events: IncidentData[] }>(
          "/events",
          "",
          undefined,
          undefined,
          signal,
        ),
      ]);
      if (gen === generation.current) {
        setNetwork(n);
        setEvents(e.events);
        setAvailable(true);
        setConnectionError("");
      }
    } catch (e) {
      if (signal?.aborted || gen !== generation.current) return;
      setAvailable(false);
      setConnectionError(
        "Connection unavailable. Last-known data may be stale. " +
          (e instanceof Error ? e.message : ""),
      );
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const tick = () => {
      if (!document.hidden) void refresh(controller.signal);
    };
    const id = setInterval(tick, 5000);
    const offline = () => {
      generation.current++;
      setAvailable(false);
      setConnectionError(
        "Offline. Response actions are unavailable. No actions are queued.",
      );
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      controller.abort();
      clearInterval(id);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, refresh]);
  const act: Act = async (path, role, body, method = "POST") => {
    if (lock.current) return false;
    if (!available || !navigator.onLine) {
      setError("Backend unavailable. Reconnect before submitting.");
      return false;
    }
    if (!tokens[role]) {
      setError(`Enter the ${role} token under Demo access first.`);
      return false;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(path, tokens[role], body, method);
      await refresh();
      setMessage("Recorded by the backend. Simulation only.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      await refresh();
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return {
    network,
    events,
    error: connectionError || error,
    message,
    available,
    busy,
    refresh,
    act,
  };
}
