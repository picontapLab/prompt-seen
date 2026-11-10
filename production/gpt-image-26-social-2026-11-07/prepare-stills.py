"""Prepare literal source-prompt jobs and reviewable bilingual recipes; never publish."""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent.parent


def write(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    if file.exists() and file.read_text() != data:
        raise ValueError(f'Existing file differs: {file}')
    file.write_text(data)


plan = json.loads((BASE / 'import-plan.json').read_text())
catalog = json.loads((BASE / 'catalog.json').read_text())
for case in plan['cases']:
    cid = case['case_id']
    if cid not in catalog:
        continue
    meta = catalog[cid]
    prompt = (BASE / 'sources' / cid / 'source-prompt.txt').read_text()
    values = {}
    if cid == 'S15':
        values = {'＊＊＊': 'ドアスコープ'}
        prompt = prompt.replace('＊＊＊', values['＊＊＊'])
        write(BASE / 'sources' / cid / 'values.json', values)
    folder = BASE / 'jobs' / f'{cid.lower()}-original'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'prompt.txt').write_text(prompt)
    refs = []
    if 'reference' in meta:
        refs = [{'slotId': meta['slot'], 'path': str(BASE / 'references' / meta['reference'] / 'output.png')}]
    definition = {'key': f'gpt26-social-{cid.lower()}-original', 'candidateId': f'gpt26-social-{cid.lower()}',
                  'prompt': prompt, 'references': refs, 'targetAspectRatio': None}
    write(folder / 'definition.json', definition)
    input_en = meta.get('inputEn', 'Paste the complete original prompt without adding an input image.')
    input_zh = meta.get('inputZh', '直接使用完整原词，不需要参考图。')
    notes_en = ''
    notes_zh = ''
    if cid in ['S02', 'S14', 'S11']:
        notes_en += ' The source post compares models; this page presents one new GPT Image result, not a model comparison.'
        notes_zh += ' 来源帖包含模型对比；本页仅展示一次新的 GPT Image 结果，不制作模型对照图。'
    if cid == 'S10':
        notes_en += ' This is the author’s Chinese text; the earlier independently adapted cat prompt remains a separate case.'
        notes_zh += ' 本条保存作者中文原词；之前独立改写的橘猫条目继续保留，生成事实分别记录。'
    if cid == 'S11':
        notes_en += ' The author watermark is an explicit part of the quoted prompt. It does not identify this new image as the author’s own output.'
        notes_zh += ' 原词明确要求作者水印，因此逐字保留；水印不代表本次新图由原作者制作。'
    if cid == 'S14':
        notes_en += ' The source JSON describes both heels and boots; that internal difference is preserved.'
        notes_zh += ' 原始 JSON 中高跟鞋与靴子的描述差异原样保留。'
    source = {'candidateId': definition['candidateId'], 'platform': 'X', 'author': case['author'],
              'url': case['prompt']['source_url'], 'publishedAt': None,
              'metricObjectUrl': case['source_url'], 'metricObjectPublishedAt': None,
              'metricScope': {'en': 'Whole original post or gallery; not this generated example', 'zh-Hans': '原帖或整组作品；不属于本站新生成示例'},
              'observedAt': case['metric_observed_date'], 'cacheTimestampKnown': False,
              'evidenceMethod': {'en': 'Saved public X snapshot; complete prompt from saved author post/reply mirror', 'zh-Hans': '保存的 X 公开快照；完整原词取自作者主帖或回复镜像'},
              'evidenceUrl': 'https://cdn.syndication.twimg.com/tweet-result?id=' + case['source_post_id'] + '&lang=en&token=1',
              'sourcePromptStatus': {'en': 'Complete author text, original language' + ('; option filled and recorded' if values else ''), 'zh-Hans': '完整作者原词，保留原语言' + ('；选项填值已记录' if values else '')},
              'metrics': [{'key': 'likes', 'value': case['source_likes'], 'labels': {'en': 'Source post likes', 'zh-Hans': '原帖点赞'}}]}
    recipe = {'candidateId': definition['candidateId'], 'slug': meta['slug'], 'categoryId': meta['category'],
              'useCaseIds': ['social-post'], 'body': prompt, 'promptLanguage': case['prompt']['language'],
              'promptProvenance': 'source-prompt', 'fields': [], 'values': {},
              'inputRequirements': {'referenceImage': 'required' if refs else 'none',
                                    'instructions': {'en': input_en, 'zh-Hans': input_zh},
                                    'slots': [{'id': meta['slot'], 'labels': {'en': 'Project-generated reference', 'zh-Hans': '本站生成的示例参考图'}, 'min': 1, 'max': 1}] if refs else []},
              'inspirationSources': [source],
              'locales': {
                  'en': {'title': meta['en'], 'description': meta['descriptionEn'],
                         'body': f'## How to use\n\n{input_en}\n\n## Source and generation\n\n[Original prompt by @{case["author"]}]({case["prompt"]["source_url"]}). The prompt stays in its original language on both language editions. The author identifies the source work as Image 2.6. This new example was generated with GPT Image; the tool did not return an exact model version. Source-post engagement is recorded separately.{notes_en}'},
                  'zh-Hans': {'title': case['title'] + ' · 作者原词', 'description': meta['descriptionZh'],
                              'body': f'## 使用方法\n\n{input_zh}\n\n## 来源与生成记录\n\n[作者 @{case["author"]} 的原始提示词]({case["prompt"]["source_url"]})。中英文页面均保留同一原语言正文。作者称来源作品使用 Image 2.6；本站新示例使用 GPT Image，工具未返回精确版本。原帖互动数据单独保存。{notes_zh}'}},
              'alt': {'en': meta['descriptionEn'], 'zh-Hans': meta['descriptionZh']}}
    file = BASE / 'recipes' / f'{cid.lower()}-original.json'
    if not file.exists():
        write(file, recipe)
print('Prepared 15 reviewable static recipes; reference jobs remain unclaimed until their inputs exist.')
