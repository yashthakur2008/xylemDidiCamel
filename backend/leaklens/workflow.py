"""Human-approved demo workflow. Records actions; never operates equipment."""
from datetime import datetime, timezone

from .events import audit, get_event, now_iso, require
from .network import POLICY


def open_event(state, ident):
    event = get_event(state, ident)
    require(event["status"] != "closed", "Event is already closed")
    return event


def edit_advisory(state, ident, body, actor):
    event = open_event(state, ident)
    require(not event["advisory"]["approved"], "Approved advisory cannot be edited")
    event["advisory"]["draft"] = body.draft
    audit(event, "advisory_edited", actor)
    return event


def approve_advisory(state, ident, actor):
    event = open_event(state, ident)
    require(not event["advisory"]["approved"], "Advisory already approved")
    event["advisory"].update(approved=True, approved_at=now_iso(), delivery="simulated_only")
    event["status"] = "advisory_active"
    audit(event, "advisory_approved", actor)
    return event


def approve_job(state, ident, body, actor):
    event = open_event(state, ident)
    require(event["advisory"]["approved"], "Approve advisory before assigning demo response")
    require(not event["job"]["approved"], "Job already approved")
    event["job"].update(approved=True, crew=body.crew, approved_at=now_iso())
    event["status"] = "responding"
    audit(event, "job_approved", actor)
    return event


def record_work(state, ident, body, actor):
    event = open_event(state, ident)
    job = event["job"]
    require(job["approved"], "Operator must approve crew assignment first")
    if body.step == "repair":
        require(not job["repaired"], "Repair already recorded")
        job["repaired"] = True
    else:
        require(job["repaired"], "Record repair before flushing")
        require(not job["flushed"], "Flush already recorded")
        job["flushed"] = True
        event["status"] = "sampling"
    audit(event, body.step + "_recorded", actor)
    return event


def record_sample(state, ident, body, actor):
    event = open_event(state, ident)
    require(event["job"]["approved"] and event["job"]["repaired"] and event["job"]["flushed"],
            "Approved job, repair and current flush required before samples")
    require(not any(s["sample_id"] == body.sample_id for s in event["samples"]), "Duplicate sample ID")
    event["samples"].append({**body.model_dump(), "recorded_at": now_iso()})
    if body.result == "failed":
        event["clear_streak"] = 0
        event["job"]["flushed"] = False
        event["status"] = "reflush_required"
    else:
        event["clear_streak"] += 1
        event["status"] = "clearance_pending" if event["clear_streak"] >= event["policy"]["required_clear_samples"] else "sampling"
    audit(event, "sample_" + body.result, actor)
    return event


def approve_clearance(state, ident, actor):
    event = open_event(state, ident)
    require(event["status"] == "clearance_pending" and event["clear_streak"] >= event["policy"]["required_clear_samples"],
            "Consecutive clear samples required; regulatory review remains external")
    readings = state["readings"].get(event["segment_id"], [])
    latest = readings[-1] if readings else None
    require(latest is not None, "Fresh recovered pressure required")
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(latest["observed_at"])).total_seconds()
    require(-5 <= age <= POLICY["freshness_seconds"] and latest["pressure_psi"] >= POLICY["pressure_threshold_psi"],
            "Pressure must be fresh and recovered before simulated clearance")
    event["status"] = "closed"
    event["clearance"] = {"approved_at": now_iso(), "delivery": "simulated_only", "regulatory_clearance": False}
    audit(event, "clearance_approved", actor)
    return event
