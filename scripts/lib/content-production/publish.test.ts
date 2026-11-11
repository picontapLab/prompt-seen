import { writeRequiredPages } from '../../../tests/support/localization-pages';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { afterEach, expect, it } from 'vitest';
import { animatedGif } from '../../../tests/support/gif';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';
import { planJob, claimJob, recordJob, reviewJob } from './production';
import { prepareContent, applyPrepared, recipeReviewHash } from './publish';
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((r) => fs.rmSync(r, { recursive: true, force: true })));
it.each(['png', 'gif'])(
  'stages a tested %s template and publishes it idempotently through the real content pipeline',
  async (format) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-publish-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'content'), { recursive: true });
    for (const file of ['locales.yaml', 'site.yaml'])
      fs.copyFileSync(path.resolve('content', file), path.join(root, 'content', file));
    fs.mkdirSync(path.join(root, 'content/taxonomy'));
    for (const name of fs.readdirSync('content/taxonomy').filter((n) => n.endsWith('.yaml')))
      fs.copyFileSync(path.resolve('content/taxonomy', name), path.join(root, 'content/taxonomy', name));
    const registryFile = path.join(root, 'content/locales.yaml');
    const registry = YAML.parse(fs.readFileSync(registryFile, 'utf8'));
    for (const locale of registry.locales) locale.enabled = ['en', 'zh-Hans'].includes(locale.code);
    fs.writeFileSync(registryFile, YAML.stringify(registry));
    writeRequiredPages(root, ['en', 'zh-Hans']);
    const site = YAML.parse(fs.readFileSync(path.join(root, 'content/site.yaml'), 'utf8'));
    site.home = { featured: [] };
    site.feed = { showcase: [], interludes: [] };
    fs.writeFileSync(path.join(root, 'content/site.yaml'), YAML.stringify(site));
    const jobRoot = path.join(root, '.artifacts/jobs');
    const output = path.join(root, `output.${format}`);
    if (format === 'gif') fs.writeFileSync(output, await animatedGif(400, 400));
    else
      await sharp({ create: { width: 400, height: 400, channels: 3, background: '#446688' } })
        .png()
        .toFile(output);
    planJob(jobRoot, {
      key: 'test-default',
      candidateId: 'test',
      prompt: 'A blue sphere.',
      references: [],
      targetAspectRatio: '1:1',
    });
    claimJob(jobRoot, 'test-default');
    recordJob(jobRoot, 'test-default', { outputPath: output, provider: 'Test', model: null });
    reviewJob(jobRoot, 'test-default', { accepted: true, notes: 'Test fixture accepted', reviewer: 'test' });
    const recipe = {
      candidateId: 'test',
      slug: 'blue-sphere',
      categoryId: 'product',
      useCaseIds: [],
      body: 'A {{color}} sphere.',
      fields: [{ name: 'color', type: 'string', required: true, labels: { en: 'Color', 'zh-Hans': '颜色' } }],
      values: { color: 'blue' },
      inputRequirements: { referenceImage: 'none' },
      locales: {
        en: { title: 'Blue sphere', description: 'A blue sphere example.', body: '## Use\n\nChange the color.' },
        'zh-Hans': { title: '蓝色球体', description: '一个蓝色球体。', body: '## 使用\n\n修改颜色。' },
      },
      alt: { en: 'Blue sphere', 'zh-Hans': '蓝色球体' },
    };
    await expect(prepareContent(root, jobRoot, 'test-default', recipe)).rejects.toThrow(/editorial review/i);
    const reviewed = {
      ...recipe,
      editorialReview: {
        reviewer: 'test',
        reviewedAt: new Date().toISOString(),
        contentHash: recipeReviewHash(recipe),
      },
    };
    await expect(
      prepareContent(root, jobRoot, 'test-default', {
        ...reviewed,
        alt: { ...recipe.alt, en: 'Changed after review' },
      }),
    ).rejects.toThrow(/editorial review/i);
    const stateFile = path.join(jobRoot, 'test-default/job.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    state.receipt.recordedAt = '2026-10-21T02:00:00.000Z';
    fs.writeFileSync(stateFile, JSON.stringify(state));
    // Preparation must remain usable while an enabled complete locale needs translations.
    registry.locales.find((locale: { code: string }) => locale.code === 'ja').enabled = true;
    fs.writeFileSync(registryFile, YAML.stringify(registry));
    const plan = await prepareContent(root, jobRoot, 'test-default', reviewed);
    await expect(applyPrepared(root, 'test-default', plan.planHash)).rejects.toThrow();
    expect(fs.existsSync(path.join(root, 'content/prompts', plan.ids.prompt))).toBe(false);
    registry.locales.find((locale: { code: string }) => locale.code === 'ja').enabled = false;
    fs.writeFileSync(registryFile, YAML.stringify(registry));

    expect(
      loadContent({
        root,
        config: loadConfig(root, {}),
        url: createUrlModule({ ...loadConfig(root, {}), localePrefixes: ['en', 'zh-hans', 'ja', 'ar'] }),
      }).content.prompts.size,
    ).toBe(0);
    await applyPrepared(root, 'test-default', plan.planHash);
    await applyPrepared(root, 'test-default', plan.planHash);
    const config = loadConfig(root, {});
    const result = loadContent({
      root,
      config,
      url: createUrlModule({ ...config, localePrefixes: config.locales.map((l) => l.pathPrefix) }),
    });
    expect(result.findings.blocking).toBe(0);
    expect(result.content.prompts.size).toBe(1);
    expect(result.content.examples.size).toBe(1);
    if (format === 'gif') {
      const media = result.content.media.get(plan.ids.media[0]!)!.data;
      expect(fs.readFileSync(path.join(root, 'public', media.original.key))).toEqual(fs.readFileSync(output));
      expect(media.animation?.frameCount).toBe(2);
      const detail = result.built?.details.find((d) => d.kind === 'prompt' && d.locale === 'en');
      expect(detail?.model).toMatchObject({ hasGifOutput: true, cover: { mimeType: 'image/gif' } });
    }
    expect(
      YAML.parse(fs.readFileSync(path.join(root, 'content/examples', plan.ids.example, 'run.yaml'), 'utf8')).recordedAt,
    ).toBe('2026-10-20');
    expect(result.built?.details.find((d) => d.kind === 'prompt' && d.locale === 'en')?.model.title).toBe(
      'Blue sphere',
    );

    planJob(jobRoot, {
      key: 'test-alternate',
      candidateId: 'test',
      prompt: 'A red sphere.',
      references: [],
      targetAspectRatio: '1:1',
    });
    claimJob(jobRoot, 'test-alternate');
    recordJob(jobRoot, 'test-alternate', { outputPath: output, provider: 'Test', model: null });
    reviewJob(jobRoot, 'test-alternate', { accepted: true, notes: 'Alternate fixture accepted', reviewer: 'test' });
    const alternateRecipe = {
      ...recipe,
      values: { color: 'red' },
      target: { promptId: plan.ids.prompt, sampleName: 'alternate' },
    };
    const alternate = await prepareContent(root, jobRoot, 'test-alternate', {
      ...alternateRecipe,
      editorialReview: {
        reviewer: 'test',
        reviewedAt: new Date().toISOString(),
        contentHash: recipeReviewHash(alternateRecipe),
      },
    });
    await applyPrepared(root, 'test-alternate', alternate.planHash);
    const updated = loadContent({
      root,
      config,
      url: createUrlModule({ ...config, localePrefixes: config.locales.map((l) => l.pathPrefix) }),
    });
    expect(updated.findings.blocking).toBe(0);
    expect(updated.content.prompts.size).toBe(1);
    expect(updated.content.examples.size).toBe(2);
    expect(
      updated.content.templates.get(plan.ids.template!)?.versions.get('v1')?.samples.get('alternate')?.values,
    ).toEqual({ color: 'red' });
    // Imported source prompts must retain their actual language and provenance.
    const literalText = '一颗蓝色球。';
    planJob(jobRoot, {
      key: 'chinese-literal',
      candidateId: 'chinese-literal',
      prompt: literalText,
      references: [],
      targetAspectRatio: null,
    });
    claimJob(jobRoot, 'chinese-literal');
    recordJob(jobRoot, 'chinese-literal', { outputPath: output, provider: 'Test', model: null });
    reviewJob(jobRoot, 'chinese-literal', { accepted: true, notes: 'Fixture accepted', reviewer: 'test' });
    const literalRecipe = {
      ...recipe,
      candidateId: 'chinese-literal',
      slug: 'chinese-literal',
      body: literalText,
      fields: [],
      values: {},
      promptLanguage: 'zh-Hans',
      promptProvenance: 'source-prompt',
      inspirationSources: [
        {
          candidateId: 'chinese-literal',
          platform: 'X',
          author: 'Original author',
          url: 'https://example.com/prompt',
          metricObjectUrl: 'https://example.com/prompt',
          metricScope: { en: 'Source post' },
          observedAt: '2026-11-07',
          cacheTimestampKnown: false,
          evidenceMethod: { en: 'Saved source' },
          evidenceUrl: 'https://example.com/evidence',
          sourcePromptStatus: { en: 'Complete' },
          metrics: [],
        },
      ],
      ...(format === 'png'
        ? { source: { author: 'Explicit author', url: 'https://example.com/original', license: 'CC0' } }
        : {}),
    };
    const literalPlan = await prepareContent(root, jobRoot, 'chinese-literal', {
      ...literalRecipe,
      editorialReview: {
        reviewer: 'test',
        reviewedAt: new Date().toISOString(),
        contentHash: recipeReviewHash(literalRecipe),
      },
    });
    await applyPrepared(root, 'chinese-literal', literalPlan.planHash);
    const literalEntry = YAML.parse(
      fs.readFileSync(path.join(root, 'content/prompts', literalPlan.ids.prompt, 'entry.yaml'), 'utf8'),
    );
    expect(literalEntry.promptSource).toMatchObject({ type: 'literal', language: 'zh-Hans' });
    expect(literalEntry.promptProvenance).toBe('source-prompt');
    expect(literalEntry.source).toEqual(
      format === 'png'
        ? literalRecipe.source
        : { author: 'Original author', url: 'https://example.com/prompt', license: null },
    );

    if (format === 'png') {
      const variantFiles = {
        [`templates/${plan.ids.template}/versions/v1/prompt-locales/zh-Hans/body.txt`]: '一颗{{color}}球。',
        [`templates/${plan.ids.template}/versions/v1/prompt-locales/zh-Hans/variant.yaml`]:
          'samples: { default: { color: 蓝色 }, alternate: { color: 红色 } }\n',
        [`prompts/${plan.ids.prompt}/prompt-locales/zh-Hans/variant.yaml`]: 'values: { color: 蓝色 }\n',
        [`prompts/${literalPlan.ids.prompt}/prompt-locales/en/prompt.txt`]: 'A blue sphere.',
      };
      for (const [name, text] of Object.entries(variantFiles)) {
        const file = path.join(root, 'content', name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
      }
      const sourceFiles = [
        `templates/${plan.ids.template}/versions/v1/body.txt`,
        `templates/${plan.ids.template}/versions/v1/samples/default.yaml`,
        `prompts/${literalPlan.ids.prompt}/prompt.txt`,
      ];
      const before = sourceFiles.map((name) => fs.readFileSync(path.join(root, 'content', name), 'utf8'));
      for (const translated of [
        {
          ...recipe,
          body: '一颗{{color}}球。',
          values: { color: '蓝色' },
          promptLanguage: 'zh-Hans',
          target: { promptId: plan.ids.prompt, sampleName: 'default' },
        },
        {
          ...literalRecipe,
          body: 'A blue sphere.',
          promptLanguage: 'en',
          target: { promptId: literalPlan.ids.prompt, sampleName: 'default' },
        },
      ]) {
        const key = `translated-${translated.promptLanguage.toLowerCase()}`;
        const text = translated.promptLanguage === 'en' ? 'A blue sphere.' : '一颗蓝色球。';
        planJob(jobRoot, {
          key,
          candidateId: translated.candidateId,
          prompt: text,
          references: [],
          targetAspectRatio: null,
        });
        claimJob(jobRoot, key);
        recordJob(jobRoot, key, { outputPath: output, provider: 'Test', model: null });
        reviewJob(jobRoot, key, { accepted: true, notes: 'Fixture accepted', reviewer: 'test' });
        const ready = await prepareContent(root, jobRoot, key, {
          ...translated,
          editorialReview: {
            reviewer: 'test',
            reviewedAt: new Date().toISOString(),
            contentHash: recipeReviewHash(translated),
          },
        });
        await applyPrepared(root, key, ready.planHash);
        const run = YAML.parse(
          fs.readFileSync(path.join(root, 'content/examples', ready.ids.example, 'run.yaml'), 'utf8'),
        );
        expect(run.promptLanguage).toBe(translated.promptLanguage);
        expect(
          fs.readFileSync(path.join(root, 'content/examples', ready.ids.example, 'prompt.txt'), 'utf8').trim(),
        ).toBe(text);
        if (translated.fields.length) expect(run.template.variantHash).toMatch(/^[a-f0-9]{64}$/);
      }
      expect(sourceFiles.map((name) => fs.readFileSync(path.join(root, 'content', name), 'utf8'))).toEqual(before);
    }

    const inputFile = path.join(root, 'content/templates', plan.ids.template!, 'versions/v1/inputs.yaml');
    fs.writeFileSync(
      inputFile,
      YAML.stringify({ referenceImage: 'optional', instructions: { en: 'An optional reference image' } }),
    );
    const changed = loadContent({
      root,
      config,
      url: createUrlModule({ ...config, localePrefixes: config.locales.map((l) => l.pathPrefix) }),
    });
    expect(changed.findings.list.some((finding) => finding.message.includes('contract changed'))).toBe(true);
  },
  30_000,
);
