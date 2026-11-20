"""Creation-time provenance, including packaged sources when they are readable."""
import hashlib
import json
from importlib import metadata, resources

SOURCE_FILES = (
    'evaluation.py', 'evaluation_models.py', 'evaluation_schema.py', 'evaluation_provenance.py',
    'evaluation_timing.py',
    'events.py', 'network.py', 'workflow.py', 'models.py', 'state_schema.py', 'store.py',
)


def provenance(trace):
    try:
        version = metadata.version('leaklens-backend')
        version_source = 'package_metadata:leaklens-backend'
    except metadata.PackageNotFoundError:
        version, version_source = None, 'unavailable'
    hashes = {}
    for name in SOURCE_FILES:
        try:
            source = resources.files('leaklens').joinpath(name).read_bytes()
            hashes[name] = {'status': 'available', 'sha256': hashlib.sha256(source).hexdigest(), 'reason': None}
        except (OSError, TypeError):
            hashes[name] = {'status': 'unavailable', 'sha256': None,
                            'reason': 'Packaged source is absent or unreadable; no source hash inferred.'}
    return {'schema_version': 1, 'provenance_status': 'recorded_at_creation',
            'app_version': version, 'app_version_source': version_source,
            'trace_hash': hashlib.sha256(json.dumps(trace, separators=(',', ':')).encode()).hexdigest(),
            'source_hashes': hashes}
