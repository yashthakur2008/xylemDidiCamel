"""Strict persisted evaluation envelope. Legacy runs never acquire invented provenance."""
from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, model_validator

from .evaluation_models import ActionName, Review, Trial
from .evaluation_timing import declaration_timing
from .models import Identifier
from .state_schema import Clearance, Event, Job, Notice, PersistentState, Point, Policy, Result, Risk, Stored

Sha256 = Annotated[str, Field(pattern=r'^[0-9a-f]{64}$')]


class Segment(Stored):
    id: Identifier
    name: str
    zone: str
    location: list[float] = Field(min_length=2, max_length=2)
    factors: dict[str, float]
    risk: Risk
    latest_reading: Point | None
    readings: list[Point]
    telemetry_status: Literal['missing', 'stale', 'fresh']


class Network(Stored):
    simulated: Literal[True]
    name: str
    policy: Policy
    segments: list[Segment] = Field(min_length=1)


class Stimulus(Stored):
    network: Network
    event: Event | None


class Snapshot(Stored):
    advisory: Notice | None
    sampling_plan: list[str]
    job: Job | None
    notes: str = Field(max_length=4000)
    # Absent on legacy schema0 snapshots only. Do not fill them in when exporting.
    network: Network | None = None
    network_basis: Literal['current_runtime_display_at_snapshot_not_initial_stimulus'] | None = None
    telemetry: dict[str, list[Point]] | None = None
    status: Literal['detected', 'advisory_active', 'responding', 'sampling', 'reflush_required', 'clearance_pending', 'closed'] | None = None
    samples: list[Result] | None = None
    clear_streak: int | None = Field(default=None, ge=0)
    clearance: Clearance | None = None


class RecordedReady(Stored):
    at: AwareDatetime
    server_elapsed_seconds: float | None = Field(ge=0)
    client_elapsed_ms: float | None = Field(ge=0, le=86400000)
    timing_invalid_reason: Literal['wall_clock_rollback'] | None = None
    reviewer_validated: Literal[False]
    snapshot: Snapshot
    meaning: str


class RecordedReview(Review):
    model_config = Stored.model_config
    at: AwareDatetime
    reviews_ready_at: AwareDatetime


class CreatedLog(Stored):
    at: AwareDatetime
    action: Literal['trial_created']
    actor_role: Literal['operator']
    detail: str


class ActionLog(Stored):
    at: AwareDatetime
    action: ActionName
    actor_role: Literal['operator', 'crew', 'ingest']
    before: Snapshot
    after: Snapshot
    payload: dict


class SourceHash(Stored):
    status: Literal['available', 'unavailable']
    sha256: Sha256 | None
    reason: str | None

    @model_validator(mode='after')
    def availability(self):
        if self.status == 'available':
            if self.sha256 is None or self.reason is not None:
                raise ValueError('Invalid available source hash')
        elif self.sha256 is not None or not self.reason:
            raise ValueError('Invalid unavailable source hash')
        return self


class EvaluationEnvelope(Trial):
    model_config = Stored.model_config
    participant_type: Literal['internal', 'operator', 'engineer']
    id: Identifier
    revision: int = Field(ge=0)
    provenance: Literal['simulated']
    created_at: AwareDatetime
    policy: Policy
    state: PersistentState
    notes: str = Field(max_length=4000)
    presented_at: AwareDatetime | None
    ready: RecordedReady | None
    reviews: list[RecordedReview]
    outcome: Literal['sustained_pressure_loss', 'investigate_transient']
    log: list[CreatedLog | ActionLog] = Field(min_length=1)
    schema_version: Literal[0, 1] = 0
    provenance_status: Literal['legacy_unversioned', 'recorded_at_creation'] = 'legacy_unversioned'
    app_version: str | None = None
    app_version_source: Literal['package_metadata:leaklens-backend', 'unavailable'] = 'unavailable'
    trace_hash: Sha256 | None = None
    source_hashes: dict[str, SourceHash] | None = None
    initial_stimulus: Stimulus | None = None

    @model_validator(mode='after')
    def integrity(self):
        if self.schema_version == 1:
            required = {'provenance_status', 'app_version', 'app_version_source', 'trace_hash', 'source_hashes', 'initial_stimulus'}
            if not required <= self.model_fields_set or self.provenance_status != 'recorded_at_creation':
                raise ValueError('Missing versioned provenance')
            if self.trace_hash is None or not self.source_hashes or self.initial_stimulus is None:
                raise ValueError('Missing creation stimulus or hashes')
            if (self.app_version is None) != (self.app_version_source == 'unavailable'):
                raise ValueError('Invalid app version provenance')
            if self.initial_stimulus.network.policy != self.policy:
                raise ValueError('Stimulus policy mismatch')
            snapshots = [s for entry in self.log if isinstance(entry, ActionLog) for s in (entry.before, entry.after)]
            if self.ready:
                snapshots.append(self.ready.snapshot)
                if 'timing_invalid_reason' not in self.ready.model_fields_set:
                    raise ValueError('Missing timing validity')
            for snapshot in snapshots:
                if not {'network', 'network_basis', 'telemetry', 'status', 'samples', 'clear_streak', 'clearance'} <= snapshot.model_fields_set:
                    raise ValueError('Incomplete versioned snapshot')
                if snapshot.network is None or snapshot.network_basis is None or snapshot.telemetry is None or snapshot.samples is None:
                    raise ValueError('Missing snapshot evidence')
        elif (self.provenance_status != 'legacy_unversioned' or self.app_version is not None
              or self.trace_hash is not None or self.source_hashes is not None or self.initial_stimulus is not None
              or self.app_version_source != 'unavailable'):
            raise ValueError('Legacy run cannot claim creation provenance')
        if not isinstance(self.log[0], CreatedLog) or len(self.log) != self.revision + 1:
            raise ValueError('Invalid log revision')
        if self.log[0].at != self.created_at or any(isinstance(entry, CreatedLog) for entry in self.log[1:]):
            raise ValueError('Invalid creation log')
        if self.ready:
            if self.presented_at is None:
                raise ValueError('Ready without presentation')
            timing = declaration_timing(self.presented_at, self.ready.at, ((entry.action, entry.at) for entry in self.log))
            if any(getattr(self.ready, key) != value for key, value in timing.items()):
                raise ValueError('Inconsistent elapsed timing')
        if any(self.ready is None or review.reviews_ready_at != self.ready.at for review in self.reviews):
            raise ValueError('Review does not reference frozen response')
        return self
