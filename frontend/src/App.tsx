import { useEffect, useState, type MouseEvent } from "react";
import { AppChrome } from "./AppChrome";
import { isDesktop } from "./desktop";
import { Evaluation } from "./Evaluation";
import { Website } from "./Website";
import { NetworkView, SegmentDetail } from "./Operations";
import { Incident } from "./Incident";
import { useBackend } from "./useBackend";
import { type Tokens, type Role, human } from "./api";
export default function App() {
  const [intro, setIntro] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [path, setPath] = useState(location.pathname),
    [tokens, setTokens] = useState<Tokens>({
      operator: "",
      crew: "",
      ingest: "",
    }),
    [selected, setSelected] = useState("CA-001"),
    [eventId, setEventId] = useState(""),
    [reset, setReset] = useState(""),
    [evaluationDirty, setEvaluationDirty] = useState(false);
  const workspace = path === "/operations" || path === "/crew",
    crewMode = path === "/crew",
    api = useBackend(workspace, tokens),
    disabled = api.busy || !api.available;
  const segment = api.network?.segments.find((s) => s.id === selected),
    visibleEvents = api.events.filter((e) =>
      crewMode ? e.job.approved : e.segment_id === selected,
    ),
    event =
      visibleEvents.find((e) => e.id === eventId) ||
      visibleEvents.find((e) => e.status !== "closed") ||
      visibleEvents.at(-1);
  useEffect(() => {
    if (isDesktop)
      window
        .leaklensDesktop!.credentials()
        .then(setTokens)
        .catch(() => {
          console.error("Desktop access unavailable. Restart Confluence.");
        });
  }, []);
  useEffect(() => {
    const onPop = () => {
      if (
        evaluationDirty &&
        location.pathname !== path &&
        !window.confirm(
          "Discard unsaved trial edits? Saved trial records are kept.",
        )
      ) {
        history.pushState({}, "", path);
        return;
      }
      setPath(location.pathname);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [path, evaluationDirty]);
  useEffect(() => {
    if (isDesktop)
      void window.leaklensDesktop!.setDirty(evaluationDirty).catch(() => {
        console.error(
          "Desktop edit protection unavailable. Save work before closing.",
        );
      });
  }, [evaluationDirty]);
  useEffect(() => {
    if (!evaluationDirty || isDesktop) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [evaluationDirty]);
  function navigate(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest("a");
    if (
      !a ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      a.target ||
      a.origin !== location.origin ||
      a.hash
    )
      return;
    e.preventDefault();
    if (
      evaluationDirty &&
      a.pathname !== path &&
      !window.confirm(
        "Discard unsaved trial edits? Saved trial records are kept.",
      )
    )
      return;
    history.pushState({}, "", a.pathname);
    setPath(a.pathname);
    window.scrollTo(0, 0);
  }
  return (
    <div
      onClick={navigate}
      className={path === "/" ? undefined : "app-shell"}
      data-desktop={isDesktop ? "true" : undefined}
      data-intro={intro ? "playing" : "complete"}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {path !== "/" ? (
        <AppChrome path={path} intro={intro} setIntro={setIntro} />
      ) : (
        <header className="site-header">
          <a className="brand" href={isDesktop ? "/operations" : "/"}>
            <span className="brand-icon">◉</span> Confluence
            <span className="brand-tag">DISTRIBUTION INTELLIGENCE</span>
          </a>
          <nav aria-label="Main navigation">
            {!isDesktop && (
              <a href="/" aria-current={path === "/" ? "page" : undefined}>
                Overview
              </a>
            )}
            <a href="/operations">Operations</a>
            <a href="/evaluation">Test mode</a>
            <a href="/crew" aria-current={crewMode ? "page" : undefined}>
              {isDesktop ? "Crew app" : "Crew app ↗"}
            </a>
          </nav>
        </header>
      )}
      <div id="main" tabIndex={-1} inert={path !== "/" && intro}>
        {path === "/" ? (
          <Website />
        ) : path === "/evaluation" ? (
          <Evaluation tokens={tokens} onDirtyChange={setEvaluationDirty} />
        ) : workspace ? (
          <main className={"workspace " + (crewMode ? "crew-workspace" : "")}>
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">
                  {crewMode
                    ? "CONFLUENCE / FIELD OPERATIONS"
                    : "CALIFORNIA-STYLE NETWORK / OPERATIONS"}
                </p>
                <h1>{crewMode ? "Field notebook" : "Network intelligence"}</h1>
                <p className="muted">
                  {crewMode
                    ? "Record field work and sampling for approved incidents."
                    : "Review pressure evidence and coordinate an operator-approved response."}
                </p>
              </div>
              <span className="badge">SIMULATION ONLY</span>
            </div>
            <div className="connection-strip">
              <span>
                {api.available
                  ? "● Backend connected"
                  : "○ Backend unavailable / connecting"}
              </span>
              <span>Fictional data · no real notices</span>
              <button onClick={() => void api.refresh()}>Refresh data</button>
            </div>
            {isDesktop ? (
              <p className="small">Offline desktop · local data</p>
            ) : (
              <details className="access">
                <summary>Demo access</summary>
                <p className="small">
                  Private local demo credentials. Tokens stay in memory and
                  clear on reload. Changing views does not grant permissions.
                  Never use real utility data.
                </p>
                <div className="token-fields">
                  {(["operator", "crew", "ingest"] as Role[]).map((role) => (
                    <label key={role}>
                      {human(role)} token
                      <input
                        type="password"
                        autoComplete="off"
                        value={tokens[role]}
                        onChange={(e) =>
                          setTokens({ ...tokens, [role]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setTokens({ operator: "", crew: "", ingest: "" })
                  }
                >
                  Clear credentials
                </button>
              </details>
            )}
            {api.error && (
              <div className="notice error" role="alert">
                {api.error}
              </div>
            )}
            {api.message && (
              <div className="notice" role="status">
                {api.message}
              </div>
            )}
            {!crewMode && api.network && (
              <>
                <section className="demo-controls">
                  <div>
                    <p className="eyebrow">Scenario controls · {selected}</p>
                    <p className="small muted">
                      Generate a sustained drop, then submit a 45 psi recovery
                      reading. These are fictional observations, not equipment
                      controls.
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() =>
                        void api.act("/demo/scenario", "operator", {
                          segment_id: selected,
                        })
                      }
                    >
                      Simulate main break
                    </button>
                    <button
                      disabled={disabled}
                      onClick={() =>
                        void api.act("/readings", "ingest", {
                          segment_id: selected,
                          pressure_psi: 45,
                          observed_at: new Date().toISOString(),
                        })
                      }
                    >
                      Submit recovery reading
                    </button>
                  </div>
                </section>
                <NetworkView
                  segments={api.network.segments}
                  selected={selected}
                  onSelect={(s) => {
                    setSelected(s);
                    setEventId("");
                  }}
                />
                {segment && <SegmentDetail segment={segment} event={event} />}

              </>
            )}
            {!api.network && (
              <p className="empty">
                {api.available
                  ? "Loading network…"
                  : "Connect the local backend to load network data. Read-only inspection does not require tokens."}
              </p>
            )}
            <section className="event-board">
              <div className="section-heading">
                <h2>{crewMode ? "Assigned jobs" : "Incident board"}</h2>
                <span className="small">
                  {visibleEvents.length} records{" "}
                  {crewMode ? "" : "for " + selected}
                </span>
              </div>
              {visibleEvents.length > 1 && (
                <label>
                  Incident record
                  <select
                    value={event?.id}
                    onChange={(e) => setEventId(e.target.value)}
                  >
                    {visibleEvents.map((e) => (
                      <option value={e.id} key={e.id}>
                        {e.segment_id} · {human(e.status)} ·{" "}
                        {new Date(e.detected_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {event ? (
                <Incident
                  key={event.id}
                  event={event}
                  crewMode={crewMode}
                  act={api.act}
                  disabled={disabled}
                />
              ) : (
                <div className="empty">
                  <h3>
                    {crewMode
                      ? "No approved jobs yet."
                      : "No incident recorded."}
                  </h3>
                  <p>
                    {crewMode
                      ? "An operator must approve the advisory and crew assignment first."
                      : "Start a simulated main break to follow an incident from detection to sign-off."}
                  </p>
                  {crewMode && <a href="/operations">Go to operations →</a>}
                </div>
              )}
            </section>
            {!crewMode && (
              <details className="reset-panel">
                <summary>Reset demonstration</summary>
                <p>
                  This permanently deletes all demo incidents, readings, samples
                  and audit history. It cannot be undone.
                </p>
                <label>
                  Type RESET DEMO
                  <input
                    value={reset}
                    onChange={(e) => setReset(e.target.value)}
                  />
                </label>
                <button
                  disabled={disabled || reset !== "RESET DEMO"}
                  onClick={async () => {
                    if (
                      await api.act("/demo/reset", "operator", {
                        confirm: reset,
                      })
                    ) {
                      setReset("");
                      setEventId("");
                    }
                  }}
                >
                  Delete demo data
                </button>
              </details>
            )}
            {crewMode && !isDesktop && (
              <details className="install-help">
                <summary>Install the crew app</summary>
                <p>
                  In a supported desktop browser, choose Install app from the
                  address bar or menu. On iPhone, open in Safari and choose
                  Share → Add to Home Screen. Installation requires HTTPS or
                  localhost.
                </p>
                <p>
                  The shell can open offline, but live jobs and response actions
                  need the backend. Nothing is submitted or queued offline. Your
                  phone cannot reach this laptop through the phone’s localhost.
                </p>
              </details>
            )}
          </main>
        ) : (
          <main className="workspace">
            <h1>Page not found</h1>
            <a href="/">Return to overview</a>
          </main>
        )}
      </div>
      <footer>
        <strong>Confluence</strong>
        <span>Water Quality / Student prototype</span>
        <span>Simulation only. No equipment controls.</span>
      </footer>
    </div>
  );
}
