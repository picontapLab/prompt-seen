import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, 'production/gpt-image-26-gif-2026-11-19-v2/generation/outputs');
const cases = Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n !== 16);
for (const n of cases) {
  const file = path.join(outputDir, `g${String(n).padStart(2, '0')}.gif`);
  const slug = `gpt26-gif-${String(n).padStart(2, '0')}-api-output`;
  const recipePath = path.join(
    root,
    'production/gpt-image-26-gif-2026-11-19-v2/recipes',
    `gpt26-gif-${String(n).padStart(2, '0')}-v2.json`,
  );
  const recipe = fs.existsSync(recipePath) ? JSON.parse(fs.readFileSync(recipePath, 'utf8')) : null;
  const altEn = recipe?.alt?.en ?? `GPT Image 2.6 GIF case ${String(n).padStart(2, '0')}`;
  const altZh = recipe?.alt?.['zh-Hans'] ?? altEn;
  execFileSync(
    'node',
    [
      '--import',
      'tsx',
      'scripts/media-import.ts',
      file,
      '--slug',
      slug,
      '--alt',
      `en=${altEn}`,
      '--alt',
      `zh-Hans=${altZh}`,
      '--creator',
      'Prompt Seen',
      '--credit',
      'AI-generated demonstration · Prompt Seen',
      '--license',
      'CC BY 4.0',
      '--license-url',
      'https://creativecommons.org/licenses/by/4.0/',
      '--source-type',
      'trainedAlgorithmicMedia',
      '--content-credentials',
      'unknown',
    ],
    { cwd: root, stdio: 'inherit' },
  );
}
