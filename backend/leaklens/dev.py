"""Loopback-only demo launcher. Generated local tokens are never printed."""
import argparse
import json
import os
from pathlib import Path
import secrets

import uvicorn

from .api import create_app


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--token-file", type=Path, default=Path(".local-tokens.json"))
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be between 1024 and 65535")
    path = args.token_file
    if path.is_symlink():
        parser.error("token file must not be a symlink")
    if not path.exists():
        tokens = {r: secrets.token_urlsafe(32) for r in ("operator", "crew", "ingest")}
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as output:
            json.dump(tokens, output)
    path.chmod(0o600)
    tokens = json.loads(path.read_text())
    app = create_app(tokens=tokens)
    print(f"Simulation only. API docs: http://127.0.0.1:{args.port}/docs", flush=True)
    print(f"Local bearer tokens: {path.resolve()} (keep private)", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
