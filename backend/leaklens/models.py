from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

Identifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class Reading(Input):
    segment_id: Identifier
    pressure_psi: float = Field(ge=0, le=300, strict=True)
    observed_at: AwareDatetime
