"""Start real Uvicorn twice; exercise HTTP and prove restart persistence."""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time

import httpx

from smoke import exercise


def main():
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="leaklens-", dir=os.environ.get("JCODE_SCRATCH_DIR")) as temp:
        env = dict(os.environ)
        tokens = {r: secrets.token_urlsafe(32) for r in ("operator", "crew", "ingest")}
        env.update({f"LEAKLENS_{r.upper()}_TOKEN": t for r, t in tokens.items()})
        env["LEAKLENS_DB"] = str(Path(temp) / "acceptance.sqlite3")
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        url = f"http://127.0.0.1:{port}"
        packaged_python = os.environ.get("LEAKLENS_ACCEPTANCE_PYTHON")
        command = [packaged_python or sys.executable, "-m", "uvicorn", "leaklens.api:create_app", "--factory", "--host", "127.0.0.1", "--port", str(port)]

        def run(check):
            with open(Path(temp) / "server.log", "a+") as log:
                process = subprocess.Popen(command, cwd=temp if packaged_python else root, env=env, stdout=log, stderr=log)
                try:
                    deadline = time.monotonic() + 15
                    while time.monotonic() < deadline and process.poll() is None:
                        try:
                            if httpx.get(url + "/health", timeout=1).status_code == 200:
                                return check()
                        except httpx.TransportError:
                            pass
                        time.sleep(0.1)
                    log.seek(0)
                    raise RuntimeError("Server failed to start: " + log.read())
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()

        ident = run(lambda: exercise(url, tokens))

        def check_restart():
            response = httpx.get(url + "/api/v1/events/" + ident)
            assert response.status_code == 200
            assert response.json()["status"] == "closed"
            assert len(response.json()["samples"]) == 4
            assert response.json()["audit"][-1]["action"] == "clearance_approved"
            print("PASS: real process restart preserves closed incident, samples and audit trail")

        run(check_restart)


if __name__ == "__main__":
    main()
