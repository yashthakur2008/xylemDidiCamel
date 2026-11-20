import pytest
from test_api import P, TOKENS, auth, client, event, reading


def post(c, e, path, body=None, role="operator"):
    if path == "advisory/approve" and body is None:
        body = {"expected_draft": e["advisory"]["draft"]}
    return c.post(f"{P}/events/{e['id']}/{path}", json=body or {}, headers=auth(role))


def assigned(c):
    e = event(c)
    assert post(c, e, "advisory/approve").status_code == 200
    assert post(c, e, "job/approve", {"crew": "Crew-A"}).status_code == 200
    return e


def sample(c, e, ident, result="clear"):
    return post(c, e, "samples", {"sample_id": ident, "result": result}, "crew")


def work(c, e, step):
    return post(c, e, "work", {"step": step}, "crew")


def test_notice_edit_approval_and_job_gate(client):
    e = event(client)
    assert post(client, e, "job/approve", {"crew": "Crew-A"}).status_code == 409
    assert work(client, e, "repair").status_code == 409
    url = f"{P}/events/{e['id']}/advisory"
    assert client.patch(url, json={"draft": "   ", "expected_draft": e["advisory"]["draft"]}, headers=auth()).status_code == 422
    assert client.patch(url, json={"draft": "Simulation notice for operator review.", "expected_draft": e["advisory"]["draft"]}, headers=auth("crew")).status_code == 403
    assert client.patch(url, json={"draft": "Simulation notice for operator review.", "expected_draft": e["advisory"]["draft"]}, headers=auth()).status_code == 200
    e = client.get(f"{P}/events/{e['id']}").json()
    approved = post(client, e, "advisory/approve")
    assert approved.status_code == 200
    assert approved.json()["advisory"]["delivery"] == "simulated_only"
    assert post(client, e, "advisory/approve").status_code == 409
    assert client.patch(url, json={"draft": "Edit after approval", "expected_draft": e["advisory"]["draft"]}, headers=auth()).status_code == 409
    assert post(client, e, "job/approve", {"crew": "Crew-A"}, "crew").status_code == 403
    assert post(client, e, "job/approve", {"crew": "Crew-A"}).status_code == 200


def test_full_workflow_failed_sample_reflush_and_clearance(client):
    e = assigned(client)
    assert sample(client, e, "early").status_code == 409
    assert work(client, e, "flush").status_code == 409
    assert work(client, e, "repair").status_code == 200
    assert work(client, e, "flush").status_code == 200
    assert sample(client, e, "S1").json()["clear_streak"] == 1
    assert sample(client, e, "S1").status_code == 409
    failed = sample(client, e, "S2", "failed")
    assert failed.status_code == 200
    assert failed.json()["clear_streak"] == 0
    assert failed.json()["job"]["flushed"] is False
    assert sample(client, e, "S3").status_code == 409
    assert work(client, e, "flush").status_code == 200
    assert sample(client, e, "S3").status_code == 200
    assert post(client, e, "clearance/approve").status_code == 409
    assert sample(client, e, "S4").json()["status"] == "clearance_pending"
    assert post(client, e, "clearance/approve").status_code == 409  # still low pressure
    assert reading(client, 45, 0).status_code == 201
    assert post(client, e, "clearance/approve", role="crew").status_code == 403
    closed = post(client, e, "clearance/approve")
    assert closed.status_code == 200
    body = closed.json()
    assert body["status"] == "closed"
    assert body["clearance"]["delivery"] == "simulated_only"
    assert [a["action"] for a in body["audit"]] == [
        "sustained_pressure_loss_detected", "advisory_approved", "job_approved",
        "repair_recorded", "flush_recorded", "sample_clear", "sample_failed",
        "flush_recorded", "sample_clear", "sample_clear", "clearance_approved",
    ]
    assert sample(client, e, "S5").status_code == 409
    assert work(client, e, "flush").status_code == 409
    assert post(client, e, "clearance/approve").status_code == 409


@pytest.mark.parametrize("role", ["crew", "ingest"])
def test_roles_cannot_approve_notice(client, role):
    e = event(client)
    assert post(client, e, "advisory/approve", role=role).status_code == 403


def test_validation_and_failed_mutation_rollback(client):
    e = assigned(client)
    assert work(client, e, "repair").status_code == 200
    assert work(client, e, "flush").status_code == 200
    before = client.get(f"{P}/events/{e['id']}").json()
    assert sample(client, e, " ").status_code == 422
    assert sample(client, e, "S1", "unknown").status_code == 422
    assert work(client, e, "operate-valve").status_code == 422
    assert client.get(f"{P}/events/{e['id']}").json() == before


def test_demo_scenario_and_explicit_reset(client):
    r = client.post(P + "/demo/scenario", headers=auth(), json={"segment_id": "CA-001"})
    assert r.status_code == 201
    assert r.json()["event"]["status"] == "detected"
    assert client.post(P + "/demo/scenario", headers=auth(), json={"segment_id": "CA-001"}).status_code == 409
    assert client.post(P + "/demo/reset", headers=auth("crew"), json={"confirm": "RESET DEMO"}).status_code == 403
    assert client.post(P + "/demo/reset", headers=auth(), json={"confirm": "yes"}).status_code == 422
    assert client.post(P + "/demo/reset", headers=auth(), json={"confirm": "RESET DEMO"}).status_code == 200
    assert client.get(P + "/events").json()["events"] == []
    assert client.get(P + "/network").json()["segments"][0]["telemetry_status"] == "missing"


def test_cors_only_configured_origins(client):
    headers = {"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"}
    assert client.options(P + "/readings", headers=headers).status_code == 200
    headers["Origin"] = "https://untrusted.example"
    response = client.options(P + "/readings", headers=headers)
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_stale_review_cannot_approve_or_overwrite_new_advisory(client):
    e = event(client)
    base = e['advisory']['draft']
    url = f"{P}/events/{e['id']}/advisory"
    changed = client.patch(url, json={'draft': 'SIMULATION ONLY: revised by another operator.', 'expected_draft': base}, headers=auth())
    assert changed.status_code == 200
    before = client.get(f"{P}/events/{e['id']}").json()
    assert client.post(url + '/approve', json={'expected_draft': base}, headers=auth()).status_code == 409
    assert client.patch(url, json={'draft': 'SIMULATION ONLY: stale overwrite attempt.', 'expected_draft': base}, headers=auth()).status_code == 409
    assert client.get(f"{P}/events/{e['id']}").json() == before
    assert client.post(url + '/approve', json={'expected_draft': before['advisory']['draft']}, headers=auth()).status_code == 200


@pytest.mark.parametrize("method,suffix", [("PATCH", ""), ("POST", "/approve")])
@pytest.mark.parametrize("expected", [None, 123, True, [], {}])
def test_advisory_requires_expected_draft_string(client, method, suffix, expected):
    e = event(client)
    url = f"{P}/events/{e['id']}/advisory{suffix}"
    body = {"draft": "SIMULATION ONLY: revised notice."} if method == "PATCH" else {}
    before = client.get(f"{P}/events/{e['id']}").json()
    assert client.request(method, url, json=body, headers=auth()).status_code == 422
    body["expected_draft"] = expected
    assert client.request(method, url, json=body, headers=auth()).status_code == 422
    assert client.get(f"{P}/events/{e['id']}").json() == before


@pytest.mark.parametrize("method,suffix", [("PATCH", ""), ("POST", "/approve")])
@pytest.mark.parametrize("padding", [" ", "\n", "\t"])
def test_advisory_expected_draft_is_not_trimmed(client, method, suffix, padding):
    e = event(client)
    body = {"expected_draft": padding + e["advisory"]["draft"] + padding}
    if method == "PATCH":
        body["draft"] = "SIMULATION ONLY: revised notice."
    before = client.get(f"{P}/events/{e['id']}").json()
    assert client.request(method, f"{P}/events/{e['id']}/advisory{suffix}",
                          json=body, headers=auth()).status_code == 409
    assert client.get(f"{P}/events/{e['id']}").json() == before


def test_concurrent_advisory_edits_are_atomic(client):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    e = event(client)
    url = f"{P}/events/{e['id']}/advisory"
    barrier = Barrier(2)

    def edit(index):
        barrier.wait(timeout=5)
        return client.patch(url, json={
            "draft": f"SIMULATION ONLY: competing revision {index}.",
            "expected_draft": e["advisory"]["draft"],
        }, headers=auth())

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(edit, range(2)))
    assert sorted(r.status_code for r in responses) == [200, 409]
    winner = next(r.json() for r in responses if r.status_code == 200)
    assert client.get(f"{P}/events/{e['id']}").json() == winner
    assert [a["action"] for a in winner["audit"]].count("advisory_edited") == 1
