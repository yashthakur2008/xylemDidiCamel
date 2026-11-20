from typing import Literal
from pydantic import Field
from .models import Identifier, Input

ActionName = Literal['presented', 'notes', 'ready', 'review', 'advisory_edit', 'advisory_approve', 'sampling_edit', 'job_approve', 'work', 'sample', 'recovery', 'clearance']

class Trial(Input):
    scenario: Literal['main_break', 'brief_dip']
    participant_code: Identifier
    participant_type: Literal['internal', 'operator', 'engineer'] = 'internal'
    rubric: str = Field(min_length=20, max_length=3000)

class TrialAction(Input):
    action: ActionName
    expected_revision: int = Field(ge=0, strict=True)
    payload: dict = Field(default_factory=dict)

class Notes(Input):
    text: str = Field(min_length=10, max_length=4000)

class Ready(Input):
    client_elapsed_ms: float | None = Field(default=None, ge=0, le=86400000)

class Review(Input):
    reviewer_code: Identifier
    verdict: Literal['reviewable', 'needs_revision']
    missed_items: int = Field(ge=0, le=100, strict=True)
    corrections: int = Field(ge=0, le=100, strict=True)
    notes: str = Field(min_length=10, max_length=4000)
