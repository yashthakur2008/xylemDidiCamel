"""Synthetic software tests, not measured lab or operator-validation evidence."""
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from lab import replay

FIXTURE = Path(__file__).parent / 'fixtures/synthetic.csv'
EXPECTED = FIXTURE.with_name('expected.json')


class ReplayTests(unittest.TestCase):
    def test_preregistered_synthetic_conditions(self):
        result = replay.analyze(FIXTURE, EXPECTED)
        self.assertTrue(all(r['expectation_match'] for r in result['results']))
        main = next(r for r in result['results'] if r['trace_id'] == 'sustained')
        self.assertEqual(main['detection_elapsed_s'], [6.0])
        self.assertEqual(main['low_since_elapsed_s'], [1.0])
        self.assertEqual(main['alert_count'], 1)
        self.assertEqual(result['provenance']['raw_sha256'], hashlib.sha256(FIXTURE.read_bytes()).hexdigest())

    def test_missing_never_ingested_and_states_are_isolated(self):
        first = replay.analyze(FIXTURE, EXPECTED)
        second = replay.analyze(FIXTURE, EXPECTED)
        self.assertEqual(first['results'], second['results'])
        missing = next(r for r in first['results'] if r['trace_id'] == 'missing')
        self.assertEqual(missing['missing_count'], 1)
        self.assertEqual(missing['ingested_count'], 4)
        self.assertEqual(missing['detection_elapsed_s'], [37.0])

    def test_invalid_input_rejected(self):
        cases = [
            [('0', 'nan', 'observed')], [('0', '301', 'observed')],
            [('0', '', 'observed')], [('0', '12', 'missing')],
            [('0', '45', 'observed'), ('120', '12', 'observed')],
            [('0', '45', 'observed'), ('0', '12', 'observed')],
            [('-1', '45', 'observed')], [('0', '12', 'bad')],
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.csv'
            for rows in cases:
                with self.subTest(rows=rows):
                    with path.open('w', newline='') as stream:
                        writer = csv.writer(stream)
                        writer.writerow(replay.COLUMNS)
                        writer.writerows(['bad', 'test', 'CA-001', t, p, s, 'synthetic'] for t, p, s in rows)
                    with self.assertRaises(ValueError):
                        replay.analyze(path)

    def test_real_ingest_receives_preserved_intervals_without_database_access(self):
        original = replay.events.ingest
        calls = []

        def observe(state, reading, actor):
            calls.append((state, reading))
            return original(state, reading, actor)

        with patch('sqlite3.connect', side_effect=AssertionError('Database forbidden')):
            with patch.object(replay.events, 'ingest', side_effect=observe):
                result = replay.analyze(FIXTURE, EXPECTED)
        self.assertEqual(len(calls), sum(r['ingested_count'] for r in result['results']))
        self.assertEqual(len({id(state) for state, reading in calls}), 7)
        main = [reading for state, reading in calls if state is calls[0][0]]
        self.assertEqual([(r.observed_at - main[0].observed_at).total_seconds() for r in main], [0, 1, 6, 10, 11])
        self.assertEqual([r.pressure_psi for r in main], [45, 12, 12, 12, 45])
        for state, reading in calls:
            self.assertTrue(0 <= (datetime.now(timezone.utc) - reading.observed_at).total_seconds() <= 120)

    def test_real_freshness_guard_is_not_disabled(self):
        state = {'readings': {}, 'events': {}, 'low_since': {}}
        reading = replay.Reading(segment_id='CA-001', pressure_psi=12.0,
                                 observed_at=datetime.now(timezone.utc) - timedelta(seconds=121))
        with self.assertRaises(replay.events.HTTPException) as caught:
            replay.events.ingest(state, reading, 'ingest')
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(state['readings'], {})

    def test_all_missing_and_multiple_segments_are_independent(self):
        raw = (','.join(replay.COLUMNS) + '\n' +
               'x,test,CA-001,0,,missing,synthetic\n' +
               'x,test,CA-002,0,12,observed,synthetic\n' +
               'x,test,CA-002,5,12,observed,synthetic\n' +
               'x,test,CA-001,110,,missing,synthetic\n').encode()
        result = replay.analyze_bytes(raw, evidence_kind='synthetic', source_note='test')
        self.assertEqual([r['alert_count'] for r in result['results']], [0, 1])
        self.assertEqual(result['results'][0]['ingested_count'], 0)
        self.assertTrue(all(r['expectation_match'] is None for r in result['results']))
        ET.fromstring(replay.chart(result))

    def test_policy_drift_and_incomplete_preregistration_fail(self):
        with patch.dict(replay.POLICY, pressure_threshold_psi=21):
            with self.assertRaises(ValueError):
                replay.analyze(FIXTURE, EXPECTED)
        with self.assertRaises(ValueError):
            replay.analyze_bytes(FIXTURE.read_bytes(), b'{"results": []}',
                                 evidence_kind='synthetic', source_note='test')

    def test_mismatch_is_exit_one_with_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            expected = json.loads(EXPECTED.read_text())
            expected['results'][0]['detection_elapsed_s'] = [7]
            path = Path(directory) / 'expected.json'
            path.write_text(json.dumps(expected))
            output = Path(directory) / 'run'
            code = replay.main([str(FIXTURE), '--expected', str(path), '--out', str(output),
                                '--evidence-kind', 'synthetic', '--source-note', 'mismatch test'])
            self.assertEqual(code, 1)
            result = json.loads((output / 'results.json').read_text())
            self.assertFalse(result['results'][0]['expectation_match'])
            self.assertEqual(result['provenance']['expected_sha256'], hashlib.sha256(path.read_bytes()).hexdigest())

    def test_cli_artifacts_preserve_raw_and_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'run'
            command = [sys.executable, '-m', 'lab.replay', str(FIXTURE), '--expected', str(EXPECTED),
                       '--out', str(output), '--evidence-kind', 'synthetic', '--source-note', 'unit test fixture']
            run = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual((output / 'raw.csv').read_bytes(), FIXTURE.read_bytes())
            result = json.loads((output / 'results.json').read_text())
            self.assertEqual(result['provenance']['evidence_kind'], 'synthetic')
            self.assertEqual((output / 'expected.json').read_bytes(), EXPECTED.read_bytes())
            svg = (output / 'chart.svg').read_text()
            self.assertIn('t=6', svg)
            self.assertIn('Missing', svg)
            self.assertIn('20 psi', svg)
            ET.fromstring(svg)
            with (output / 'results.csv').open() as stream:
                rows = list(csv.DictReader(stream))
            self.assertEqual(json.loads(rows[0]['detection_elapsed_s']), [6.0])
            self.assertTrue((output / 'results.csv').is_file())
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)


if __name__ == '__main__':
    unittest.main()
