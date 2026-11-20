import { useState } from "react";
export function PipeDiagram({ low }: { low: boolean }) {
  return (
    <svg
      className="pipe-diagram"
      viewBox="0 0 600 470"
      role="img"
      aria-labelledby="pipe-title pipe-desc"
    >
      <title id="pipe-title">The same crack. A different direction.</title>
      <desc id="pipe-desc">
        Under normal pressure water leaks outward. During pressure loss,
        contaminants outside a damaged pipe may enter. This conceptual diagram
        is not a hydraulic simulation.
      </desc>
      <defs>
        <pattern id="soil" width="17" height="17" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill="#a9b2a5" />
        </pattern>
        <marker
          id="arrow"
          markerWidth="7"
          markerHeight="7"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0L6 3L0 6" fill="none" stroke="#a44d32" />
        </marker>
      </defs>
      <rect x="20" y="60" width="560" height="330" fill="url(#soil)" />
      <text x="35" y="38">
        FIELD NOTE 001 / PRESSURE & INTRUSION
      </text>
      <path d="M40 120H560" stroke="#8c9588" strokeWidth="35" />
      <text x="330" y="105">
        NEARBY SEWER / EXPOSURE
      </text>
      <path d="M40 240H275M310 240H560" stroke="#173b48" strokeWidth="90" />
      <path d="M40 240H275M310 240H560" stroke="#e2eff1" strokeWidth="69" />
      <path
        d="M45 240H240M340 240H555"
        stroke="#4c889f"
        strokeWidth="2"
        strokeDasharray="12 8"
      />
      <path
        d="M273 192L286 213L276 233L300 251L285 274L310 289"
        fill="none"
        stroke="#173b48"
        strokeWidth="3"
      />
      <path
        d={low ? "M290 155V211M292 353V279" : "M290 211V155M292 279V353"}
        stroke="#a44d32"
        strokeWidth="3"
        markerEnd="url(#arrow)"
      />
      <circle cx="280" cy="165" r="4" fill="#a44d32" />
      <circle cx="302" cy="332" r="5" fill="#a44d32" />
      <path d="M327 300L390 345H540" fill="none" stroke="#8c9588" />
      <text x="390" y="370">
        POTENTIAL ENTRY POINT
      </text>
      <text x="35" y="422">
        {low
          ? "POTENTIAL INWARD FLOW / PRESSURE LOSS"
          : "OUTWARD LEAKAGE / NORMAL PRESSURE"}
      </text>
      <text x="35" y="449" className="diagram-note">
        Conceptual schematic · not to scale
      </text>
    </svg>
  );
}
export function Website() {
  const [low, setLow] = useState(true);
  return (
    <main className="website">
      <section className="hero">
        <div>
          <p className="eyebrow">XYLEM STUDENT CHALLENGE / WATER QUALITY</p>
          <h1>
            Clean at the plant.
            <br />
            <em>
              Protected to
              <br />
              the tap.
            </em>
          </h1>
          <p className="intro">
            The last mile of clean water is underground. LeakLens connects
            vulnerable pipes, pressure loss and the people who respond.
          </p>
          <a className="button" href="/operations">
            Open operations <span aria-hidden="true">↗</span>
          </a>
          <a className="text-link" href="/crew">
            Explore the crew app →
          </a>
          <p className="small muted">
            Student prototype. Fictional network. Human decisions.
          </p>
        </div>
        <figure>
          <div className="diagram-switch" aria-label="Pressure comparison">
            <button aria-pressed={!low} onClick={() => setLow(false)}>
              Normal pressure
            </button>
            <button aria-pressed={low} onClick={() => setLow(true)}>
              Pressure loss
            </button>
          </div>
          <PipeDiagram low={low} />
          <figcaption>
            <span>01 / THE MECHANISM</span>
            <strong>
              A leak is an opening.
              <br />
              Pressure changes the risk.
            </strong>
          </figcaption>
        </figure>
      </section>
      <section className="statement">
        <p className="eyebrow">NOT JUST WATER LOST. WATER QUALITY AT RISK.</p>
        <h2>
          One weak point.
          <br />
          Three connected decisions.
        </h2>
        <p>
          Water can leave treatment clean and still encounter contamination in
          distribution. A damaged pipe and a loss of pressure can create a route
          inward. We bring those signals into one response.
        </p>
      </section>
      <section className="three-steps">
        {[
          [
            "01",
            "Find the weak spots",
            "Rank fictional pipe segments using leak evidence, sewer proximity, flooding and pipe age. Every contribution is visible.",
          ],
          [
            "02",
            "Watch the pressure",
            "Identify sustained readings below 20 psi. Missing data is missing data, not a green light.",
          ],
          [
            "03",
            "Close the loop",
            "Review the advisory, assign a crew, record repair and sampling, then approve a simulated all-clear.",
          ],
        ].map(([n, t, d]) => (
          <article key={n}>
            <span className="step-number">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
      <section className="limits">
        <div>
          <p className="eyebrow">BUILT TO EXPLAIN. NOT TO OVERCLAIM.</p>
          <h2>
            People stay
            <br />
            in command.
          </h2>
        </div>
        <div>
          <p>
            LeakLens never operates pumps or valves. Every notice and job needs
            human approval. This demo sends no real customer notifications.
          </p>
          <p>
            The pressure threshold is an operational reference, not proof of
            contamination. Risk scores are uncalibrated. Two clear samples
            demonstrate a workflow, not California regulatory clearance.
          </p>
          <p>
            A future pilot would measure alert time, notice time, detection and
            false-alert rates against a utility’s baseline. No measured impact
            is claimed today.
          </p>
          <a
            href="https://www.epa.gov/region8-waterops/loss-pressure"
            target="_blank"
            rel="noreferrer"
          >
            Reference: EPA Region 8 pressure-loss guidance ↗
          </a>
        </div>
      </section>
      <section className="closing">
        <p className="eyebrow">
          FOLLOW A PRESSURE EVENT FROM SIGNAL TO SIGN-OFF
        </p>
        <h2>See the whole response.</h2>
        <a className="button light" href="/operations">
          Open operations <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
