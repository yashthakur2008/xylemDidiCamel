import { isDesktop } from "./desktop";
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
    generation = useRef(0),
    flight = useRef<Promise<void> | null>(null),
    controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async (force = false): Promise<void> => {
    while (flight.current) {
      await flight.current;
      if (!force) return;
    }
    const gen = ++generation.current,
      abort = new AbortController();
    controller.current = abort;
    const task = (async () => {
      try {
        const [n, e] = await Promise.all([
          request<Network>("/network", "", undefined, undefined, abort.signal),
          request<{ events: IncidentData[] }>(
            "/events",
            "",
            undefined,
            undefined,
            abort.signal,
          ),
        ]);
        if (gen === generation.current) {
          setNetwork(n);
          setEvents(e.events);
          setAvailable(true);
          setConnectionError("");
        }
      } catch (e) {
        if (abort.signal.aborted || gen !== generation.current) return;
        setAvailable(false);
        setConnectionError(
          "Connection unavailable. Last-known data may be stale. " +
            (e instanceof Error ? e.message : ""),
        );
      }
    })();
    flight.current = task;
    await task;
    if (flight.current === task) flight.current = null;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!document.hidden) await refresh(true);
      if (active) timer = setTimeout(poll, 5000);
    };
    void poll();
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    const offline = () => {
      if (isDesktop) return;
      generation.current++;
      controller.current?.abort();
      setAvailable(false);
      setConnectionError(
        "Offline. Response actions are unavailable. No actions are queued.",
      );
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearTimeout(timer);
      generation.current++;
      controller.current?.abort();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);
  const act: Act = async (path, role, body, method = "POST") => {
    if (lock.current) return false;
    if (!available || (!isDesktop && !navigator.onLine)) {
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
      await refresh(true);
      setMessage("Recorded by the backend. Simulation only.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      await refresh(true);
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
