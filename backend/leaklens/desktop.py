"""Private stdin-configured, loopback-only runtime for the desktop shell."""
import json
from pathlib import Path
import secrets
import socket
import sys
import threading

from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

from leaklens.api import create_app

CSP = (
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
    "base-uri 'none'; object-src 'none'; frame-ancestors 'none'; "
    "form-action 'none'; worker-src 'none'"
)


def create_desktop_app(db_path, tokens, assets):
    """Reuse API semantics, with desktop-only origin and asset restrictions."""
    root = Path(assets).resolve(strict=True)
    if not root.is_dir() or not (root / 'index.html').is_file():
        raise ValueError('Desktop assets must contain index.html')
    tokens = dict(tokens)
    app = create_app(db_path=db_path, tokens=tokens)
    # Desktop has one exact origin. Never inherit development CORS grants.
    app.user_middleware = [m for m in app.user_middleware if m.cls is not CORSMiddleware]

    @app.middleware('http')
    async def local_only(request: Request, call_next):
        host = request.headers.get('host', '')
        server = request.scope.get('server')
        expected = getattr(app.state, 'desktop_host', None)
        if expected is None and server:
            expected = f'127.0.0.1:{server[1]}' if server[1] != 80 else '127.0.0.1'
        origin = request.headers.get('origin')
        forbidden = (
            host != expected or request.url.scheme != 'http'
            or (origin is not None and origin != f'http://{expected}')
            or request.headers.get('sec-fetch-site') in ('cross-site', 'same-site')
        )
        if forbidden:
            response = JSONResponse({'detail': 'Local origin required'}, status_code=403)
        else:
            response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['Content-Security-Policy'] = CSP
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        return response

    @app.get('/desktop/ready')
    def ready(request: Request):
        scheme, _, supplied = request.headers.get('authorization', '').partition(' ')
        role = next((role for role, token in tokens.items()
                     if secrets.compare_digest(token.encode(), supplied.encode())), None)
        if scheme.lower() != 'bearer' or role is None:
            raise HTTPException(401, 'Bearer token required', headers={'WWW-Authenticate': 'Bearer'})
        if role != 'operator':
            raise HTTPException(403, 'Role not permitted')
        state = app.state.store.read()
        return {'status': 'ok', 'mode': 'simulation', 'schema_version': state['schema_version']}

    @app.get('/{path:path}', include_in_schema=False)
    def asset(path: str):
        if path in ('', 'operations', 'crew'):
            path = 'index.html'
        parts = path.split('/')
        if (parts[0] in ('api', 'desktop') or any(p in ('', '.', '..') or p.startswith('.') for p in parts)
                or any(c in path for c in ('\\', '\x00', '%', ':'))):
            raise HTTPException(404)
        try:
            target = (root / path).resolve(strict=True)
            if not target.is_relative_to(root) or not target.is_file():
                raise HTTPException(404)
        except (OSError, ValueError, RuntimeError):
            raise HTTPException(404) from None
        return FileResponse(target)

    return app


def main():
    """Read one config line, announce bound port, and exit on parent pipe EOF."""
    try:
        line = sys.stdin.readline(65537)
        if len(line) > 65536 or not line.endswith('\n'):
            raise ValueError('Invalid configuration line')
        config = json.loads(line)
        if not isinstance(config, dict) or set(config) != {'db_path', 'tokens', 'assets'}:
            raise ValueError('Invalid configuration keys')
        if not all(isinstance(config[key], str) and config[key] for key in ('db_path', 'assets')):
            raise ValueError('Invalid paths')
        app = create_desktop_app(**config)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
            app.state.desktop_host = f'127.0.0.1:{port}'
            server = uvicorn.Server(uvicorn.Config(
                app, host='127.0.0.1', port=port, access_log=False,
                log_level='warning', proxy_headers=False, timeout_graceful_shutdown=3,
                loop='asyncio', http='h11', ws='none',
            ))

            def watch_parent():
                while sys.stdin.read(1):
                    pass
                server.should_exit = True

            threading.Thread(target=watch_parent, daemon=True).start()
            print(json.dumps({'port': port}), flush=True)
            server.run(sockets=[sock])
        return 0
    except Exception:
        # Configuration can contain credentials. Never echo inputs or tracebacks.
        print('LeakLens backend startup failed. Check configuration, assets and database access.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
