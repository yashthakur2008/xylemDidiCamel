"""Fictional network and transparent, uncalibrated demo risk model."""
from datetime import datetime, timezone

WEIGHTS = {"leak_evidence": 0.4, "sewer_proximity": 0.3, "flood_exposure": 0.2, "pipe_age": 0.1}
SEGMENTS = [
    {"id": "CA-001", "name": "Orchard crossing", "zone": "North", "location": [38.57, -121.48],
     "factors": dict(zip(WEIGHTS, [90, 90, 80, 70]))},
    {"id": "CA-002", "name": "River bend", "zone": "West", "location": [38.565, -121.49],
     "factors": dict(zip(WEIGHTS, [65, 50, 95, 60]))},
    {"id": "CA-003", "name": "Hill reservoir link", "zone": "East", "location": [38.575, -121.47],
     "factors": dict(zip(WEIGHTS, [20, 10, 5, 30]))},
]
POLICY = {
    "pressure_threshold_psi": 20, "minimum_low_duration_seconds": 5,
    "maximum_reading_gap_seconds": 30, "freshness_seconds": 120,
    "required_clear_samples": 2,
    "warning": "Demonstration policy only. Not California regulatory clearance or proof of contamination.",
}


def risk(segment):
    factors = [{"name": k, "value": segment["factors"][k], "weight": w,
                "contribution": round(segment["factors"][k] * w, 2)} for k, w in WEIGHTS.items()]
    return {"score": round(sum(f["contribution"] for f in factors), 1), "factors": factors,
            "model": "Uncalibrated weighted demo rules; inputs normalized 0–100"}


def network_view(state):
    result = []
    now = datetime.now(timezone.utc)
    for segment in SEGMENTS:
        readings = state["readings"].get(segment["id"], [])
        latest = readings[-1] if readings else None
        status = "missing" if not latest else (
            "stale" if (now - datetime.fromisoformat(latest["observed_at"])).total_seconds() > POLICY["freshness_seconds"]
            else "fresh")
        result.append({**segment, "risk": risk(segment), "latest_reading": latest,
                       "readings": readings, "telemetry_status": status})
    return {"simulated": True, "name": "California-style fictional network", "policy": POLICY,
            "segments": sorted(result, key=lambda s: s["risk"]["score"], reverse=True)}
