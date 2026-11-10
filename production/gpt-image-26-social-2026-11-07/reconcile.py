"""Derive coverage from actual applied records; preserve every blocked source."""
import hashlib
import json
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent.parent
JOBS = ROOT / '.artifacts/content-production' / BASE.name / 'jobs'


def read(file):
    return json.loads(file.read_text())


def write(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


plan = read(BASE / 'import-plan.json')
manifest = read(BASE / 'sources/manifest-v3.json')
mapping = []
coverage = []
for case in plan['cases']:
    cid = case['case_id']
    units = []
    for source in [s for s in manifest if s['caseId'] == cid]:
        uid = source['unitId']
        candidate = 'gpt26-social-' + uid.lower()
        attempt_states = []
        for state_file in sorted(JOBS.glob(candidate + '-original*/job.json')):
            state = read(state_file)
            key = state['definition']['key']
            applied_file = ROOT / 'production/applied' / (key + '.json')
            applied = read(applied_file) if applied_file.exists() else None
            audit = BASE / 'audit/jobs' / key
            write(audit / 'state.json', state)
            if not applied and state.get('receipt'):
                src = Path(state['receipt']['output']['path'])
                dest = audit / ('returned' + src.suffix)
                if not dest.exists():
                    shutil.copy2(src, dest)
            attempt_states.append({'key': key, 'state': state, 'applied': applied})
        attempt_states.sort(key=lambda a: a['state'].get('claimedAt') or '')
        selected = next((a for a in reversed(attempt_states) if a['applied']), attempt_states[-1] if attempt_states else None)
        key = selected['key'] if selected else candidate + '-original'
        state = selected['state'] if selected else None
        applied = selected['applied'] if selected else None
        reason = None
        if applied:
            status = 'accepted'
        elif state and state.get('failure'):
            status, reason = 'blocked', 'provider-rejected-original-prompt'
        elif cid.startswith('G'):
            status, reason = 'blocked', 'native-gif-not-returned-by-current-tool'
        elif cid == 'W01':
            status, reason = 'blocked', 'named-reference-registry-and-separate-message-output-unavailable'
        else:
            status, reason = 'deferred', 'not-yet-applied'
        units.append({'unitId': uid, 'candidateId': candidate, 'status': status, 'reason': reason,
                      'attempted': state is not None, 'attempts': [{'jobKey': a['key'], 'status': a['state']['status'], 'audit': str((BASE / 'audit/jobs' / a['key'] / 'state.json').relative_to(ROOT))} for a in attempt_states], 'sourcePrompt': source['promptFile'],
                      'sourceSha256': source['sha256'], 'sourceLanguage': source['language'],
                      'jobKey': key if state else None, 'ids': applied['ids'] if applied else None,
                      'audit': str((BASE / 'audit/jobs' / key / 'state.json').relative_to(ROOT)) if state else None})
        coverage.append({'candidateId': candidate, 'caseId': cid, 'expectedOutputs': 4 if cid == 'G11' else 1,
                         'acceptedExampleIds': [applied['ids']['example']] if applied else []})
    accepted = all(u['status'] == 'accepted' for u in units)
    record = {'caseId': cid, 'title': case['title'], 'sourceUrl': case['source_url'],
              'referenceTask': case['reference']['task_id'], 'status': 'accepted' if accepted else 'blocked',
              'units': units}
    mapping.append(record)
    case['prompt']['complete_text_status'] = 'full_original_text_frozen_with_sha256'
    case['generation_status'] = 'accepted_and_imported' if accepted else 'blocked'
    case['import']['status'] = 'applied' if accepted else 'blocked'
    case['import']['prompt_id'] = units[0]['ids']['prompt'] if accepted and len(units) == 1 else None
    case['execution'] = {'unit_ids': [u['unitId'] for u in units], 'status': record['status'],
                         'reason': units[0]['reason'], 'attempted_units': sum(u['attempted'] for u in units)}

withdrawal_file = BASE / 'audit/withdrawn-composites/withdrawal.json'
withdrawn = {i['jobKey'] for i in read(withdrawal_file)['items']} if withdrawal_file.exists() else set()
adaptations = []
for item in read(BASE / 'adaptations/catalog.json'):
    folder = BASE / item['folder']
    definition = read(folder / 'definition.json')
    applied_file = ROOT / 'production/applied' / (definition['key'] + '.json')
    applied = read(applied_file) if applied_file.exists() else None
    adaptations.append({**item, 'provenance': 'independent-adaptation', 'jobKey': definition['key'],
                        'status': 'withdrawn-user-request' if definition['key'] in withdrawn else ('accepted' if applied else 'not-applied'),
                        'ids': applied['ids'] if applied and definition['key'] not in withdrawn else None,
                        'historicalIds': applied['ids'] if applied and definition['key'] in withdrawn else None,
                        'audit': str((folder / 'audit.json').relative_to(ROOT))})
direct_attempts = []
for intent_file in sorted(list((BASE / 'jobs').glob('*-direct-gif*/intent.json')) + list((BASE / 'jobs').glob('*-native-format-check*/intent.json'))):
    folder = intent_file.parent
    intent = read(intent_file)
    audit = read(folder / 'audit.json')
    definition = read(folder / 'definition.json')
    direct_attempts.append({'sourceCase': intent['sourceCase'], 'jobKey': definition['key'],
                            'provenance': intent['provenance'], 'accepted': audit['review']['accepted'],
                            'format': audit['format'], 'frames': audit['frames'],
                            'audit': str((folder / 'audit.json').relative_to(ROOT))})
for case in mapping:
    case['nativeDeliveryAttempts'] = [a for a in direct_attempts if a['sourceCase'] == case['caseId']]
    case['adaptations'] = [a for a in adaptations if a['sourceCase'] == case['caseId']]
for case in plan['cases']:
    case['native_delivery_attempts'] = [a for a in direct_attempts if a['sourceCase'] == case['case_id']]
    case['adaptation_execution'] = [a for a in adaptations if a['sourceCase'] == case['case_id']]
write(BASE / 'adaptations/content-map.json', adaptations)
write(BASE / 'adaptations/campaign.json', {'cases': [{'candidateId': read(BASE / a['folder'] / 'definition.json')['candidateId'], 'expectedOutputs': 1, 'acceptedExampleIds': [a['ids']['example']] if a['ids'] else []} for a in adaptations if a['status'] != 'withdrawn-user-request']})

for ref in plan['reference_tasks']:
    receipt = BASE / 'references' / ref['id'] / 'audit.json'
    ref['status'] = 'accepted' if receipt.exists() else 'deferred-dependent-case-blocked'
    if receipt.exists():
        ref['audit'] = str(receipt.relative_to(ROOT))

plan['status'] = 'nine_frame_composites_authorized'
write(BASE / 'import-plan.json', plan)
write(BASE / 'content-map.json', mapping)
write(BASE / 'campaign.json', {'cases': coverage})
ledger = read(BASE / 'source-ledger.json')
by_case = {c['caseId']: c for c in mapping}
for row in ledger:
    if row['role'] == 'research-backlog':
        disposition = {'status': 'deferred', 'reason': row['status'], 'nextAction': row['next_action'],
                       'published': False, 'note': 'Evidence retained; not promoted without complete original prompt, model attribution and media mapping.'}
    elif row['role'] == 'prompt-evidence':
        disposition = {'status': 'evidence-only', 'caseIds': row['case_ids'], 'publishedAsSeparateCard': False}
    else:
        disposition = {'status': 'reconciled', 'cases': [{'caseId': c, 'originalStatus': by_case[c]['status'], 'adaptedOutputs': len([a for a in by_case[c]['adaptations'] if a['ids']])} for c in row['case_ids']]}
    row['executionDisposition'] = disposition
write(BASE / 'source-ledger.json', ledger)
write(BASE / 'audit/capability.json', {
    'tool': 'image_gen.imagegen', 'knownModelFamily': 'GPT Image', 'providerModelId': None,
    'probes': [{'caseId': cid, **read(BASE / 'jobs' / f'{cid.lower()}-original' / 'audit.json')} for cid in ['G13', 'G14', 'G04', 'G16']],
    'conclusion': 'All recorded original-prompt GIF probes and retries returned single-frame PNG files. No native GIF accepted in this campaign. This records observed results, not a universal model-capability claim. The explicit direct-GIF requests for reference-based G13 and text-only G17 also returned single-frame PNGs; the G17 response contained no separate animated attachment. Earlier composites remain withdrawn and archived. On 2026-11-09 the user authorized nine-frame local composition; new versions are tracked separately. These observations describe this tool session, not a universal GPT Image capability claim.',
    'workflow': {'caseId': 'W01', 'status': 'blocked', 'attempted': False,
                 'reason': 'Available image tool accepts file paths but exposes no named-reference registry or separate chat-message output contract. No scheduled task created.', 'adaptation': 'Direct upload via local name-to-file mapping, one image call and a separately assistant-authored Japanese message; see adaptations/w01/workflow.json'},
    'retryProbe': read(BASE / 'jobs/g13-original-r2/audit.json'),
    'latestNativeOutputCheck': read(BASE / 'audit/native-gif-retry-2026-11-09.json'),
    'directGifProbe': read(BASE / 'jobs/g13-direct-gif-v1/audit.json'),
    'directGifProbes': direct_attempts,
    'officialGifCapability': read(BASE / 'audit/official-gif-capability.json'),
    'animationPolicy': read(BASE / 'generation-policy.json')})
for attempt in direct_attempts:
    folder = (ROOT / attempt['audit']).parent
    state = read(folder / 'state.json')
    archive = BASE / 'audit/jobs' / attempt['jobKey']
    write(archive / 'state.json', state)
    source = ROOT / read(folder / 'audit.json')['outputPath']
    destination = archive / ('returned' + source.suffix)
    if not destination.exists():
        shutil.copy2(source, destination)
files = list((BASE / 'sources').glob('*/source-prompt.txt'))
assert len(files) == 39
for item in manifest:
    assert hashlib.sha256((ROOT / item['promptFile']).read_bytes()).hexdigest() == item['sha256']
accepted = sum(c['status'] == 'accepted' for c in mapping)
write(BASE / 'audit/coverage.json', {'plannedCases': 34, 'frozenBodies': len(files), 'plannedBodies': 39,
      'plannedOutputs': 42, 'acceptedCases': accepted, 'acceptedOutputs': accepted, 'acceptedGifs': 0,
      'blockedCases': 34 - accepted, 'sourceRecords': len(ledger), 'researchBacklog': sum(r['role'] == 'research-backlog' for r in ledger),
      'acceptedReferenceGroups': sum(r['status'] == 'accepted' for r in plan['reference_tasks']),
      'acceptedReferenceFiles': len(list((BASE / 'references').glob('*/output.png'))),
      'withdrawnComposedGifs': len(withdrawn),
      'adaptedGifs': sum(a['status'] == 'accepted' and a['sourceCase'].startswith('G') for a in adaptations),
      'adaptedStills': sum(a['status'] == 'accepted' and a['sourceCase'].startswith('S') for a in adaptations),
      'adaptedWorkflows': sum(a['status'] == 'accepted' and a['sourceCase'] == 'W01' for a in adaptations),
      'practicalDeliverables': accepted + sum(a['status'] == 'accepted' for a in adaptations),
      'casesWithOriginalOrAdaptedOutput': sum(c['status'] == 'accepted' or any(a['ids'] for a in c['adaptations']) for c in mapping),
      'providerRejectedStillCases': [c['caseId'] for c in mapping if c['caseId'].startswith('S') and c['status'] != 'accepted'],
      'countsNote': 'acceptedCases/Outputs/Gifs and blockedCases refer strictly to original-prompt requirements. Adaptations are counted separately and retain their documented limitations.'})
print(f'{accepted}/34 original cases imported; {sum(a["status"] == "accepted" for a in adaptations)} independent adaptations; original unmet requirements remain separate.')
