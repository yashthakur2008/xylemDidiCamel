from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from test_api import P, auth, client, reading
from test_workflow import assigned, post, sample, work


def ready(c):
    e = assigned(c)
    work(c, e, "repair")
    work(c, e, "flush")
    assert sample(c, e, "S1").status_code == 200
    assert sample(c, e, "S2").status_code == 200
    return e


def test_renewed_low_reading_invalidates_previous_clear_samples(client):
    e = ready(client)
    assert reading(client, 45, 5).status_code == 201
    r = reading(client, 12, 1)
    assert r.status_code == 201
    assert r.json()["event"]["clear_streak"] == 0
    assert r.json()["event"]["status"] == "reflush_required"
    assert reading(client, 45, 0).status_code == 201
    assert post(client, e, "clearance/approve").status_code == 409
    assert len(client.get(f"{P}/events/{e['id']}").json()["samples"]) == 2  # retain evidence


def test_renewed_low_pressure_invalidates_flush_before_first_sample(client):
    e = assigned(client)
    work(client, e, "repair")
    work(client, e, "flush")
    reading(client, 45, 5)
    r = reading(client, 12, 1)
    assert r.json()["event"]["job"]["flushed"] is False
    assert sample(client, e, "S1").status_code == 409


@pytest.mark.parametrize("corruption", ["missing_time", "bad_time", "bad_event"])
def test_nested_corruption_fails_startup_without_overwriting_database(tmp_path, corruption):
    import json
    import sqlite3
    from leaklens.api import create_app
    from test_api import TOKENS
    db = tmp_path / "corrupt.sqlite3"
    create_app(db, TOKENS)
    state = {"schema_version": 1, "readings": {}, "low_since": {}, "events": {}}
    if corruption == "bad_event":
        state["events"]["fake"] = {"id": "fake"}
    else:
        point = {"pressure_psi": 45}
        if corruption == "bad_time":
            point["observed_at"] = "broken"
        state["readings"]["CA-001"] = [point]
    serialized = json.dumps(state)
    with sqlite3.connect(db) as connection:
        connection.execute("UPDATE state SET data=?", (serialized,))
    with pytest.raises(ValueError):
        create_app(db, TOKENS)
    with sqlite3.connect(db) as connection:
        assert connection.execute("SELECT data FROM state").fetchone()[0] == serialized


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity", "true", '"12"', "null"])
def test_nonfinite_or_wrong_type_pressure_is_422(client, value):
    timestamp = datetime.now(timezone.utc).isoformat()
    raw = '{"segment_id":"CA-001","pressure_psi":' + value + ',"observed_at":"' + timestamp + '"}'
    r = client.post(P + "/readings", content=raw, headers={**auth("ingest"), "Content-Type": "application/json"})
    assert r.status_code == 422


def test_timezone_required_and_extra_fields_rejected(client):
    body = {"segment_id": "CA-001", "pressure_psi": 12, "observed_at": datetime.now().isoformat()}
    assert client.post(P + "/readings", json=body, headers=auth("ingest")).status_code == 422
    body["observed_at"] = datetime.now(timezone.utc).isoformat()
    body["role"] = "operator"
    assert client.post(P + "/readings", json=body, headers=auth("ingest")).status_code == 422


def test_concurrent_duplicate_sample_is_atomic(client):
    e = assigned(client)
    work(client, e, "repair")
    work(client, e, "flush")
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: sample(client, e, "same-id").status_code, range(2)))
    assert sorted(results) == [200, 409]
    assert len(client.get(f"{P}/events/{e['id']}").json()["samples"]) == 1


def test_stale_recovered_pressure_cannot_clear(client, monkeypatch):
    from leaklens import workflow, network
    e = ready(client)
    assert reading(client, 45, 0).status_code == 201
    future = datetime.now(timezone.utc) + timedelta(seconds=121)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return future

    monkeypatch.setattr(workflow, "datetime", Clock)
    monkeypatch.setattr(network, "datetime", Clock)
    assert post(client, e, "clearance/approve").status_code == 409
    assert client.get(P + "/network").json()["segments"][0]["telemetry_status"] == "stale"
