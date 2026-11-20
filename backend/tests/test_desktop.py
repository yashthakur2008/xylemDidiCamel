"""Desktop runtime contract, shared by source and frozen smoke tests."""
import importlib.util
import json
import os
from queue import Queue
import threading
import subprocess
import sys
import time
import urllib.request

import pytest
from fastapi.testclient import TestClient

TOKENS = {role: role.ljust(40, '-') for role in ('operator', 'crew', 'ingest')}


@pytest.fixture
def client(tmp_path):
    assert importlib.util.find_spec('leaklens.desktop'), 'desktop runtime not implemented'
    from leaklens.desktop import create_desktop_app
    assets = tmp_path / 'assets'
    assets.mkdir()
    (assets / 'index.html').write_text('<html>desktop</html>')
    (assets / 'app.js').write_text('console.log("local")')
    (tmp_path / 'secret.txt').write_text('private')
    with TestClient(create_desktop_app(tmp_path / 'db.sqlite3', TOKENS, assets),
                    base_url='http://127.0.0.1:8765') as session:
        yield session


@pytest.mark.parametrize('path', ['/operations', '/crew', '/'])
def test_spa(client, path):
    response = client.get(path)
    assert response.status_code == 200
    assert response.text == '<html>desktop</html>'


def test_asset_and_security_headers(client):
    response = client.get('/app.js')
    assert response.status_code == 200
    assert 'console.log' in response.text
    assert response.headers['cache-control'] == 'no-store'
    csp = response.headers['content-security-policy']
    assert "default-src 'none'" in csp
    assert "connect-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert 'https:' not in csp and 'http:' not in csp
    assert response.headers['x-content-type-options'] == 'nosniff'


@pytest.mark.parametrize('path', ['/api/missing', '/api/v1/missing', '/unknown',
    '/%2e%2e/secret.txt', '/%252e%252e/secret.txt', '/..%5csecret.txt'])
def test_no_fallback_or_traversal(client, path):
    assert client.get(path).status_code == 404


def test_ready_authentication(client):
    assert client.get('/desktop/ready').status_code == 401
    assert client.get('/desktop/ready', headers={'Authorization': 'Bearer ' + TOKENS['crew']}).status_code == 403
    response = client.get('/desktop/ready', headers={'Authorization': 'Bearer ' + TOKENS['operator']})
    assert response.status_code == 200
    assert response.json()['mode'] == 'simulation'
    assert response.json()['status'] == 'ok'


@pytest.mark.parametrize('headers', [
    {'Host': 'attacker.example:8765'}, {'Host': 'localhost:8765'},
    {'Origin': 'https://attacker.example'}, {'Origin': 'null'},
    {'Origin': 'http://127.0.0.1:9999'}, {'Sec-Fetch-Site': 'cross-site'},
])
def test_cross_origin_read_rejected(client, headers):
    response = client.get('/api/v1/network', headers=headers)
    assert response.status_code == 403
    assert 'access-control-allow-origin' not in response.headers


def test_same_origin_existing_api(client):
    response = client.get('/api/v1/network', headers={'Origin': 'http://127.0.0.1:8765'})
    assert response.status_code == 200
    assert 'segments' in response.json()


@pytest.mark.parametrize('frozen', [False, True])
@pytest.mark.parametrize('shutdown', ['eof', 'terminate'])
def test_process_protocol_and_eof(tmp_path, frozen, shutdown):
    executable = os.environ.get('LEAKLENS_FROZEN_EXECUTABLE')
    if frozen and not executable:
        pytest.skip('Set LEAKLENS_FROZEN_EXECUTABLE to exercise the built executable')
    assets = tmp_path / 'assets'
    assets.mkdir()
    (assets / 'index.html').write_text('packaged UI')
    command = [executable] if frozen else [sys.executable, '-m', 'leaklens.desktop']
    env = dict(os.environ, PATH='') if frozen else os.environ.copy()
    with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True, env=env) as child:
        try:
            child.stdin.write(json.dumps({'db_path': str(tmp_path / 'demo.db'),
                'tokens': TOKENS, 'assets': str(assets)}) + '\n')
            child.stdin.flush()
            lines = Queue()
            threading.Thread(target=lambda: lines.put(child.stdout.readline()), daemon=True).start()
            line = lines.get(timeout=20)
            assert line, 'Child exited without port announcement'
            info = json.loads(line)
            assert set(info) == {'port'} and 0 < info['port'] < 65536
            origin = f"http://127.0.0.1:{info['port']}"
            request = urllib.request.Request(origin + '/desktop/ready',
                headers={'Authorization': 'Bearer ' + TOKENS['operator']})
            for attempt in range(100):
                try:
                    with urllib.request.urlopen(request, timeout=1) as response:
                        assert json.load(response)['mode'] == 'simulation'
                    break
                except OSError:
                    time.sleep(.05)
            else:
                pytest.fail('Readiness never succeeded')
            with urllib.request.urlopen(origin + '/operations') as response:
                assert response.read() == b'packaged UI'
            scenario = urllib.request.Request(origin + '/api/v1/demo/scenario',
                data=json.dumps({'segment_id': 'CA-001'}).encode(),
                headers={'Authorization': 'Bearer ' + TOKENS['operator'],
                         'Content-Type': 'application/json'})
            with urllib.request.urlopen(scenario) as response:
                assert response.status == 201
            with urllib.request.urlopen(origin + '/api/v1/events') as response:
                assert len(json.load(response)['events']) == 1
            if shutdown == 'eof':
                child.stdin.close()
                assert child.wait(timeout=10) == 0
            else:
                child.terminate()
                child.wait(timeout=10)
            output = child.stdout.read() + child.stderr.read()
            assert 'Fatal Python error' not in output
            assert not any(token in output for token in TOKENS.values())
            assert (tmp_path / 'demo.db').is_file()
        finally:
            if child.poll() is None:
                child.kill()
                child.wait()


@pytest.mark.parametrize('payload', [
    '{}\n', 'not-json\n', '{"tokens":"private-test-marker"}\n',
    '{"db_path":"private-test-marker"}',
])
def test_invalid_config_fails_without_echoing_inputs(payload):
    result = subprocess.run([sys.executable, '-m', 'leaklens.desktop'],
                            input=payload, text=True, capture_output=True, timeout=10)
    assert result.returncode == 1
    assert result.stdout == ''
    assert 'startup failed' in result.stderr
    assert 'private-test-marker' not in result.stderr


def test_eof_during_startup(tmp_path):
    (tmp_path / 'index.html').write_text('desktop')
    result = subprocess.run([sys.executable, '-m', 'leaklens.desktop'], input=json.dumps({
        'db_path': str(tmp_path / 'demo.db'), 'tokens': TOKENS, 'assets': str(tmp_path),
    }) + '\n', text=True, capture_output=True, timeout=10)
    assert result.returncode == 0
    assert 'Fatal Python error' not in result.stderr


def test_preflight_does_not_inherit_development_cors(client):
    response = client.options('/api/v1/network', headers={
        'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'GET',
    })
    assert response.status_code == 403
    assert 'access-control-allow-origin' not in response.headers


def test_api_namespace_never_serves_files(client):
    root = client.app.state.store.path.parent / 'assets'
    (root / 'api').mkdir()
    (root / 'api' / 'private.json').write_text('{"private":true}')
    assert client.get('/api/private.json').status_code == 404


def test_wrong_port_host_rejected(client):
    response = client.get('/api/v1/network', headers={'Host': '127.0.0.1:9999'})
    assert response.status_code == 403


def test_symlink_escape_rejected(client):
    root = client.app.state.store.path.parent / 'assets'
    try:
        (root / 'escape.txt').symlink_to(root.parent / 'secret.txt')
    except OSError:
        pytest.skip('Symlink creation requires platform privileges')
    assert client.get('/escape.txt').status_code == 404
