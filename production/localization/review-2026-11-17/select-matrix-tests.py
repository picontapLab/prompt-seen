import collections
import json
import re
import sys
from pathlib import Path

source, destination, mode = sys.argv[1:]
report = json.loads(Path(source).read_text())
selected = []
locale_files = {f'{name}.browser.spec.ts' for name in [
    'arabic', 'arabic-rtl', 'french', 'french-interactions', 'french-media',
    'french-search', 'italian', 'russian', 'traditional-chinese', 'traditional-chinese-ime-submit',
]}
popup_files = {'popup.browser.spec.ts', 'popup-layout.browser.spec.ts'}
shared_files = {'hosting.browser.spec.ts', 'home-language.browser.spec.ts', 'acceptance.browser.spec.ts', 'shell.browser.spec.ts'}
shared = re.compile(r'no request leaves the base path|(?:ar|fr|it|ru|zh-Hant): (?:direct home, refresh|home language round trip|the header fits at 320 px)|preview navigation crosses Latin, CJK and RTL|Arabic right-to-left sample| › (?:ar|fr|it|ru|zh-Hant) (?:light|dark) ')


def visit(suite, parents=()):
    title = suite.get('title')
    names = parents + ((title,) if title and not title.endswith('.spec.ts') else ())
    for spec in suite.get('specs', []):
        name = ' › '.join((*names, spec['title']))
        file = spec['file']
        for test in spec['tests']:
            project = test['projectName']
            if mode == 'subpath':
                include = project == 'http' or file in locale_files | popup_files or (file in shared_files and shared.search(name))
            elif mode == 'root-final':
                include = file in popup_files | {'home-language.browser.spec.ts'} or (file == 'acceptance.browser.spec.ts' and re.search(r' › (?:ar|fr|it|ru|zh-Hant) (?:light|dark) ', name))
            else:
                raise ValueError(mode)
            if include:
                selected.append(f'[{project}] › {file} › {name}')
    for child in suite.get('suites', []):
        visit(child, names)


visit(report)
Path(destination).write_text('\n'.join(selected) + '\n')
print(json.dumps({'mode': mode, 'selected': len(selected), 'projects': dict(collections.Counter(line.split(']')[0][1:] for line in selected))}))
