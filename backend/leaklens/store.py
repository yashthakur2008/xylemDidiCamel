"""Single demo state document, serialized with SQLite transactions across processes."""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .state_schema import PersistentState


def initial_state():
    return {"schema_version": 1, "readings": {}, "low_since": {}, "events": {}}


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)")
            db.execute("INSERT OR IGNORE INTO state VALUES (1, ?)", (json.dumps(initial_state()),))
        self.read()  # Fail visibly on incompatible/corrupt data; never silently discard incidents.

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def load(db):
        row = db.execute("SELECT data FROM state WHERE id=1").fetchone()
        if row is None:
            raise ValueError("Missing demo database state; restore from backup")
        try:
            PersistentState.model_validate_json(row[0])
        except ValueError as exc:
            raise ValueError("Unsupported/corrupt demo database; restore from backup") from exc
        return json.loads(row[0])

    def read(self):
        with self.connect() as db:
            return self.load(db)

    def update(self, operation):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self.load(db)
            result = operation(state)
            serialized = json.dumps(state, allow_nan=False)
            PersistentState.model_validate_json(serialized)
            db.execute("UPDATE state SET data=? WHERE id=1", (serialized,))
            return result
