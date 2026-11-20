from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from . import events, workflow
from .models import Advisory, AdvisoryReview, Assignment, Reading, Reset, Sample, Scenario, Work
from .store import initial_state


def response_router(store, allow):
    router = APIRouter(prefix="/api/v1")

    @router.patch("/events/{event_id}/advisory")
    def edit(event_id: str, body: Advisory, actor=Depends(allow("operator"))):
        return store.update(lambda s: workflow.edit_advisory(s, event_id, body, actor))

    @router.post("/events/{event_id}/advisory/approve")
    def approve_notice(event_id: str, body: AdvisoryReview, actor=Depends(allow("operator"))):
        return store.update(lambda s: workflow.approve_advisory(s, event_id, body, actor))

    @router.post("/events/{event_id}/job/approve")
    def approve_job(event_id: str, body: Assignment, actor=Depends(allow("operator"))):
        return store.update(lambda s: workflow.approve_job(s, event_id, body, actor))

    @router.post("/events/{event_id}/work")
    def work(event_id: str, body: Work, actor=Depends(allow("crew"))):
        return store.update(lambda s: workflow.record_work(s, event_id, body, actor))

    @router.post("/events/{event_id}/samples")
    def sample(event_id: str, body: Sample, actor=Depends(allow("crew"))):
        return store.update(lambda s: workflow.record_sample(s, event_id, body, actor))

    @router.post("/events/{event_id}/clearance/approve")
    def clearance(event_id: str, actor=Depends(allow("operator"))):
        return store.update(lambda s: workflow.approve_clearance(s, event_id, actor))

    @router.post("/demo/scenario", status_code=201)
    def scenario(body: Scenario, actor=Depends(allow("operator"))):
        def run(state):
            events.require(not state["readings"].get(body.segment_id), "Reset demo before replaying this segment")
            now = datetime.now(timezone.utc)
            result = None
            for seconds, pressure in [(30, 45), (20, 12), (10, 12)]:
                result = events.ingest(state, Reading(segment_id=body.segment_id, pressure_psi=pressure,
                                                      observed_at=now - timedelta(seconds=seconds)), actor)
            return result
        return store.update(run)

    @router.post("/demo/reset")
    def reset(body: Reset, actor=Depends(allow("operator"))):
        def clear(state):
            state.clear()
            state.update(initial_state())
            return {"reset": True, "simulated": True}
        return store.update(clear)

    return router
