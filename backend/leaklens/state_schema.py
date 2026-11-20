"""Validate the persisted document, including nested records, without repairing it."""
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

from .models import Identifier
from .network import SEGMENTS


class Stored(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Point(Stored):
    pressure_psi: float = Field(ge=0, le=300)
    observed_at: AwareDatetime


class Factor(Stored):
    name: str
    value: float = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    contribution: float = Field(ge=0, le=100)


class Risk(Stored):
    score: float = Field(ge=0, le=100)
    factors: list[Factor]
    model: str


class Policy(Stored):
    pressure_threshold_psi: float = Field(gt=0)
    minimum_low_duration_seconds: float = Field(gt=0)
    maximum_reading_gap_seconds: float = Field(gt=0)
    freshness_seconds: float = Field(gt=0)
    required_clear_samples: int = Field(ge=1)
    warning: str


class Notice(Stored):
    draft: str = Field(min_length=10, max_length=4000)
    approved: bool
    approved_at: AwareDatetime | None = None
    delivery: Literal["simulated_only"] | None = None


class Job(Stored):
    approved: bool
    crew: Identifier | None
    repaired: bool
    flushed: bool
    approved_at: AwareDatetime | None = None


class Result(Stored):
    sample_id: Identifier
    result: Literal["clear", "failed"]
    recorded_at: AwareDatetime


class Audit(Stored):
    action: str
    actor_role: Literal["operator", "crew", "ingest"]
    at: AwareDatetime


class Clearance(Stored):
    approved_at: AwareDatetime
    delivery: Literal["simulated_only"]
    regulatory_clearance: Literal[False]


class Event(Stored):
    id: str
    segment_id: Identifier
    zone: str
    simulated: Literal[True]
    status: Literal["detected", "advisory_active", "responding", "sampling", "reflush_required", "clearance_pending", "closed"]
    detected_at: AwareDatetime
    low_pressure_since: AwareDatetime
    risk: Risk
    policy: Policy
    advisory: Notice
    sampling_plan: list[str]
    job: Job
    samples: list[Result]
    clear_streak: int = Field(ge=0)
    audit: list[Audit]
    clearance: Clearance | None = None


class PersistentState(Stored):
    schema_version: Literal[1]
    readings: dict[str, list[Point]]
    low_since: dict[str, AwareDatetime]
    events: dict[str, Event]

    @model_validator(mode="after")
    def references(self):
        known = {s["id"] for s in SEGMENTS}
        if not (set(self.readings) | set(self.low_since)) <= known:
            raise ValueError("Unknown persisted segment")
        for history in self.readings.values():
            if any(a.observed_at >= b.observed_at for a, b in zip(history, history[1:])):
                raise ValueError("Persisted readings are out of order")
        active = set()
        for ident, event in self.events.items():
            if ident != event.id or event.segment_id not in known:
                raise ValueError("Invalid event reference")
            if event.status != "closed":
                if event.segment_id in active:
                    raise ValueError("Multiple active events for one segment")
                active.add(event.segment_id)
            elif event.clearance is None:
                raise ValueError("Closed event is missing clearance")
            if len({s.sample_id for s in event.samples}) != len(event.samples) or event.clear_streak > len(event.samples):
                raise ValueError("Invalid persisted sample history")
        return self
