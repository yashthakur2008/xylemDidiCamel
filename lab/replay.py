"""Offline analysis using real LeakLens ingestion. No server, store or hardware access."""
import argparse
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import html
import io
import json
import math
from pathlib import Path
import sys

# Use current source, never the stale backend/build/lib copy or an installed wheel.
BACKEND = Path(__file__).resolve().parents[1] / 'backend'
sys.path.insert(0, str(BACKEND))
from leaklens import events  # noqa: E402
from leaklens.models import Reading  # noqa: E402
from leaklens.network import POLICY, SEGMENTS  # noqa: E402

COLUMNS = ['trace_id', 'scenario', 'segment_id', 'elapsed_s', 'pressure_psi', 'sample_status', 'source_id']
MAX_ELAPSED = 110.0  # 1 second offset plus 9 seconds headroom inside freshness=120.
MAX_ROWS = 10000
CONTRACT = {'pressure_threshold_psi': 20, 'minimum_low_duration_seconds': 5,
            'maximum_reading_gap_seconds': 30, 'freshness_seconds': 120}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def csv_cell(value):
    """Neutralize formula prefixes in derived CSV only, not source/JSON labels."""
    if isinstance(value, list):
        value = json.dumps(value)
    if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')):
        return "'" + value
    return value


def parse(raw):
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), strict=True)
    if reader.fieldnames != COLUMNS:
        raise ValueError('CSV header must be exactly: ' + ','.join(COLUMNS))
    rows, previous, scenarios = [], {}, {}
    for line, row in enumerate(reader, 2):
        if len(rows) >= MAX_ROWS:
            raise ValueError(f'Maximum {MAX_ROWS} rows per file')
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f'Row {line}: wrong field count')
        row = {key: value.strip() for key, value in row.items()}
        if any(not row[key] for key in ('trace_id', 'scenario', 'source_id')):
            raise ValueError(f'Row {line}: identifiers must not be blank')
        if row['segment_id'] not in {s['id'] for s in SEGMENTS}:
            raise ValueError(f'Row {line}: unknown fictional segment')
        elapsed = float(row['elapsed_s'])
        if not math.isfinite(elapsed) or not 0 <= elapsed <= MAX_ELAPSED:
            raise ValueError(f'Row {line}: elapsed_s must be finite, 0..{MAX_ELAPSED}; no time compression')
        key = (row['trace_id'], row['segment_id'])
        if elapsed <= previous.get(key, -1):
            raise ValueError(f'Row {line}: elapsed_s must strictly increase per trace/segment')
        previous[key] = elapsed
        if scenarios.setdefault(row['trace_id'], row['scenario']) != row['scenario']:
            raise ValueError(f'Row {line}: scenario must be constant per trace')
        status = row['sample_status']
        if status not in ('observed', 'missing') or (status == 'missing') != (row['pressure_psi'] == ''):
            raise ValueError(f'Row {line}: observed requires psi; missing requires blank psi')
        pressure = None if status == 'missing' else float(row['pressure_psi'])
        if pressure is not None and (not math.isfinite(pressure) or not 0 <= pressure <= 300):
            raise ValueError(f'Row {line}: psi must be finite and 0..300')
        rows.append({**row, 'elapsed_s': elapsed, 'pressure_psi': pressure})
    if not rows:
        raise ValueError('Empty trace file')
    return rows


def expectations(raw, keys):
    if raw is None:
        return {}
    document = json.loads(raw)
    result = {}
    for row in document['results']:
        key = (row['trace_id'], row['segment_id'])
        if key in result:
            raise ValueError('Duplicate preregistered condition')
        count = row['alert_count']
        if type(count) is not int or count < 0:
            raise ValueError('Expected alert_count must be a nonnegative integer')
        for field in ('detection_elapsed_s', 'low_since_elapsed_s'):
            if len(row[field]) != count or any(type(t) not in (int, float) or not math.isfinite(t) or not 0 <= t <= MAX_ELAPSED for t in row[field]):
                raise ValueError('Expected times must be finite, in bounds and match alert_count')
        result[key] = row
    if set(result) != keys:
        raise ValueError('Preregistration must cover exactly every trace/segment')
    return result


def analyze(path, expected_path=None, *, evidence_kind='synthetic', source_note='unspecified'):
    """Each call and trace gets fresh dictionaries. No persistent state is opened."""
    raw = Path(path).read_bytes()
    expected_raw = Path(expected_path).read_bytes() if expected_path else None
    return analyze_bytes(raw, expected_raw, evidence_kind=evidence_kind, source_note=source_note)


def analyze_bytes(raw, expected_raw=None, *, evidence_kind, source_note):
    if any(POLICY.get(k) != v for k, v in CONTRACT.items()):
        raise ValueError('Backend detector policy changed; revise and preregister the protocol first')
    rows = parse(raw)
    expected = expectations(expected_raw, {(r['trace_id'], r['segment_id']) for r in rows})
    results, bases = [], {}
    for trace in dict.fromkeys(r['trace_id'] for r in rows):
        points = sorted((r for r in rows if r['trace_id'] == trace), key=lambda r: r['elapsed_s'])
        # Historical elapsed times become recent observations, with intervals unchanged.
        base = datetime.now(timezone.utc) - timedelta(seconds=points[-1]['elapsed_s'] + 1)
        bases[trace] = base.isoformat()
        state = {'schema_version': 1, 'readings': {}, 'low_since': {}, 'events': {}}
        summaries = {}
        seen = set()
        for point in points:
            segment = point['segment_id']
            summary = summaries.setdefault(segment, {
                'trace_id': trace, 'scenario': point['scenario'], 'segment_id': segment,
                'sample_count': 0, 'ingested_count': 0, 'missing_count': 0, 'alert_count': 0,
                'detection_elapsed_s': [], 'low_since_elapsed_s': [], 'expectation_match': None})
            summary['sample_count'] += 1
            if point['pressure_psi'] is None:
                summary['missing_count'] += 1
                continue  # No artificial zero, interpolation or call to ingest.
            reading = Reading(segment_id=segment, pressure_psi=point['pressure_psi'],
                              observed_at=base + timedelta(seconds=point['elapsed_s']))
            response = events.ingest(state, reading, 'ingest')
            summary['ingested_count'] += 1
            event = response['event']
            if event is not None and event['id'] not in seen:
                seen.add(event['id'])
                summary['alert_count'] += 1
                summary['detection_elapsed_s'].append(point['elapsed_s'])
                summary['low_since_elapsed_s'].append(round((datetime.fromisoformat(event['low_pressure_since']) - base).total_seconds(), 6))
        for segment, summary in summaries.items():
            if expected:
                goal = expected[(trace, segment)]
                summary['expectation_match'] = all(summary[k] == goal[k] for k in ('alert_count', 'detection_elapsed_s', 'low_since_elapsed_s'))
            results.append(summary)
    return {'schema_version': 1, 'policy': dict(POLICY), 'results': results, 'points': rows,
            'provenance': {'raw_sha256': sha(raw), 'expected_sha256': sha(expected_raw) if expected_raw else None,
                           'evidence_kind': evidence_kind, 'source_note': source_note,
                           'analyzed_at_utc': datetime.now(timezone.utc).isoformat(),
                           'rebase_origin_utc_by_trace': bases, 'max_elapsed_s': MAX_ELAPSED,
                           'backend_source_sha256': {name: sha((BACKEND / 'leaklens' / name).read_bytes())
                                                     for name in ('events.py', 'network.py', 'models.py')},
                           'analysis_source_sha256': {name: sha((Path(__file__).parent / name).read_bytes())
                                                      for name in ('replay.py', 'PROTOCOL.md')},
                           'timing_contract': 'Detection times are triggering sample elapsed_s, NOT wall-clock latency; historical replay does not test original freshness.'}}


def chart(result):
    """Standalone SVG, broken lines at missing observations, per-condition axes."""
    panels = result['results']
    height = 80 + 245 * len(panels)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{height}" viewBox="0 0 1000 {height}">',
           '<style>text{font:13px sans-serif} .small{font-size:11px}</style>',
           '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="40" y="25">Confluence / LeakLens offline replay: {html.escape(result["provenance"]["evidence_kind"])}</text>',
           '<text x="40" y="48">Trace-relative detection times, not wall-clock latency. Dashed threshold. Missing observations are not ingested.</text>']
    for index, summary in enumerate(panels):
        top = 85 + index * 245
        points = [p for p in result['points'] if (p['trace_id'], p['segment_id']) == (summary['trace_id'], summary['segment_id'])]
        xmax = max(1, max(p['elapsed_s'] for p in points))
        ymax = max(50, max((p['pressure_psi'] or 0) for p in points) * 1.1)
        x = lambda t: 85 + 770 * t / xmax
        y = lambda psi: top + 155 - 130 * psi / ymax
        title = html.escape(f'{summary["trace_id"]} / {summary["scenario"]} / {summary["segment_id"]} | alerts={summary["alert_count"]} | expected match={summary["expectation_match"]}')
        out.extend([f'<text x="40" y="{top}">{title}</text>',
                    f'<path d="M85 {top+20} V{top+155} H855" fill="none" stroke="#333"/>',
                    f'<path d="M85 {y(20)} H855" stroke="#a66" stroke-dasharray="5 4"/>',
                    f'<text x="865" y="{y(20)}">20 psi</text>',
                    f'<text x="40" y="{top+25}">psi</text>',
                    f'<text x="40" y="{top+155}">0</text>',
                    f'<text x="85" y="{top+195}">0</text>',
                    f'<text x="400" y="{top+195}">elapsed seconds</text>',
                    f'<text x="830" y="{top+195}">{xmax:g}</text>'])
        previous = None
        previous_observed_s = None
        for point in points:
            px = x(point['elapsed_s'])
            psi = point['pressure_psi']
            if psi is None:
                out.append(f'<text class="small" x="{px}" y="{top+177}" fill="#a60">Missing t={point["elapsed_s"]:g}</text>')
                previous = None
                continue
            py = y(psi)
            gap = None if previous_observed_s is None else point['elapsed_s'] - previous_observed_s
            continuity_reset = gap is not None and gap > POLICY['maximum_reading_gap_seconds']
            if continuity_reset:
                label_x = min(x((previous_observed_s + point['elapsed_s']) / 2), 650)
                out.append(f'<text class="small" x="{label_x}" y="{top+215}" fill="#a60">Gap {gap:g}s: continuity reset</text>')
            if previous and not continuity_reset:
                out.append(f'<path d="M{previous[0]} {previous[1]} L{px} {py}" stroke="#147d92" fill="none"/>')
            out.append(f'<circle cx="{px}" cy="{py}" r="3" fill="#147d92"><title>t={point["elapsed_s"]:g}, {psi:g} psi</title></circle>')
            previous = (px, py)
            previous_observed_s = point['elapsed_s']
        for detection, low in zip(summary['detection_elapsed_s'], summary['low_since_elapsed_s']):
            out.append(f'<path d="M{x(detection)} {top+25} V{top+155}" stroke="#c33" stroke-dasharray="3 3"/>')
            out.append(f'<text x="{min(x(detection)+5, 650)}" y="{top+20}" fill="#b22">Alert t={detection:g}, low since t={low:g}</text>')
    return '\n'.join(out + ['</svg>']) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    parser.add_argument('--expected', type=Path, help='Frozen preregistered condition outcomes JSON')
    parser.add_argument('--out', required=True, type=Path, help='New output directory, never overwritten')
    parser.add_argument('--evidence-kind', required=True, choices=['synthetic', 'internal-teammate', 'supervised-lab'])
    parser.add_argument('--source-note', required=True, help='Acquisition/source context, not personal information')
    args = parser.parse_args(argv)
    try:
        if args.out.exists():
            raise ValueError('Output already exists; choose a new run directory')
        raw = args.csv.read_bytes()
        expected_raw = args.expected.read_bytes() if args.expected else None
        result = analyze_bytes(raw, expected_raw, evidence_kind=args.evidence_kind, source_note=args.source_note)
        args.out.mkdir(parents=True, exist_ok=False)
        (args.out / 'raw.csv').write_bytes(raw)
        if expected_raw is not None:
            (args.out / 'expected.json').write_bytes(expected_raw)
        (args.out / 'results.json').write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
        with (args.out / 'results.csv').open('w', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=list(result['results'][0]))
            writer.writeheader()
            for row in result['results']:
                writer.writerow({k: csv_cell(v) for k, v in row.items()})
        (args.out / 'chart.svg').write_text(chart(result), encoding='utf-8')
        print(f'{len(result["results"])} conditions analyzed -> {args.out}')
        return 1 if any(r['expectation_match'] is False for r in result['results']) else 0
    except (ValueError, KeyError, TypeError, OSError, csv.Error, events.HTTPException) as exc:
        parser.exit(2, f'Replay failed: {exc}\n')


if __name__ == '__main__':
    sys.exit(main())
