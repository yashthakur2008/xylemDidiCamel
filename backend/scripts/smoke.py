"""Run the real API demo, including failure/recovery. Resets demo data explicitly."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.parse import urlparse

import httpx

P = "/api/v1"


def exercise(base_url, tokens):
    with httpx.Client(base_url=base_url, timeout=10) as client:
        def call(method, path, body=None, role=None, expected=200):
            headers = {"Authorization": "Bearer " + tokens[role]} if role else {}
            response = client.request(method, path, json=body, headers=headers)
            assert response.status_code == expected, (method, path, response.status_code, response.text)
            return response.json()

        assert call("GET", "/health")["mode"] == "simulation"
        assert "/api/v1/readings" in call("GET", "/openapi.json")["paths"]
        call("POST", P + "/demo/reset", {"confirm": "RESET DEMO"}, "crew", 403)
        call("POST", P + "/demo/reset", {"confirm": "RESET DEMO"}, "operator")
        assert call("GET", P + "/network")["segments"][0]["telemetry_status"] == "missing"
        e = call("POST", P + "/demo/scenario", {"segment_id": "CA-001"}, "operator", 201)["event"]
        prefix = f"{P}/events/{e['id']}"
        call("POST", prefix + "/job/approve", {"crew": "Demo-Crew"}, "operator", 409)
        call("POST", prefix + "/advisory/approve", {"expected_draft": e["advisory"]["draft"]}, role="crew", expected=403)
        e = call("PATCH", prefix + "/advisory", {"expected_draft": e["advisory"]["draft"], "draft": "SIMULATION ONLY: proposed advisory, subject to operator/regulatory review. Not for distribution."}, "operator")
        assert call("POST", prefix + "/advisory/approve", {"expected_draft": e["advisory"]["draft"]}, role="operator")["advisory"]["delivery"] == "simulated_only"
        call("POST", prefix + "/job/approve", {"crew": "Demo-Crew"}, "operator")
        call("POST", prefix + "/work", {"step": "repair"}, "crew")
        call("POST", prefix + "/work", {"step": "flush"}, "crew")
        call("POST", prefix + "/samples", {"sample_id": "SMOKE-1", "result": "clear"}, "crew")
        call("POST", prefix + "/samples", {"sample_id": "SMOKE-1", "result": "clear"}, "crew", 409)
        assert call("POST", prefix + "/samples", {"sample_id": "SMOKE-2", "result": "failed"}, "crew")["clear_streak"] == 0
        call("POST", prefix + "/samples", {"sample_id": "SMOKE-3", "result": "clear"}, "crew", 409)
        call("POST", prefix + "/work", {"step": "flush"}, "crew")
        call("POST", prefix + "/samples", {"sample_id": "SMOKE-3", "result": "clear"}, "crew")
        call("POST", prefix + "/clearance/approve", role="operator", expected=409)
        call("POST", prefix + "/samples", {"sample_id": "SMOKE-4", "result": "clear"}, "crew")
        call("POST", prefix + "/clearance/approve", role="operator", expected=409)
        call("POST", P + "/readings", {"segment_id": "CA-001", "pressure_psi": 45,
             "observed_at": datetime.now(timezone.utc).isoformat()}, "ingest", 201)
        call("POST", prefix + "/clearance/approve", role="crew", expected=403)
        closed = call("POST", prefix + "/clearance/approve", role="operator")
        assert closed["status"] == "closed" and not closed["clearance"]["regulatory_clearance"]
        assert len(closed["samples"]) == 4
        call("POST", prefix + "/clearance/approve", role="operator", expected=409)
        print("PASS: live HTTP risk → pressure loss → approvals → failed sample → reflush → two clears → operator clearance")
        print("PASS: role denial, duplicate samples, premature clearance and closed-event guards")
        return closed["id"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--tokens", type=Path, default=Path(".local-tokens.json"))
    parser.add_argument("--reset-demo", action="store_true", required=True, help="acknowledge deletion of existing demo incidents")
    args = parser.parse_args()
    if urlparse(args.url).hostname not in ("127.0.0.1", "localhost", "::1"):
        parser.error("smoke runner only sends local demo tokens to loopback")
    exercise(args.url, json.loads(args.tokens.read_text()))
