import copy
import csv
import hashlib
import io
import json
from datetime import datetime, timedelta, timezone
from importlib import metadata, resources
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from leaklens import events, network
from leaklens.api import create_app
from test_api import TOKENS, auth, client, event

P = '/api/v1/evaluations'

def start(c, scenario='main_break'):
    response = c.post(P, headers=auth(), json={'scenario': scenario, 'participant_code': 'P01', 'participant_type': 'internal', 'rubric': 'Specify potential area, uncertainty, advisory wording, sampling and field handoff.'})
    assert response.status_code == 201, response.text
    return response.json()

def action(c, run, kind, payload=None, status=200, role='operator'):
    response = c.post(f"{P}/{run['id']}/actions", headers=auth(role), json={'action': kind, 'expected_revision': run['revision'], 'payload': payload or {}})
    assert response.status_code == status, response.text
    return response.json()

def test_trials_are_isolated_repeatable_and_persist(tmp_path):
    path = tmp_path / 'demo.sqlite3'
    with TestClient(create_app(path, TOKENS)) as c:
        existing = event(c)
        first = start(c)
        second = start(c)
        assert first['event']['id'] != second['event']['id']
        assert c.get('/api/v1/events').json()['events'][0]['id'] == existing['id']
        assert len(c.get(P, headers=auth()).json()['runs']) == 2
    with TestClient(create_app(path, TOKENS)) as c:
        assert c.get(f"{P}/{first['id']}", headers=auth()).json()['event']['id'] == first['event']['id']

def test_brief_dip_is_uncertain_not_sustained(client):
    run = start(client, 'brief_dip')
    assert run['event'] is None
    assert run['provenance'] == 'simulated'
    assert len(run['network']['segments'][0]['readings']) == 5
    assert run['outcome'] == 'investigate_transient'

def test_trial_saved_edits_and_export_are_immutable(client):
    run = start(client)
    run = action(client, run, 'presented')
    before = run['event']['advisory']['draft']
    run = action(client, run, 'advisory_edit', {'draft': 'SIMULATION ONLY: Reviewed North zone wording.', 'expected_draft': before})
    assert run['log'][-1]['before']['advisory']['draft'] == before
    assert run['log'][-1]['after']['advisory']['draft'] != before
    plan = run['event']['sampling_plan']
    run = action(client, run, 'sampling_edit', {'plan': ['Confirm upstream location with operator.'], 'expected_plan': plan})
    run = action(client, run, 'notes', {'text': 'Boundary uncertain. Verify sensor and isolation records.'})
    run = action(client, run, 'ready', {'client_elapsed_ms': 1234})
    assert run['ready']['reviewer_validated'] is False
    first = run['ready']['snapshot']
    run = action(client, run, 'notes', {'text': 'Later correction preserved without changing first answer.'})
    assert run['ready']['snapshot'] == first
    exported = client.get(f"{P}/{run['id']}/export", headers=auth()).json()
    assert exported['ready']['snapshot'] == first
    assert exported['benchmark_result'] is None
    csv = client.get(f"{P}/{run['id']}/export?format=csv", headers=auth())
    assert 'advisory_edit' in csv.text and 'client_elapsed_ms' in csv.text

def test_trial_auth_conflicts_and_readiness_guards(client):
    assert client.get(P).status_code == 401
    run = start(client)
    action(client, run, 'ready', status=409)
    presented = action(client, run, 'presented')
    action(client, run, 'notes', {'text': 'Stale request should not overwrite.'}, status=409)
    action(client, presented, 'notes', {'text': 'Crew cannot change trial metadata.'}, status=403, role='crew')
    action(client, presented, 'ready', status=409)
    assert client.get(f"{P}/{run['id']}", headers=auth()).json()['ready'] is None

def test_sampling_plan_edit_requires_current_content_and_open_event(client):
    e = event(client)
    path = f"/api/v1/events/{e['id']}/sampling-plan"
    body = {'expected_plan': e['sampling_plan'], 'plan': ['Operator-reviewed upstream sampling location.']}
    assert client.patch(path, headers=auth('crew'), json=body).status_code == 403
    assert client.patch(path, headers=auth(), json=body).status_code == 200
    assert client.patch(path, headers=auth(), json=body).status_code == 409

def test_trial_complete_workflow_uses_real_clearance_guards(client):
    run = action(client, start(client), 'presented')
    run = action(client, run, 'advisory_approve', {'expected_draft': run['event']['advisory']['draft']})
    run = action(client, run, 'job_approve', {'crew': 'CREW-1'})
    run = action(client, run, 'work', {'step': 'repair'}, role='crew')
    run = action(client, run, 'work', {'step': 'flush'}, role='crew')
    run = action(client, run, 'sample', {'sample_id': 'F1', 'result': 'failed'}, role='crew')
    action(client, run, 'sample', {'sample_id': 'C1', 'result': 'clear'}, status=409, role='crew')
    run = action(client, run, 'work', {'step': 'flush'}, role='crew')
    for ident in ('C1', 'C2'):
        run = action(client, run, 'sample', {'sample_id': ident, 'result': 'clear'}, role='crew')
    action(client, run, 'clearance', status=409)
    run = action(client, run, 'recovery', role='ingest')
    run = action(client, run, 'clearance')
    assert run['event']['status'] == 'closed'
    assert client.get('/api/v1/events').json()['events'] == []

def test_review_scores_frozen_answer_without_claiming_benchmark(client):
    run = action(client, start(client), 'presented')
    run = action(client, run, 'notes', {'text': 'Check uncertainty before any operator approved response.'})
    run = action(client, run, 'ready')
    run = action(client, run, 'review', {'reviewer_code': 'REVIEWER01', 'verdict': 'needs_revision', 'missed_items': 2, 'corrections': 1, 'notes': 'Confirm the sampling locations and boundary.'})
    assert run['reviews'][0]['missed_items'] == 2
    assert run['ready']['reviewer_validated'] is False
    assert run['benchmark_result'] is None

def test_csv_escapes_formula_rubric_and_reset_retains_trials(client):
    run = client.post(P, headers=auth(), json={'scenario': 'brief_dip', 'participant_code': 'P01', 'rubric': '=SUM(A1:A2) rubric entered as text only'}).json()
    csv = client.get(f"{P}/{run['id']}/export?format=csv", headers=auth()).text
    assert "'=SUM(A1:A2)" in csv
    client.post('/api/v1/demo/reset', headers=auth(), json={'confirm': 'RESET DEMO'})
    assert client.get(f"{P}/{run['id']}", headers=auth()).status_code == 200


@pytest.mark.parametrize('seconds,elapsed,status,capped', [
    (-1, None, 'timing_invalid', None), (0, 0, 'declared', False),
    (299, 299, 'declared', False), (300, 300, 'declared', True),
    (301, 301, 'declared', True),
])
def test_declared_timing_handles_rollback_and_cap_without_review_claims(client, monkeypatch, seconds, elapsed, status, capped):
    run = start(client)
    presented = datetime.now(timezone.utc)
    monkeypatch.setattr(events, 'now_iso', lambda: presented.isoformat())
    run = action(client, run, 'presented')
    run = action(client, run, 'notes', {'text': 'Investigate uncertain sensor and boundary before response.'})
    monkeypatch.setattr(events, 'now_iso', lambda: (presented + timedelta(seconds=seconds)).isoformat())
    run = action(client, run, 'ready', {'client_elapsed_ms': 1500})
    assert run['ready']['server_elapsed_seconds'] == elapsed
    assert run['ready']['timing_invalid_reason'] == ('wall_clock_rollback' if seconds < 0 else None)
    assert run['measurement_status'] == status
    assert run['capped'] is capped
    assert run['cap_seconds'] == 300
    assert run['reviewability_verified'] is False
    exported = client.get(f"{P}/{run['id']}/export", headers=auth()).json()
    assert exported['ready'] == run['ready']
    rows = list(csv.DictReader(io.StringIO(client.get(f"{P}/{run['id']}/export?format=csv", headers=auth()).text)))
    assert rows[-1]['measurement_status'] == status
    assert rows[-1]['server_elapsed_seconds'] == ('' if elapsed is None else str(float(elapsed)))


def test_incomplete_trial_does_not_invent_zero_elapsed_or_capped_result(client):
    run = start(client)
    assert run['ready'] is None
    assert run['measurement_status'] == 'incomplete'
    assert run['server_elapsed_seconds'] is None
    assert run['capped'] is None
    assert run['reviewability_verified'] is False
    assert run['benchmark_result'] is None


def test_clock_rollback_between_actions_invalidates_even_positive_total_time(client, monkeypatch):
    run = start(client)
    base = datetime.now(timezone.utc)
    monkeypatch.setattr(events, 'now_iso', lambda: base.isoformat())
    run = action(client, run, 'presented')
    monkeypatch.setattr(events, 'now_iso', lambda: (base + timedelta(seconds=20)).isoformat())
    run = action(client, run, 'notes', {'text': 'Uncertain boundary needs investigation and sampling.'})
    monkeypatch.setattr(events, 'now_iso', lambda: (base + timedelta(seconds=10)).isoformat())
    run = action(client, run, 'ready')
    assert run['ready']['server_elapsed_seconds'] is None
    assert run['ready']['timing_invalid_reason'] == 'wall_clock_rollback'
    assert run['measurement_status'] == 'timing_invalid'
    assert run['capped'] is None
    assert client.get(f"{P}/{run['id']}/export", headers=auth()).json()['ready'] == run['ready']


def test_provenance_and_initial_stimulus_are_frozen_across_upgrade(tmp_path, monkeypatch):
    from leaklens import evaluation
    path = tmp_path / 'frozen.sqlite3'
    with TestClient(create_app(path, TOKENS)) as c:
        run = start(c)
        assert run['schema_version'] == 1
        assert run['provenance_status'] == 'recorded_at_creation'
        assert run['app_version'] == metadata.version('leaklens-backend')
        assert run['app_version_source'] == 'package_metadata:leaklens-backend'
        expected_trace = [[0, 45], [1, 12], [6, 12], [10, 12]]
        assert run['trace_hash'] == hashlib.sha256(json.dumps(expected_trace, separators=(',', ':')).encode()).hexdigest()
        source = run['source_hashes']['network.py']
        assert source['status'] == 'available'
        assert source['sha256'] == hashlib.sha256(Path(network.__file__).read_bytes()).hexdigest()
        assert run['initial_stimulus']['network'] == run['network']
        assert run['initial_stimulus']['event'] == run['event']
        original = copy.deepcopy(run)
    monkeypatch.setitem(network.SEGMENTS[0], 'name', 'Upgraded network label')
    monkeypatch.setitem(network.WEIGHTS, 'leak_evidence', 0.2)
    monkeypatch.setitem(network.POLICY, 'freshness_seconds', 999)
    monkeypatch.setitem(evaluation.TRACES, 'main_break', [(0, 99)])
    with TestClient(create_app(path, TOKENS)) as c:
        exported = c.get(f"{P}/{run['id']}/export", headers=auth()).json()
        for key in ('initial_stimulus', 'policy', 'trace_hash', 'source_hashes', 'app_version'):
            assert exported[key] == original[key]
        assert exported['initial_stimulus']['network']['segments'][0]['name'] == 'Orchard crossing'
        assert exported['network_basis'] == 'current_runtime_display_not_initial_stimulus'
        resumed = action(c, exported, 'presented')
        assert resumed['log'][-1]['after']['network_basis'] == 'current_runtime_display_at_snapshot_not_initial_stimulus'
        assert resumed['initial_stimulus'] == original['initial_stimulus']


def test_unreadable_packaged_sources_and_version_are_honestly_unavailable(client, monkeypatch):
    def unreadable(*args):
        raise OSError('source package not readable')
    def missing_version(*args):
        raise metadata.PackageNotFoundError('leaklens-backend')
    monkeypatch.setattr(resources, 'files', unreadable)
    monkeypatch.setattr(metadata, 'version', missing_version)
    run = start(client)
    assert run['app_version'] is None
    assert run['app_version_source'] == 'unavailable'
    assert run['source_hashes']
    for source in run['source_hashes'].values():
        assert source['sha256'] is None
        assert source['status'] == 'unavailable'
        assert source['reason']


def test_ready_snapshot_freezes_telemetry_status_samples_and_clearance(client):
    run = action(client, start(client), 'presented')
    run = action(client, run, 'advisory_approve', {'expected_draft': run['event']['advisory']['draft']})
    run = action(client, run, 'job_approve', {'crew': 'CREW-1'})
    for step in ('repair', 'flush'):
        run = action(client, run, 'work', {'step': step}, role='crew')
    for ident in ('C1', 'C2'):
        run = action(client, run, 'sample', {'sample_id': ident, 'result': 'clear'}, role='crew')
    run = action(client, run, 'recovery', role='ingest')
    run = action(client, run, 'clearance')
    run = action(client, run, 'notes', {'text': 'Simulated work complete, regulatory clearance is not established.'})
    run = action(client, run, 'ready')
    frozen = run['ready']['snapshot']
    assert frozen['status'] == 'closed'
    assert frozen['samples'] == run['event']['samples']
    assert frozen['clearance'] == run['event']['clearance']
    assert frozen['clear_streak'] == 2
    assert frozen['network'] == run['network']
    assert frozen['telemetry']['CA-001'][-1]['pressure_psi'] == 45
    assert run['log'][-1]['after']['samples'] == frozen['samples']
    run = action(client, run, 'notes', {'text': 'Later operator notes must not change the frozen answer.'})
    assert run['ready']['snapshot'] == frozen


def update_stored_run(c, ident, mutate):
    with c.app.state.store.connect() as db:
        raw = json.loads(db.execute('SELECT data FROM evaluation_runs WHERE id=?', (ident,)).fetchone()[0])
        mutate(raw)
        db.execute('UPDATE evaluation_runs SET data=? WHERE id=?', (json.dumps(raw), ident))


@pytest.mark.parametrize('field,value', [
    ('ready', 'broken'), ('ready', {'at': 'not-a-date'}),
    ('log', [{'action': 'notes'}]), ('reviews', [{'verdict': 'reviewable'}]),
    ('presented_at', 'not-a-date'), ('revision', -1), ('policy', {}),
    ('initial_stimulus', {'network': {'segments': 'broken'}}),
    ('schema_version', 999), ('id', 'different-row-id'),
])
def test_corrupt_stored_envelope_returns_safe_503_on_every_api_path(tmp_path, field, value):
    with TestClient(create_app(tmp_path / 'corrupt.sqlite3', TOKENS), raise_server_exceptions=False) as c:
        run = start(c)
        update_stored_run(c, run['id'], lambda raw: raw.update({field: value}))
        for suffix in ('', f"/{run['id']}", f"/{run['id']}/export", f"/{run['id']}/export?format=csv"):
            response = c.get(P + suffix, headers=auth())
            assert response.status_code == 503, response.text
            assert 'Unsupported or corrupt evaluation data' in response.json()['detail']
            assert str(value) not in response.text
        action(c, run, 'presented', status=503)


def test_unversioned_existing_run_is_explicitly_legacy_without_invented_provenance(client):
    run = start(client)
    original_keys = {'id', 'revision', 'scenario', 'participant_code', 'participant_type', 'rubric',
                     'provenance', 'created_at', 'policy', 'state', 'notes', 'presented_at', 'ready',
                     'reviews', 'outcome', 'log'}
    def make_legacy(raw):
        for key in list(raw):
            if key not in original_keys:
                del raw[key]
    update_stored_run(client, run['id'], make_legacy)
    exported = client.get(f"{P}/{run['id']}/export", headers=auth()).json()
    assert exported['schema_version'] == 0
    assert exported['provenance_status'] == 'legacy_unversioned'
    for key in ('app_version', 'trace_hash', 'source_hashes', 'initial_stimulus'):
        assert exported[key] is None
    assert exported['measurement_status'] == 'incomplete'
    resumed = action(client, exported, 'presented')
    assert resumed['schema_version'] == 0
    assert resumed['initial_stimulus'] is None


@pytest.mark.parametrize('mutation', [
    lambda r: r.pop('participant_type'),
    lambda r: r['ready'].update(server_elapsed_seconds=-1),
    lambda r: r['ready'].pop('timing_invalid_reason'),
    lambda r: r['ready']['snapshot'].update(samples='broken'),
    lambda r: r['log'][-1]['after'].pop('telemetry'),
    lambda r: r['log'][-1]['payload'].update(unexpected=float('nan')),
    lambda r: r['reviews'][0].update(missed_items=-1),
    lambda r: r['reviews'][0].update(reviews_ready_at='2000-01-01T00:00:00+00:00'),
    lambda r: r['source_hashes']['network.py'].update(sha256=None),
])
def test_nested_envelope_corruption_is_safe_even_in_listing(tmp_path, mutation):
    with TestClient(create_app(tmp_path / 'nested.sqlite3', TOKENS), raise_server_exceptions=False) as c:
        run = action(c, start(c), 'presented')
        run = action(c, run, 'notes', {'text': 'Check uncertain boundary and sampling before response.'})
        run = action(c, run, 'ready')
        run = action(c, run, 'review', {'reviewer_code': 'R01', 'verdict': 'needs_revision',
                                      'missed_items': 1, 'corrections': 1, 'notes': 'Clarify uncertain sampling locations.'})
        update_stored_run(c, run['id'], mutation)
        for suffix in ('', f"/{run['id']}", f"/{run['id']}/export?format=csv"):
            assert c.get(P + suffix, headers=auth()).status_code == 503
        action(c, run, 'notes', {'text': 'Cannot update corrupt stored trial.'}, status=503)


@pytest.mark.parametrize('stored', ['{broken', '[]', 'null'])
def test_malformed_stored_document_returns_safe_503(client, stored):
    run = start(client)
    with client.app.state.store.connect() as db:
        db.execute('UPDATE evaluation_runs SET data=? WHERE id=?', (stored, run['id']))
    assert client.get(P, headers=auth()).status_code == 503
    assert client.get(f"{P}/{run['id']}/export", headers=auth()).status_code == 503


def test_legacy_ready_snapshots_remain_incomplete_without_backfilled_evidence(client):
    run = action(client, start(client), 'presented')
    run = action(client, run, 'notes', {'text': 'Legacy answer with only draft and operator notes recorded.'})
    run = action(client, run, 'ready')
    def make_legacy(raw):
        for key in ('schema_version', 'provenance_status', 'app_version', 'app_version_source',
                    'trace_hash', 'source_hashes', 'initial_stimulus'):
            raw.pop(key)
        raw['ready'].pop('timing_invalid_reason')
        snapshots = [raw['ready']['snapshot']]
        snapshots.extend(s for entry in raw['log'][1:] for s in (entry['before'], entry['after']))
        for snapshot in snapshots:
            for key in ('network', 'network_basis', 'telemetry', 'status', 'samples', 'clear_streak', 'clearance'):
                snapshot.pop(key)
    update_stored_run(client, run['id'], make_legacy)
    exported = client.get(f"{P}/{run['id']}/export", headers=auth()).json()
    assert exported['schema_version'] == 0
    assert exported['provenance_status'] == 'legacy_unversioned'
    assert exported['initial_stimulus'] is None
    assert exported['measurement_status'] == 'declared'
    assert exported['ready']['server_elapsed_seconds'] == run['ready']['server_elapsed_seconds']
    assert set(exported['ready']['snapshot']) == {'advisory', 'sampling_plan', 'job', 'notes'}
