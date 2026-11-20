import os
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import events
from .models import Reading
from .network import network_view
from .store import Store


def create_app(db_path=None, tokens=None):
    roles = ("operator", "crew", "ingest")
    if tokens is None:
        tokens = {r: os.environ.get(f"LEAKLENS_{r.upper()}_TOKEN", "") for r in roles}
    if set(tokens) != set(roles) or any(not isinstance(t, str) or len(t) < 32 or not t.isascii() for t in tokens.values()) or len(set(tokens.values())) != len(roles):
        raise ValueError("Configure three distinct ASCII LEAKLENS_*_TOKEN values, each at least 32 characters")
    tokens = dict(tokens)
    store = Store(db_path or os.environ.get("LEAKLENS_DB", str(Path(__file__).parent.parent / "data/demo.sqlite3")))
    app = FastAPI(title="LeakLens Demo API", version="0.1.0", description="Fictional Water Quality prototype. No real notices or equipment controls. Not regulatory clearance.")
    app.state.store = store
    origins = [v.strip() for v in os.environ.get("LEAKLENS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if v.strip()]
    if "*" in origins:
        raise ValueError("Use explicit CORS origins, never wildcard")
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization", "Content-Type"])
    bearer = HTTPBearer(auto_error=False)

    def allow(*allowed):
        def check(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
            if credentials is None:
                raise HTTPException(401, "Bearer token required", headers={"WWW-Authenticate": "Bearer"})
            role = next((r for r, t in tokens.items() if secrets.compare_digest(t.encode(), credentials.credentials.encode())), None)
            if role is None:
                raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})
            if role not in allowed:
                raise HTTPException(403, "Role not permitted")
            return role
        return check

    @app.get("/health")
    def health():
        state = store.read()
        return {"status": "ok", "mode": "simulation", "schema_version": state["schema_version"]}

    @app.get("/api/v1/network")
    def network():
        return network_view(store.read())

    @app.get("/api/v1/events")
    def list_events():
        return {"simulated": True, "events": list(store.read()["events"].values())}

    @app.get("/api/v1/events/{event_id}")
    def detail(event_id: str):
        return events.get_event(store.read(), event_id)

    @app.post("/api/v1/readings", status_code=201)
    def ingest(body: Reading, actor=Depends(allow("ingest"))):
        return store.update(lambda state: events.ingest(state, body, actor))

    return app
