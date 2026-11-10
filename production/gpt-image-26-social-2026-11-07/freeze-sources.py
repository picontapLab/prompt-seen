"""Freeze reviewed source spans without rewriting author text or existing snapshots.

Run from any directory. Offsets are Unicode code points, end-exclusive. This only
archives evidence; it does not claim, generate, approve, or publish content.
"""
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent.parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def freeze(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = data.encode() if isinstance(data, str) else data
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError(f"Frozen file differs: {path}; use a new revision")
    else:
        path.write_bytes(data)


def between(text, start, stop=None):
    lo = text.index(start)
    hi = text.index(stop, lo) if stop else len(text)
    while hi > lo and text[hi - 1].isspace():
        hi -= 1
    return lo, hi


# Boundaries reviewed against each saved complete post/reply, not source_excerpt.
SPANS = {
    'S01': ('A crisp, high-fidelity', None),
    'S02': ('An ultra-photorealistic', None),
    'S03': ('縦長9:16の超写実的な実写写真。', '\n\n3,4枚目:'),
    'S04': ('写实中景照片', None),
    'S05': ('赤丸にサンタ帽、青丸の本はプレゼントに', '」'),
    'S06': ('PREMIUM BAROQUE', None),
    'S07': ('A cinematic 35mm', None),
    'S08': ('A cinematic, ultra-realistic', None),
    'S09': ('A young woman', None),
    'S10': ('画一套12款', None),
    'S11': ('9:16竖版', None),
    'S12': ('Transform the uploaded', None),
    'S13': ('Selfie, taken', None),
    'S14': ('{"subject"', '\n\n2.6'),
    'S15': ('玄関先でこちらを見るキャラ。', None),
    'G01': ('チャッピー！この画像', '」'),
    'G02': ('请以我上传的角色图', None),
    'G04': ('Generate a 5-second', '"'),
    'G05': ('请以这个内容', None),
    'G07': ('使用这个角色，生成', None),
    'G08': ('请以我上传的大肥鱼', None),
    'G09': ('创建一个gif，按照附图的动作顺序生成。', '”'),
    'G10': ('Keep the exact same', '"\n\n2️⃣'),
    'G11': ('このキャラの喜怒哀楽のGIFよろ', '」'),
    'G12': ('Use the character I uploaded', None),
    'G13': ('まばたきしてるGIF作ってください！', 'しか'),
    'G14': ('Kedimiz Robin', '“'),
    'G15': ('次の内容で GIF', '\n\nです'),
    'G16': ('Turn this character', '"'),
    'G17': ('make a raving', '"'),
    'W01': ('REFERENCE_NAME =', None),
}


def main():
    plan = json.loads((BASE / 'import-plan.json').read_text())
    manifest = []
    for case in plan['cases']:
        cid = case['case_id']
        candidates = case['prompt']['evidence_files']
        complete = [f for f in candidates if f.endswith(('-fx.json', '.fx.json'))]
        recovered = BASE / 'audit/recovered-evidence' / (case['prompt']['source_url'].rsplit('/', 1)[-1] + '.json')
        if recovered.exists():
            complete = [str(recovered.relative_to(ROOT))]
        if cid in ('S08', 'S11') and not recovered.exists():
            # A note_tweet with only the 280-character preview is not a full prompt.
            file = ROOT / candidates[0]
            partial = json.loads(file.read_text())['text']
            freeze(BASE / 'sources' / cid / 'incomplete-evidence.txt', partial)
            manifest.append({'caseId': cid, 'status': 'blocked-truncated-source',
                             'evidenceFile': candidates[0],
                             'reason': 'Saved official note_tweet contains a truncated preview; no complete mirror in the plan.'})
            continue
        if cid == 'G18':
            file = ROOT / candidates[0]
            report = file.read_text()
            start, end = between(report, '> You are animator', '\n\n来源：')
            quoted = report[start:end]
            text = '\n'.join(line[2:] if line.startswith('> ') else '' for line in quoted.splitlines())
            pointer = None
            extraction = {'reportStartCodepoint': start, 'reportEndCodepoint': end,
                          'transformation': 'Remove Markdown blockquote prefix from each line only.',
                          'crossCheck': 'Compared with original Reddit post via web open on 2026-11-07 America/Los_Angeles; text matches.'}
        else:
            file = ROOT / complete[0]
            text = json.loads(file.read_text())['tweet']['text']
            pointer = '/tweet/text'
            extraction = {}
        if cid == 'G03':
            spans = [(f'G03-{name}', *between(text, start, stop)) for name, start, stop in [
                ('golden-gate', 'A living mid-century gouache travel-poster painting of the Golden Gate', '\n\n#2'),
                ('colosseum', 'A living mid-century gouache travel-poster painting of the Roman', '\n\n#3'),
                ('fuji', 'A living mid-century gouache travel-poster painting of Mount Fuji', None)]]
        elif cid == 'G06':
            spans = []
            for name, paragraph in zip(['dwarf', 'sword', 'motorbike', 'cat'], text.split('\n\n'), strict=True):
                spans.append((f'G06-{name}', text.index(paragraph), text.index(paragraph) + len(paragraph)))
        else:
            spans = [(cid, *between(text, *SPANS[cid]))] if cid in SPANS else [(cid, 0, len(text))]
        for unit, lo, hi in spans:
            prompt = text[lo:hi]
            folder = BASE / 'sources' / unit
            freeze(folder / 'source-prompt.txt', prompt)
            provenance = {'caseId': cid, 'unitId': unit, 'language': case['prompt']['language'],
                          'author': case['author'], 'sourceUrl': case['prompt']['source_url'],
                          'evidenceFile': str(file.relative_to(ROOT)), 'evidenceSha256': digest(file.read_bytes()),
                          'jsonPointer': pointer, 'startCodepoint': lo, 'endCodepoint': hi,
                          'removedPrefix': text[:lo], 'removedSuffix': text[hi:],
                          'sha256': digest(prompt.encode()), **extraction}
            # S02 was frozen before the first capability run; preserve that audit.
            if unit != 'S02':
                freeze(folder / 'provenance.json', json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
            manifest.append({'caseId': cid, 'unitId': unit, 'status': 'frozen',
                             'promptFile': str((folder / 'source-prompt.txt').relative_to(ROOT)),
                             'language': case['prompt']['language'], 'sha256': digest(prompt.encode())})
    freeze(BASE / 'sources' / 'manifest-v3.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"Frozen {sum(x['status'] == 'frozen' for x in manifest)} source bodies; "
          f"blocked {sum(x['status'] != 'frozen' for x in manifest)} truncated bodies.")


if __name__ == '__main__':
    main()
