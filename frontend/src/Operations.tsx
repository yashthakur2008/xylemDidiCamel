import { useEffect, useId, useRef, useState } from "react";
import "./network.css";
import { type Segment, type IncidentData, time } from "./api";
// One geometry per branch: every pipe layer, including water, uses it.
const branches = [
  {
    id: "CA-001",
    path: "M76 270 L196 338 L330 260 L246 212 L370 140",
    x: 246,
    y: 212,
    risk: "higher",
    activity: "pressure check",
    pause: 7000,
  },
  {
    id: "CA-002",
    path: "M370 140 L490 210 L418 252 L574 342 L666 288",
    x: 574,
    y: 342,
    risk: "moderate",
    activity: "upstream scan",
    pause: 11000,
  },
  {
    id: "CA-003",
    path: "M370 140 L452 92 L616 186 L704 135",
    x: 616,
    y: 186,
    risk: "lower",
    activity: "sample review",
    pause: 9000,
  },
];

export function NetworkView({
  segments,
  selected,
  onSelect,
}: {
  segments: Segment[];
  selected: string;
  onSelect: (s: string) => void;
}) {
  const prefix = useId();
  const panel = useRef<HTMLElement>(null);
  const [moving, setMoving] = useState(false);
  const [scanningSensor, setScanningSensor] = useState<number | null>(null);
  const [activeSensor, setActiveSensor] = useState<number | null>(null);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () =>
      setMoving(inView && !document.hidden && !preference.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (panel.current) observer.observe(panel.current);
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    setActiveSensor(null);
    setScanningSensor(null);
    if (!moving) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setScanningSensor(index);
      timer = setTimeout(() => {
        setScanningSensor(null);
        setActiveSensor(index);
        const pause = branches[index].pause;
        index = (index + 1) % branches.length;
        timer = setTimeout(() => {
          setActiveSensor(null);
          timer = setTimeout(show, pause);
        }, 2200);
      }, 800);
    };
    timer = setTimeout(show, 3500);
    return () => clearTimeout(timer);
  }, [moving]);

  return (
    <div className="network-layout refined-network">
      <section
        className="network-panel"
        ref={panel}
        data-motion={moving ? "running" : "paused"}
      >
        <div className="panel-heading">
          <span className="eyebrow">NETWORK SCHEMATIC</span>
          <span className="small">Fictional · not to scale</span>
        </div>
        <div className="network-stage">
          <svg
            viewBox="0 0 780 460"
            className="network-map"
            role="img"
            aria-label="Fictional network with three risk-ranked segments. Select a segment from the adjacent list."
          >
            <defs>
              {branches.map((branch) => (
                <path
                  key={branch.id}
                  id={`${prefix}-${branch.id}`}
                  d={branch.path}
                />
              ))}
            </defs>
            <path
              className="network-ground"
              d="M40 273 L364 84 L746 304 L422 450 Z"
            />
            <g className="network-grid" aria-hidden="true">
              <path d="M104 310 L428 122 M168 347 L492 159 M232 384 L556 196 M296 421 L620 233 M105 235 L487 455 M169 198 L551 418 M234 160 L616 380 M299 122 L681 342" />
            </g>
            <g className="pipe-layers" aria-hidden="true">
              {branches.map((branch) => (
                <use
                  key={branch.id}
                  href={`#${prefix}-${branch.id}`}
                  className="pipe-shadow"
                />
              ))}
              {branches.map((branch) => (
                <use
                  key={branch.id}
                  href={`#${prefix}-${branch.id}`}
                  className="pipe-outline"
                />
              ))}
              {branches.map((branch) => (
                <use
                  key={branch.id}
                  href={`#${prefix}-${branch.id}`}
                  className="pipe-body"
                />
              ))}
              {branches.map((branch) => (
                <use
                  key={branch.id}
                  href={`#${prefix}-${branch.id}`}
                  className="pipe-highlight"
                />
              ))}
              {branches.map((branch) => (
                <use
                  key={branch.id}
                  href={`#${prefix}-${branch.id}`}
                  className="pipe-flow"
                />
              ))}
            </g>
            <g className="network-junction" aria-hidden="true">
              <ellipse cx="370" cy="140" rx="17" ry="10" />
              <ellipse cx="370" cy="136" rx="17" ry="10" />
            </g>
            {branches.map((branch, index) => (
              <g
                key={branch.id}
                className={`network-sensor ${branch.risk}`}
                data-segment={branch.id}
                data-selected={selected === branch.id}
                data-scanning={moving && scanningSensor === index}
              >
                <ellipse
                  className="sensor-selection"
                  cx={branch.x}
                  cy={branch.y + 1}
                  rx="27"
                  ry="16"
                />
                <path
                  className="sensor-stem"
                  d={`M${branch.x} ${branch.y} v-25`}
                />
                <circle
                  className="sensor-face"
                  cx={branch.x}
                  cy={branch.y - 28}
                  r="10"
                />
                <circle
                  className="sensor-dot"
                  cx={branch.x}
                  cy={branch.y - 28}
                  r="3"
                />
                <text x={branch.x + 18} y={branch.y - 27}>
                  {branch.id}
                </text>
              </g>
            ))}
          </svg>
          {moving && activeSensor !== null && (
            <div
              className="sensor-popup"
              aria-hidden="true"
              data-segment={branches[activeSensor].id}
              style={{
                left: `${(branches[activeSensor].x / 780) * 100}%`,
                top: `${((branches[activeSensor].y - 62) / 460) * 100}%`,
              }}
            >
              Simulated · {branches[activeSensor].activity}
            </div>
          )}
        </div>
        <div className="legend">
          <span>● Higher risk</span>
          <span>● Moderate risk</span>
          <span>● Lower risk</span>
        </div>
        <p className="network-simulation-note">
          Simulated flow and sensor activity, not live telemetry.
        </p>
      </section>
      <section className="segment-list">
        <p className="eyebrow">REPAIR PRIORITY / EXPLAINABLE RISK</p>
        {segments.map((s, i) => (
          <button
            key={s.id}
            className={"segment " + (selected === s.id ? "selected" : "")}
            onClick={() => onSelect(s.id)}
            aria-pressed={selected === s.id}
          >
            <span className="rank">0{i + 1}</span>
            <span>
              <strong>{s.name}</strong>
              <small>
                {s.id} / {s.zone} zone
              </small>
              <small>
                {s.telemetry_status === "fresh"
                  ? `${s.latest_reading?.pressure_psi} psi`
                  : `${s.telemetry_status} telemetry`}
              </small>
            </span>
            <span className="score">
              {s.risk.score}
              <small>/100</small>
            </span>
          </button>
        ))}
        <p className="small muted">
          Relative prioritization, not a contamination probability.
        </p>
      </section>
    </div>
  );
}
export function SegmentDetail({
  segment,
  event,
}: {
  segment: Segment;
  event?: IncidentData | null;
}) {
  const readings = segment.readings,
    max = Math.max(60, ...readings.map((r) => r.pressure_psi)),
    first = readings.length ? Date.parse(readings[0].observed_at) : 0,
    span = readings.length
      ? Math.max(
          1,
          Date.parse(readings[readings.length - 1].observed_at) - first,
        )
      : 1,
    x = (at: string) => 40 + (480 * (Date.parse(at) - first)) / span,
    points = readings
      .map((r) => `${x(r.observed_at)},${150 - (r.pressure_psi / max) * 120}`)
      .join(" ");
  return (
    <div className="detail-grid">
      <section className="detail-panel">
        <p className="eyebrow">WHY THIS SEGMENT</p>
        <h2>{segment.name}</h2>
        <div className="factor-head">
          <span>Risk contribution</span>
          <span>{segment.risk.score} / 100</span>
        </div>
        {segment.risk.factors.map((f) => (
          <div className="factor" key={f.name}>
            <div>
              <span>{f.name.replaceAll("_", " ")}</span>
              <span>
                {f.value} × {f.weight * 100}% ={" "}
                <strong>{f.contribution}</strong>
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${f.contribution * 2.5}%` }} />
            </div>
          </div>
        ))}
        <p className="small muted">
          Transparent weighted rules. Inputs are fictional and uncalibrated.
        </p>
      </section>
      <section className="detail-panel">
        <p className="eyebrow">PRESSURE RECORD</p>
        <p className="small">
          Alert rule: below 20 psi for at least 5 seconds of consecutive
          readings, no gap above 30 seconds. Demonstration policy only.
        </p>
        {event && (
          <p className="small">
            Drop began {time(event.low_pressure_since)} · Detected{" "}
            {time(event.detected_at)}. Detection time is replay processing time,
            not physical sensor latency.
          </p>
        )}
        <div className="pressure-number">
          {segment.latest_reading
            ? segment.latest_reading.pressure_psi
            : "No reading"}{" "}
          {segment.latest_reading && <small>psi</small>}
          <span
            className={
              "badge " + (segment.telemetry_status !== "fresh" ? "warning" : "")
            }
          >
            {segment.telemetry_status}
          </span>
        </div>
        {readings.length ? (
          <>
            <svg
              className="pressure-chart"
              viewBox="0 0 560 180"
              role="img"
              aria-label={`Pressure record for ${segment.id}. Latest ${segment.latest_reading?.pressure_psi} psi. ${segment.telemetry_status}.`}
            >
              <path d="M40 20V150H525" fill="none" stroke="#b2bfb8" />
              <path
                d={`M40 ${150 - (20 / max) * 120}H525`}
                stroke="#a65a3f"
                strokeDasharray="5 5"
              />
              <text x="45" y={145 - (20 / max) * 120}>
                20 psi reference
              </text>
              <polyline
                points={points}
                stroke="#246982"
                strokeWidth="3"
                fill="none"
              />
              {readings.map((r) => (
                <circle
                  key={r.observed_at}
                  cx={x(r.observed_at)}
                  cy={150 - (r.pressure_psi / max) * 120}
                  r="4"
                  fill="#246982"
                />
              ))}
              <text x="40" y="173">
                {time(readings[0].observed_at)}
              </text>
              <text x="440" y="173">
                {time(readings[readings.length - 1].observed_at)}
              </text>
            </svg>
            <p className="small muted">
              Time-scaled trace · Last observed{" "}
              {new Date(segment.latest_reading!.observed_at).toLocaleString()}.{" "}
              {readings.length} stored observations.
            </p>
          </>
        ) : (
          <p className="empty">
            No readings yet. Start a simulated main break to see the pressure
            record. Missing telemetry does not mean normal pressure.
          </p>
        )}
      </section>
    </div>
  );
}
