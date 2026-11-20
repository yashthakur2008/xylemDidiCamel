from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from leaklens.api import create_app

TOKENS = {role: role.ljust(40, "x") for role in ("operator", "crew", "ingest")}
P = "/api/v1"


def auth(role="operator"):
    return {"Authorization": f"Bearer {TOKENS[role]}"}


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "demo.sqlite3", TOKENS)) as c:
        yield c


def reading(client, psi, seconds_ago=10, segment="CA-001"):
    return client.post(P + "/readings", headers=auth("ingest"), json={
        "segment_id": segment, "pressure_psi": psi,
        "observed_at": (datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)).isoformat(),
    })


def event(client):
    assert reading(client, 12, 20).status_code == 201
    result = reading(client, 12, 10)
    assert result.status_code == 201, result.text
    return result.json()["event"]


def test_health_and_explainable_risk(client):
    assert client.get("/health").status_code == 200
    assert client.get("/health").json()["mode"] == "simulation"
    data = client.get(P + "/network").json()
    assert data["simulated"] is True
    segments = data["segments"]
    assert len(segments) >= 3
    assert segments[0]["risk"]["score"] >= segments[-1]["risk"]["score"]
    for s in segments:
        assert s["telemetry_status"] == "missing"
        assert s["risk"]["score"] == round(sum(f["contribution"] for f in s["risk"]["factors"]), 1)
        assert sum(f["weight"] for f in s["risk"]["factors"]) == pytest.approx(1)


@pytest.mark.parametrize("psi,trigger", [(19.9, True), (20, False), (20.1, False)])
def test_pressure_threshold_and_sustained_detection(client, psi, trigger):
    assert reading(client, psi, 20).json()["event"] is None
    result = reading(client, psi, 10).json()
    assert bool(result["event"]) is trigger
    assert len(client.get(P + "/events").json()["events"]) == int(trigger)


def test_no_duplicate_active_event(client):
    first = event(client)
    assert reading(client, 11, 1).json()["event"]["id"] == first["id"]
    assert len(client.get(P + "/events").json()["events"]) == 1


def test_short_dip_and_long_gap_do_not_trigger(client):
    assert reading(client, 12, 70).json()["event"] is None
    assert reading(client, 12, 20).json()["event"] is None
    assert reading(client, 12, 19).json()["event"] is None
    assert reading(client, 30, 10).json()["event"] is None
    assert reading(client, 12, 1).json()["event"] is None


@pytest.mark.parametrize("psi,age,status", [(-1, 5, 422), (301, 5, 422), (12, 121, 422), (12, -60, 422)])
def test_invalid_or_stale_readings_rejected(client, psi, age, status):
    assert reading(client, psi, age).status_code == status
    assert client.get(P + "/events").json()["events"] == []


def test_out_of_order_and_unknown_segment(client):
    assert reading(client, 30, 5).status_code == 201
    assert reading(client, 12, 10).status_code == 409
    assert reading(client, 12, 1, "unknown").status_code == 404


def test_auth_cannot_be_spoofed(client):
    body = {"segment_id": "CA-001", "pressure_psi": 12, "observed_at": datetime.now(timezone.utc).isoformat()}
    assert client.post(P + "/readings", json=body, headers={"X-Role": "ingest"}).status_code == 401
    assert client.post(P + "/readings", json=body, headers=auth("crew")).status_code == 403
    assert client.post(P + "/readings", json=body, headers={"Authorization": "Bearer bad"}).status_code == 401


def test_public_openapi_and_missing_event(client):
    assert "/api/v1/readings" in client.get("/openapi.json").json()["paths"]
    assert client.get(P + "/events/not-real").status_code == 404


def test_database_survives_new_app_instance(tmp_path):
    db = tmp_path / "persistent.sqlite3"
    with TestClient(create_app(db, TOKENS)) as c:
        ident = event(c)["id"]
    with TestClient(create_app(db, TOKENS)) as c:
        assert c.get(P + "/events/" + ident).json()["id"] == ident


def test_missing_and_duplicate_tokens_fail_startup(tmp_path):
    with pytest.raises(ValueError):
        create_app(tmp_path / "bad.sqlite3", {})
    with pytest.raises(ValueError):
        create_app(tmp_path / "bad.sqlite3", {r: "x" * 40 for r in TOKENS})
