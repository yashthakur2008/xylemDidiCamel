"""Isolated, append-audited evaluation runs. Never substitutes human validation."""
import copy
import csv
import io
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from pydantic import ValidationError
from fastapi import HTTPException

from . import events, workflow
from .evaluation_provenance import provenance
from .evaluation_schema import EvaluationEnvelope
from .evaluation_timing import declaration_timing
from .models import Advisory, AdvisoryReview, Assignment, Input, Reading, Sample, SamplingPlan, Work
from .network import POLICY, network_view
from .store import initial_state

TRACES = {
    'main_break': [(0, 45), (1, 12), (6, 12), (10, 12)],
    'brief_dip': [(0, 45), (1, 12), (5, 12), (6, 45), (10, 45)],
}
DOMAIN_ACTIONS = {
    'advisory_edit': (Advisory, workflow.edit_advisory, 'operator'),
    'advisory_approve': (AdvisoryReview, workflow.approve_advisory, 'operator'),
    'sampling_edit': (SamplingPlan, workflow.edit_sampling_plan, 'operator'),
    'job_approve': (Assignment, workflow.approve_job, 'operator'),
    'work': (Work, workflow.record_work, 'crew'),
    'sample': (Sample, workflow.record_sample, 'crew'),
}


def snapshot(run):
    event = next(iter(run['state']['events'].values()), None)
    return {'advisory': copy.deepcopy(event['advisory']) if event else None,
            'sampling_plan': copy.deepcopy(event['sampling_plan']) if event else [],
            'job': copy.deepcopy(event['job']) if event else None,
            'notes': run['notes'], 'network': copy.deepcopy(network_view(run['state'])),
            'network_basis': 'current_runtime_display_at_snapshot_not_initial_stimulus',
            'telemetry': copy.deepcopy(run['state']['readings']),
            'status': event['status'] if event else None,
            'samples': copy.deepcopy(event['samples']) if event else [],
            'clear_streak': event['clear_streak'] if event else None,
            'clearance': copy.deepcopy(event.get('clearance')) if event else None}


def measurement(run):
    ready = run['ready']
    elapsed = ready['server_elapsed_seconds'] if ready else None
    invalid = ready.get('timing_invalid_reason') if ready else None
    return {'measurement_status': 'incomplete' if ready is None else ('timing_invalid' if invalid else 'declared'),
            'server_elapsed_seconds': elapsed, 'timing_invalid_reason': invalid,
            'capped': elapsed >= 300 if elapsed is not None else None, 'cap_seconds': 300,
            'reviewability_verified': False,
            'measurement_meaning': 'Participant declaration only. Capped means declared elapsed >= 300 seconds, '
                                   'not verified reviewability, a censor action, or a measured response-time benefit.'}


def view(run):
    result = {k: copy.deepcopy(v) for k, v in run.items() if k != 'state'}
    result['network'] = network_view(run['state'])
    result['network_basis'] = 'current_runtime_display_not_initial_stimulus'
    result['event'] = next(iter(copy.deepcopy(run['state']['events']).values()), None)
    result['benchmark_result'] = None
    result.update(measurement(run))
    return result


def decode_run(data, ident):
    try:
        run = json.loads(data)
        # Arbitrary log payload dictionaries also must contain finite JSON values.
        envelope = EvaluationEnvelope.model_validate_json(json.dumps(run, allow_nan=False))
        if envelope.id != ident:
            raise ValueError('Evaluation row identity mismatch')
    except (ValueError, TypeError):
        raise HTTPException(503, 'Unsupported or corrupt evaluation data; restore from backup') from None
    if envelope.schema_version == 0:
        # The old envelope has no recorded versions/hashes/stimulus. Never reconstruct
        # those using today's code, even when this legacy run is later resumed.
        run.update(schema_version=0, provenance_status='legacy_unversioned', app_version=None,
                   app_version_source='unavailable', trace_hash=None, source_hashes=None, initial_stimulus=None)
    return run


class EvaluationStore:
    def __init__(self, store):
        self.store = store
        with store.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS evaluation_runs (id TEXT PRIMARY KEY, data TEXT NOT NULL)')

    @staticmethod
    def load(db, ident):
        row = db.execute('SELECT data FROM evaluation_runs WHERE id=?', (ident,)).fetchone()
        events.require(row is not None, 'Evaluation run not found', 404)
        return decode_run(row[0], ident)

    def read(self, ident):
        with self.store.connect() as db:
            return view(self.load(db, ident))

    def list(self):
        with self.store.connect() as db:
            rows = db.execute('SELECT id, data FROM evaluation_runs ORDER BY rowid DESC').fetchall()
        return [{'id': r['id'], 'scenario': r['scenario'], 'participant_code': r['participant_code'],
                 'created_at': r['created_at'], 'ready_at': r['ready']['at'] if r['ready'] else None}
                for r in (decode_run(data, ident) for ident, data in rows)]

    def create(self, body):
        state = initial_state()
        base = datetime.now(timezone.utc) - timedelta(seconds=12)
        for seconds, pressure in TRACES[body.scenario]:
            events.ingest(state, Reading(segment_id='CA-001', pressure_psi=float(pressure),
                                        observed_at=base + timedelta(seconds=seconds)), 'operator')
        now = events.now_iso()
        run = {'id': str(uuid4()), 'revision': 0, 'scenario': body.scenario,
               'participant_code': body.participant_code, 'participant_type': body.participant_type,
               'rubric': body.rubric, 'provenance': 'simulated', 'created_at': now,
               **provenance(TRACES[body.scenario]),
               'policy': copy.deepcopy(POLICY), 'state': state, 'notes': '', 'presented_at': None,
               'initial_stimulus': {'network': copy.deepcopy(network_view(state)),
                                    'event': copy.deepcopy(next(iter(state['events'].values()), None))},
               'ready': None, 'reviews': [], 'outcome': 'sustained_pressure_loss' if state['events'] else 'investigate_transient',
               'log': [{'at': now, 'action': 'trial_created', 'actor_role': 'operator',
                        'detail': 'Synthetic trace replayed without wall-clock waiting. No human result measured.'}]}
        with self.store.connect() as db:
            serialized = json.dumps(run, allow_nan=False)
            EvaluationEnvelope.model_validate_json(serialized)
            db.execute('INSERT INTO evaluation_runs VALUES (?,?)', (run['id'], serialized))
        return view(run)

    def act(self, ident, body, actor):
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            run = self.load(db, ident)
            # Presentation acknowledgement is idempotent across reloads/StrictMode.
            if body.action == 'presented' and run['presented_at']:
                events.require(actor == 'operator', 'Role not permitted', 403)
                return view(run)
            events.require(body.expected_revision == run['revision'], 'Trial changed; refresh before retrying')
            before = snapshot(run)
            apply_action(run, body.action, body.payload, actor)
            run['revision'] += 1
            run['log'].append({'at': events.now_iso(), 'action': body.action, 'actor_role': actor,
                               'before': before, 'after': snapshot(run), 'payload': body.payload})
            serialized = json.dumps(run, allow_nan=False)
            EvaluationEnvelope.model_validate_json(serialized)
            db.execute('UPDATE evaluation_runs SET data=? WHERE id=?', (serialized, ident))
            return view(run)


def validate(model, data):
    try:
        return model.model_validate(data)
    except ValidationError:
        raise HTTPException(422, 'Invalid action payload') from None


def apply_action(run, action, payload, actor):
    from .evaluation_models import Notes, Ready, Review
    required = DOMAIN_ACTIONS[action][2] if action in DOMAIN_ACTIONS else ('ingest' if action == 'recovery' else 'operator')
    events.require(actor == required, 'Role not permitted', 403)
    if action == 'presented':
        validate(Input, payload)
        run['presented_at'] = events.now_iso()
        return
    events.require(run['presented_at'] is not None, 'Display the scenario before recording actions')
    if action == 'notes':
        run['notes'] = validate(Notes, payload).text
    elif action == 'ready':
        body = validate(Ready, payload)
        events.require(run['ready'] is None, 'First response declaration already recorded')
        events.require(len(run['notes'].strip()) >= 10, 'Record investigation and remaining uncertainty before declaring ready')
        now = events.now_iso()
        timing = declaration_timing(datetime.fromisoformat(run['presented_at']), datetime.fromisoformat(now),
                                    ((entry['action'], datetime.fromisoformat(entry['at'])) for entry in run['log']))
        run['ready'] = {'at': now, **timing,
                        'client_elapsed_ms': body.client_elapsed_ms, 'reviewer_validated': False,
                        'snapshot': snapshot(run), 'meaning': 'Participant declaration only; elapsed time is not a validated response-time benefit.'}
    elif action == 'review':
        body = validate(Review, payload)
        events.require(run['ready'] is not None, 'A frozen first response is required before review')
        run['reviews'].append({**body.model_dump(), 'at': events.now_iso(), 'reviews_ready_at': run['ready']['at']})
    elif action == 'recovery':
        validate(Input, payload)
        events.ingest(run['state'], Reading(segment_id='CA-001', pressure_psi=45.0, observed_at=datetime.now(timezone.utc)), actor)
    else:
        event = next(iter(run['state']['events'].values()), None)
        events.require(event is not None, 'No sustained incident exists. Investigate the transient; do not issue a simulated advisory automatically.')
        if action == 'clearance':
            validate(Input, payload)
            workflow.approve_clearance(run['state'], event['id'], actor)
        else:
            model, operation, _ = DOMAIN_ACTIONS[action]
            operation(run['state'], event['id'], validate(model, payload), actor)


def csv_export(run):
    output = io.StringIO()
    writer = csv.writer(output)
    metadata_keys = ['schema_version', 'app_version', 'app_version_source', 'provenance_status',
                     'trace_hash', 'source_hashes', 'policy', 'initial_stimulus', 'network_basis', 'measurement_status',
                     'timing_invalid_reason', 'capped', 'cap_seconds', 'reviewability_verified', 'measurement_meaning']
    writer.writerow(['run_id', 'scenario', 'provenance', 'participant_code', 'participant_type', 'rubric', 'at', 'action', 'detail_json', 'server_elapsed_seconds', 'client_elapsed_ms'] + metadata_keys)
    ready = run['ready'] or {}
    for entry in run['log']:
        values = [run['id'], run['scenario'], run['provenance'], run['participant_code'], run['participant_type'], run['rubric'], entry['at'], entry['action'], json.dumps(entry), ready.get('server_elapsed_seconds', ''), ready.get('client_elapsed_ms', '')]
        values.extend(json.dumps(run[key]) if isinstance(run[key], (dict, list)) else run[key] for key in metadata_keys)
        # Neutralize spreadsheet formula interpretation, including leading whitespace.
        writer.writerow(["'" + str(v) if str(v).lstrip().startswith(('=', '+', '-', '@')) else v for v in values])
    return output.getvalue()
