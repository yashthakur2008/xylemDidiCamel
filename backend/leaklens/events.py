"""Demo domain transitions. No messaging, pumps, valves or control-system writes."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from .network import POLICY, SEGMENTS, risk


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def require(condition, message, status=409):
    if not condition:
        raise HTTPException(status, message)


def get_event(state, ident):
    require(ident in state["events"], "Event not found", 404)
    return state["events"][ident]


def audit(event, action, actor):
    event["audit"].append({"action": action, "actor_role": actor, "at": now_iso()})


def ingest(state, reading, actor):
    segment = next((s for s in SEGMENTS if s["id"] == reading.segment_id), None)
    require(segment is not None, "Segment not found", 404)
    observed = reading.observed_at.astimezone(timezone.utc)
    age = (datetime.now(timezone.utc) - observed).total_seconds()
    require(-5 <= age <= POLICY["freshness_seconds"], "Reading must be recent and not future-dated", 422)
    history = state["readings"].setdefault(segment["id"], [])
    previous = datetime.fromisoformat(history[-1]["observed_at"]) if history else None
    require(previous is None or observed > previous, "Duplicate or out-of-order reading")
    point = {"pressure_psi": reading.pressure_psi, "observed_at": observed.isoformat()}
    history.append(point)
    del history[:-120]  # bounded demo pressure trace
    ident = segment["id"]
    if reading.pressure_psi >= POLICY["pressure_threshold_psi"]:
        state["low_since"].pop(ident, None)
    else:
        if previous is None or (observed - previous).total_seconds() > POLICY["maximum_reading_gap_seconds"]:
            state["low_since"].pop(ident, None)
        state["low_since"].setdefault(ident, observed.isoformat())
    active = next((e for e in state["events"].values() if e["segment_id"] == ident and e["status"] != "closed"), None)
    since = state["low_since"].get(ident)
    if not active and since and (observed - datetime.fromisoformat(since)).total_seconds() >= POLICY["minimum_low_duration_seconds"]:
        active = {"id": str(uuid4()), "segment_id": ident, "zone": segment["zone"],
                  "simulated": True, "status": "detected", "detected_at": now_iso(),
                  "low_pressure_since": since, "risk": risk(segment), "policy": dict(POLICY),
                  "advisory": {"draft": f"SIMULATION ONLY: Proposed boil-water advisory for fictional {segment['zone']} zone. Operator and regulatory review required. Do not distribute.", "approved": False},
                  "sampling_plan": [f"Confirm sampling locations upstream and downstream of {ident} with the responsible utility/regulator."],
                  "job": {"approved": False, "crew": None, "repaired": False, "flushed": False},
                  "samples": [], "clear_streak": 0, "audit": []}
        audit(active, "sustained_pressure_loss_detected", actor)
        state["events"][active["id"]] = active
    return {"reading": point, "event": active, "simulated": True}
