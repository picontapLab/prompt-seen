import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import YAML from 'yaml';
import { afterEach, expect, it } from 'vitest';
import { recipeReviewHash } from './publish';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

it.each([0, 1, 2])(
  'publishes a %i-reference case through the actual CLI and rejects stale input',
  async (count) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'produce-cli-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'content'), { recursive: true });
    for (const file of ['locales.yaml', 'site.yaml'])
      fs.copyFileSync(`content/${file}`, path.join(root, 'content', file));
    fs.mkdirSync(path.join(root, 'content/taxonomy'));
    for (const name of fs.readdirSync('content/taxonomy').filter((name) => name.endsWith('.yaml')))
      fs.copyFileSync(path.join('content/taxonomy', name), path.join(root, 'content/taxonomy', name));
    const site = YAML.parse(fs.readFileSync(path.join(root, 'content/site.yaml'), 'utf8'));
    site.home = { featured: [] };
    site.feed = { showcase: [], interludes: [] };
    fs.writeFileSync(path.join(root, 'content/site.yaml'), YAML.stringify(site));
    const output = path.join(root, 'output.png');
    await sharp({ create: { width: 320, height: 320, channels: 3, background: '#567890' } })
      .png()
      .toFile(output);
    const references = Array.from({ length: count }, (_, index) => {
      const file = path.join(root, `reference-${index}.png`);
      fs.copyFileSync(output, file);
      return { slotId: `subject${index}`, path: file };
    });
    const call = (command: string, input?: unknown, extra: string[] = []) => {
      const file = path.join(root, 'input.json');
      if (input) fs.writeFileSync(file, JSON.stringify(input));
      return JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--import',
            'tsx',
            path.resolve('scripts/content-produce.ts'),
            command,
            '--root',
            root,
            '--key',
            'fixture',
            ...(input ? ['--file', file] : []),
            ...extra,
          ],
          { encoding: 'utf8' },
        ),
      );
    };
    const definition = {
      key: 'fixture',
      candidateId: 'cli-fixture',
      prompt: 'A blue ceramic sculpture.',
      references,
      targetAspectRatio: '1:1',
    };
    call('plan', definition);
    call('claim');
    call('record', { outputPath: output, provider: 'Fixture', model: null });
    call('review', { accepted: true, notes: 'Integration fixture', reviewer: 'test' });
    const copy = {
      title: 'Ceramic sculpture',
      description: 'A test sculpture.',
      body: '## Use\n\nA fixture for the CLI.',
    };
    const recipe = {
      candidateId: definition.candidateId,
      slug: 'ceramic-sculpture',
      categoryId: 'product',
      useCaseIds: [],
      body: definition.prompt,
      fields: [],
      values: {},
      inputRequirements: {
        referenceImage: count ? 'required' : 'none',
        slots: references.map((reference) => ({
          id: reference.slotId,
          labels: { en: reference.slotId },
          min: 1,
          max: 1,
        })),
      },
      locales: {
        en: copy,
        'zh-Hans': { title: '陶瓷雕塑', description: '测试用雕塑。', body: '## 使用\n\n生产工具测试夹具。' },
      },
      alt: { en: 'Ceramic sculpture', 'zh-Hans': '陶瓷雕塑' },
    };
    const plan = call('prepare', {
      ...recipe,
      editorialReview: {
        reviewer: 'test',
        reviewedAt: new Date().toISOString(),
        contentHash: recipeReviewHash(recipe),
      },
    });
    const first = call('apply', undefined, ['--hash', plan.planHash]);
    expect(call('apply', undefined, ['--hash', plan.planHash])).toEqual(first);
    expect(call('status')[0].publication).toBe('applied');
    expect(fs.readdirSync(path.join(root, 'content/prompts'))).toHaveLength(1);
    const run = YAML.parse(fs.readFileSync(path.join(root, 'content/examples', first.example, 'run.yaml'), 'utf8'));
    expect(run.referenceAssetIds).toHaveLength(count);
    if (count) {
      fs.appendFileSync(references[0]!.path, 'changed');
      expect(() => call('plan', definition)).toThrow();
    }
  },
  60_000,
);
