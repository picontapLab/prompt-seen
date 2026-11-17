import collections
import hashlib
import json
import sys
from pathlib import Path

root = Path('/tmp/prompt-seen-language-review')
expected = {}
mode = sys.argv[1] if len(sys.argv) > 1 else 'root'
preview = mode == 'subpath-preview'
selected = None if mode == 'root' else set((root / ('subpath-preview-selected.txt' if preview else 'subpath-production-final-selected.txt')).read_text().splitlines())


def visit(suite, parents=()):
    title = suite.get('title')
    names = parents + ((title,) if title and not title.endswith('.spec.ts') else ())
    for spec in suite.get('specs', []):
        name = ' › '.join((*names, spec['title']))
        file = f"tests/e2e/{spec['file']}"
        for test in spec['tests']:
            project = test['projectName']
            identity = hashlib.sha256(f'{project}\n{file}\n{name}'.encode()).hexdigest()[:16]
            if selected is None or f"[{project}] › {spec['file']} › {name}" in selected:
                expected[identity] = {'project': project, 'file': file, 'title': name}
    for child in suite.get('suites', []):
        visit(child, names)


visit(json.loads((root / ('all-reviewed-root-tests.json' if mode == 'root' else ('all-subpath-preview-tests.json' if preview else 'all-subpath-production-final-tests.json'))).read_text()))
latest = {}
history = collections.defaultdict(list)
reports = ['e2e-root-initial', 'e2e-root-resume', 'e2e-root-final', 'e2e-popup-layout-repeat', 'e2e-language-roundtrip-final', 'e2e-firefox-language-repeat', 'e2e-root-popup-takeover']
if mode != 'root':
    reports = (['e2e-subpath-preview', 'e2e-subpath-preview-final'] if preview else ['e2e-subpath-production', 'e2e-subpath-production-popup-final'])
for label in reports:
    report = root / label / 'reliability.json'
    if not report.exists():
        continue
    for test in json.loads(report.read_text())['tests']:
        if test['id'] not in expected or not test['attempts']:
            continue
        item = {'report': label, **test}
        latest[test['id']] = item
        history[test['id']].append({'report': label, 'outcome': test['outcome'], 'attempts': test['attempts']})

missing = [expected[key] for key in expected if key not in latest]
unresolved = [test for test in latest.values() if test['outcome'] not in ['expected', 'skipped']]
counts = collections.Counter(test['outcome'] for test in latest.values())
result = {
    'expectedUniqueTests': len(expected),
    'latestOutcomes': dict(counts),
    'missing': missing,
    'unresolved': unresolved,
    'coverageMethod': f'{mode} regression coverage assembled by stable test identity across the initial and resumed runs, followed by affected-test reruns on recorded candidates. The final pending-close fix is verified in the subpath-preview rerun. This is not a claim that all tests ran once against the final artifact.',
    'sourceArtifacts': {'e2e-root-initial': 'be25c47b-root', 'e2e-root-resume': '0af7dbe6-root', 'firstFinalAffectedReruns': '8f4a44bc-root', 'takeoverRerun': '790dc273-root'},
    'reports': reports,
    'resolvedFailuresAndFlakes': [{**expected[key], 'attemptHistory': values} for key, values in history.items() if any(item['outcome'] in ['unexpected', 'flaky'] for item in values)],
}
if mode != 'root':
    result['sourceArtifacts'] = {'initialSelectedRun': '58855cb2-subpath-production', 'finalAffectedRerun': '790dc273-subpath-production'}
if preview:
    result['sourceArtifacts'] = {'initialSelectedRun': '790dc273-subpath-preview', 'finalAffectedRerun': json.loads((root / 'e2e-subpath-preview-final' / 'build.json').read_text())['buildId']}
(root / f'{mode}-coverage-summary.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'uniqueTests': len(expected), 'latestOutcomes': dict(counts), 'missing': len(missing), 'unresolved': len(unresolved)}))
