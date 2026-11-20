from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

Identifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class Reading(Input):
    segment_id: Identifier
    pressure_psi: float = Field(ge=0, le=300, strict=True)
    observed_at: AwareDatetime


class AdvisoryReview(Input):
    expected_draft: Annotated[str, StringConstraints(strip_whitespace=False, strict=True)]


class Advisory(AdvisoryReview):
    draft: str = Field(min_length=10, max_length=4000)


class Assignment(Input):
    crew: Identifier


class Work(Input):
    step: Literal["repair", "flush"]


class Sample(Input):
    sample_id: Identifier
    result: Literal["clear", "failed"]


class Scenario(Input):
    segment_id: Identifier = "CA-001"


class Reset(Input):
    confirm: Literal["RESET DEMO"]


class SamplingPlan(Input):
    plan: list[Annotated[str, StringConstraints(min_length=10, max_length=1000)]] = Field(min_length=1, max_length=10)
    expected_plan: list[str] = Field(max_length=10)
