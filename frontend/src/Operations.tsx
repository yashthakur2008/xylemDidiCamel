import { type Segment, type IncidentData, time } from "./api";
export function NetworkView({
  segments,
  selected,
  onSelect,
}: {
  segments: Segment[];
  selected: string;
  onSelect: (s: string) => void;
}) {
  return (
    <div className="network-layout">
      <section className="network-panel">
        <div className="panel-heading">
          <span className="eyebrow">01 / NETWORK SCHEMATIC</span>
          <span className="small">Fictional · not to scale</span>
        </div>
        <svg
          viewBox="0 0 700 390"
          className="network-map"
          role="img"
          aria-label="Fictional network with three risk-ranked segments. Select a segment from the adjacent list."
        >
          <defs>
            <pattern
              id="grid"
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M25 0H0V25"
                fill="none"
                stroke="#dce2d7"
                strokeWidth=".6"
              />
            </pattern>
          </defs>
          <rect width="700" height="390" fill="url(#grid)" />
          <path
            d="M0 300Q170 150 330 310T700 270"
            stroke="#d4e3e4"
            strokeWidth="55"
            fill="none"
          />
          <g stroke="#bac4b8" strokeWidth="2" fill="none">
            <path d="M40 80H650M40 140H650M40 200H650M40 260H650M40 320H650M100 40V355M200 40V355M300 40V355M400 40V355M500 40V355M600 40V355" />
          </g>
          <path
            d="M95 280H205V145H390V80H600M390 145V280H585"
            stroke="#eef1e9"
            strokeWidth="18"
            fill="none"
          />
          <path
            d="M95 280H205V145H390"
            stroke="#a9653e"
            strokeWidth="7"
            fill="none"
          />
          <path
            d="M390 145V80H600"
            stroke="#537d73"
            strokeWidth="7"
            fill="none"
          />
          <path
            d="M390 145V280H585"
            stroke="#c29447"
            strokeWidth="7"
            fill="none"
          />
          {[
            [205, 145, "CA-001"],
            [390, 280, "CA-002"],
            [600, 80, "CA-003"],
          ].map(([x, y, id]) => (
            <g key={id}>
              <circle
                cx={x}
                cy={y}
                r={selected === id ? 16 : 10}
                fill="#f7f6ef"
                stroke="#17333e"
                strokeWidth="3"
              />
              <text x={Number(x) + 22} y={Number(y) - 18}>
                {id}
              </text>
            </g>
          ))}
          <text x="36" y="365" className="map-caption">
            ILLUSTRATIVE TOPOLOGY / NO REAL UTILITY ASSETS
          </text>
        </svg>
        <div className="legend">
          <span>● Higher risk</span>
          <span>● Moderate risk</span>
          <span>● Lower risk</span>
        </div>
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
        <p className="eyebrow">02 / WHY THIS SEGMENT</p>
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
        <p className="eyebrow">03 / PRESSURE RECORD</p>
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
          {segment.latest_reading ? segment.latest_reading.pressure_psi : "—"}{" "}
          <small>psi</small>
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
