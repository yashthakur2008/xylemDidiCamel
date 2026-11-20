from typing import Literal
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from .evaluation import EvaluationStore, csv_export
from .evaluation_models import Trial, TrialAction


def evaluation_router(store, allow):
    runs = EvaluationStore(store)
    router = APIRouter(prefix='/api/v1/evaluations')

    @router.get('')
    def listing(actor=Depends(allow('operator'))):
        return {'runs': runs.list(), 'benchmark_result': None}

    @router.post('', status_code=201)
    def create(body: Trial, actor=Depends(allow('operator'))):
        return runs.create(body)

    @router.get('/{ident}')
    def read(ident: str, actor=Depends(allow('operator', 'crew', 'ingest'))):
        return runs.read(ident)

    @router.post('/{ident}/actions')
    def action(ident: str, body: TrialAction, actor=Depends(allow('operator', 'crew', 'ingest'))):
        return runs.act(ident, body, actor)

    @router.get('/{ident}/export')
    def export(ident: str, format: Literal['json', 'csv'] = 'json', actor=Depends(allow('operator'))):
        run = runs.read(ident)
        if format == 'csv':
            return Response(csv_export(run), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename="confluence-trial.csv"'})
        return run

    return router
