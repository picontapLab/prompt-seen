// content:new (design doc §14.1): create an entry directory with the next free ID and every
// required file, as a draft in the source language.
//
// The scaffold is valid as it is (a draft is never shown in production), so it never blocks
// other content while it is being filled in.
//
//   npm run content:new -- prompt <slug> [--category landscape] [--locale en]
//   npm run content:new -- template <slug> [--locale en]
//   npm run content:new -- collection <slug> --cover a_012 --items p_001,p_002 [--locale en]
//   npm run content:new -- page <slug> [--locale en]
//   npm run content:new -- example --prompt p_001 [--output a_012]
//   npm run content:new -- example --template t_001 [--version v1] [--sample default] --output a_012
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { contentDir, loadConfig } from '../src/config/load';
import { renderTemplate } from '../src/modules/template/render';
import { readText, sha256 } from './lib/content/read';
import { toFieldSpec } from './lib/content/rules';
import { fieldsFileSchema, sampleSchema, SLUG_PATTERN, taxonomyFileSchema } from './lib/content/schemas';
import { ROOT } from './lib/paths';
import { acquireContentLock } from './lib/content-production/lock';

const usage = `Usage:
  npm run content:new -- prompt <slug> [--category <id>] [--locale en]
  npm run content:new -- template|page <slug> [--locale en]
  npm run content:new -- collection <slug> --cover a_012 --items p_001,p_002 [--locale en]
  npm run content:new -- example --prompt p_001 [--output a_012]
  npm run content:new -- example --template t_001 [--version v1] [--sample default] --output a_012`;

function fail(message: string): never {
  console.error(`content:new: ${message}\n${usage}`);
  process.exit(1);
}

const today = () => new Date().toISOString().slice(0, 10);

function nextId(dir: string, prefix: string): string {
  const ids = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => new RegExp(`^${prefix}_\\d+$`).test(d)) : [];
  const max = Math.max(0, ...ids.map((d) => Number(d.slice(prefix.length + 1))));
  return `${prefix}_${String(max + 1).padStart(3, '0')}`;
}

function slugTaken(dir: string, slug: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const id of fs.readdirSync(dir)) {
    const file = path.join(dir, id, 'entry.yaml');
    if (fs.existsSync(file) && (YAML.parse(readText(file)) as { slug?: string })?.slug === slug) return id;
  }
  return null;
}

function write(files: Record<string, string>) {
  for (const [file, contents] of Object.entries(files)) {
    if (fs.existsSync(file)) fail(`${path.relative(ROOT, file)} already exists`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    console.log(`  created ${path.relative(ROOT, file)}`);
  }
}

const localeFile = (title: string, sections: string) => `---
title: ${title}
description: ''
status: draft
updatedAt: ${today()}
---

${sections}
`;

const USAGE_SECTIONS = `## What it is good for

Describe the task this solves and when to choose it.

## How to adjust it

Explain which words to change and what each change does.
`;

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      locale: { type: 'string' },
      prompt: { type: 'string' },
      template: { type: 'string' },
      version: { type: 'string' },
      sample: { type: 'string' },
      output: { type: 'string' },
      category: { type: 'string' },
      cover: { type: 'string' },
      items: { type: 'string' },
    },
  });
  const [kind, slug] = positionals;
  const config = loadConfig(ROOT);
  const dir = contentDir(ROOT);
  const locale = values.locale ?? config.defaultLocale;
  if (!config.locales.some((l) => l.code === locale)) fail(`--locale ${locale} is not in content/locales.yaml`);
  const date = today();

  if (kind === 'example') {
    const promptId = values.prompt ?? null;
    const templateId = values.template ?? null;
    if (!promptId && !templateId) fail('an example belongs to a prompt (--prompt) or a template (--template)');
    let prompt = '';
    let output = values.output ?? null;
    let template: { id: string; version: string; sample: string; values: unknown } | null = null;
    if (promptId) {
      const promptDir = path.join(dir, 'prompts', promptId);
      if (!fs.existsSync(promptDir)) fail(`prompt ${promptId} does not exist`);
      const file = path.join(promptDir, 'prompt.txt');
      if (fs.existsSync(file)) prompt = readText(file).trim();
      // The cover is usually the output of the run being recorded.
      output ??=
        (YAML.parse(readText(path.join(promptDir, 'entry.yaml'))) as { coverAssetId?: string | null }).coverAssetId ??
        null;
    }
    if (templateId) {
      const version = values.version ?? 'v1';
      const sample = values.sample ?? 'default';
      const vdir = path.join(dir, 'templates', templateId, 'versions', version);
      const sampleFile = path.join(vdir, 'samples', `${sample}.yaml`);
      if (!fs.existsSync(sampleFile)) fail(`${templateId} ${version} has no sample "${sample}"`);
      const fields = fieldsFileSchema
        .parse(YAML.parse(readText(path.join(vdir, 'fields.yaml'))))
        .fields.map(toFieldSpec);
      const sampleValues = sampleSchema.parse(YAML.parse(readText(sampleFile)));
      const rendered = renderTemplate({ body: readText(path.join(vdir, 'body.txt')).trim(), fields }, sampleValues);
      if (!rendered.ok) fail(`sample "${sample}" of ${templateId} ${version} does not render; fix it first`);
      prompt = rendered.text!;
      template = { id: templateId, version, sample, values: sampleValues };
    }
    if (!output) fail('name the output image with --output a_012 (import it first with `npm run media:import`)');
    const id = nextId(path.join(dir, 'examples'), 'x');
    const run = {
      id,
      promptId,
      template,
      promptSha256: sha256(prompt),
      referenceAssetIds: [],
      outputAssetIds: [output],
      provider: null,
      model: { displayName: null, providerModelId: null },
      recordedAt: date,
      parameters: {},
      notes: {},
    };
    write({
      [path.join(dir, 'examples', id, 'run.yaml')]:
        `# One recorded generation (design doc §5.5). prompt.txt is the exact text that was sent and never\n` +
        `# changes; promptSha256 is its hash. Fill in the model, parameters and notes.\n` +
        YAML.stringify(run),
      [path.join(dir, 'examples', id, 'prompt.txt')]: `${prompt}\n`,
    });
    console.log(
      `content:new: ${id}. If the text sent was different, edit prompt.txt; content:validate then prints the new promptSha256.`,
    );
    return;
  }

  if (!kind || !slug || !['prompt', 'template', 'collection', 'page'].includes(kind)) fail('give a kind and a slug');
  if (!SLUG_PATTERN.test(slug)) fail(`"${slug}" is not a valid slug: lowercase letters, digits and single hyphens`);

  if (kind === 'page') {
    const pageDir = path.join(dir, 'pages', slug);
    if (fs.existsSync(pageDir)) fail(`page ${slug} already exists`);
    write({ [path.join(pageDir, 'locales', `${locale}.mdx`)]: localeFile(slug, 'Write the page here.\n') });
    return;
  }

  const plural = `${kind}s`;
  const kindDir = path.join(dir, plural);
  const taken = slugTaken(kindDir, slug);
  if (taken) fail(`slug "${slug}" is used by ${taken}`);
  const id = nextId(kindDir, kind[0]!);
  const entryDir = path.join(kindDir, id);
  const header = `# ${kind} ${id} (design doc §5). Each locale file in locales/ is published on its own.\n`;
  const categoriesFile = path.join(dir, 'taxonomy', 'categories.yaml');
  const categories = fs.existsSync(categoriesFile)
    ? taxonomyFileSchema.parse(YAML.parse(readText(categoriesFile)) ?? []).map((t) => t.id)
    : [];

  if (kind === 'prompt') {
    const category = values.category ?? categories[0];
    if (!category || !categories.includes(category))
      fail(
        `choose a category from content/taxonomy/categories.yaml with --category (${categories.join(', ') || 'none defined yet'})`,
      );
    write({
      [path.join(entryDir, 'entry.yaml')]:
        header +
        `# categoryId is one of: ${categories.join(', ')}\n` +
        YAML.stringify({
          id,
          slug,
          createdAt: date,
          updatedAt: date,
          promptSource: { type: 'literal', file: 'prompt.txt', language: 'en' },
          categoryId: category,
          styleIds: [],
          useCaseIds: [],
          coverAssetId: null,
          relatedTemplateIds: [],
          model: { displayName: null, providerModelId: null, verification: 'unknown' },
          inputRequirements: { referenceImage: 'none' },
          source: { author: null, url: null, license: null },
          annotations: [],
        }),
      [path.join(entryDir, 'prompt.txt')]: 'Write the prompt here, exactly as it should be copied.\n',
      [path.join(entryDir, 'locales', `${locale}.mdx`)]: localeFile(slug, USAGE_SECTIONS),
    });
  } else if (kind === 'template') {
    write({
      [path.join(entryDir, 'entry.yaml')]:
        header +
        YAML.stringify({
          id,
          slug,
          createdAt: date,
          updatedAt: date,
          currentVersion: 'v1',
          promptLanguage: 'en',
          categoryId: null,
          styleIds: [],
          useCaseIds: [],
        }),
      [path.join(entryDir, 'versions', 'v1', 'body.txt')]: 'Create a poster for {{subject}}.\n',
      [path.join(entryDir, 'versions', 'v1', 'fields.yaml')]: YAML.stringify({
        fields: [{ name: 'subject', type: 'string', required: true, maxLength: 120, labels: { [locale]: 'Subject' } }],
      }),
      [path.join(entryDir, 'versions', 'v1', 'samples', 'default.yaml')]: YAML.stringify({ subject: 'a ceramic mug' }),
      [path.join(entryDir, 'locales', `${locale}.mdx`)]: localeFile(slug, USAGE_SECTIONS),
    });
  } else {
    const items = (values.items ?? '')
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    if (!values.cover || !items.length) fail('a collection needs --cover a_012 and --items p_001,p_002');
    write({
      [path.join(entryDir, 'entry.yaml')]:
        header + YAML.stringify({ id, slug, createdAt: date, updatedAt: date, coverAssetId: values.cover, items }),
      [path.join(entryDir, 'locales', `${locale}.mdx`)]: localeFile(slug, 'Introduce the collection here.\n'),
    });
  }
  console.log(
    `content:new: ${kind} ${id} at ${path.relative(ROOT, entryDir)}/ (draft). Run \`npm run content:validate\` as you fill it in.`,
  );
}

const release = acquireContentLock(ROOT);
process.once('exit', release);
try {
  main();
} finally {
  release();
}
