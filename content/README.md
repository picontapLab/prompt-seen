# Content

> 本地化合同更新（2026-11-10）：语言策略、全语言检查、scope、通用 import/promote 和审校规则见[本地化流程](../docs/localization-workflow.md)。内容可跨语言回退浏览；localization 独立记录实际说明语言与收录资格。新公开内容必须补齐所有 enabled complete 语言；内容生产可先准备候选，正式 apply 仍执行发布门禁。

西语生产候选的注册表启用 `en`、`zh-Hans`、`es`、`ja`、`de`；日语、德语、西语均要求完整的指纹审校与原始 Prompt 正文。新公开内容必须同时补齐这三种语言的说明及依赖字段。注册表状态不等于已经上线，西语发布结果见 [production-acceptance.json](../production/localization/es/production-acceptance.json)。

Everything the site shows comes from the files in this directory (design doc §4, §5, §6). They
are edited by hand, reviewed in pull requests and checked by `npm run content:validate`. Pages,
search data and host configuration are generated from them by `npm run content:build`; nothing
generated is edited by hand.

The 101 content images are GPT Image outputs generated from the recorded prompts. Each has
an immutable example run and generation/display reviews in `migrations/gpt-image-v1/`. The
site mother image may be a lossless WebP conversion; display variants are compressed separately.
The built-in tool does not expose an exact provider model ID or usage, so those values remain
unknown. The original procedural media remain for rollback, and the 44 old runs are archived.
Existing translation statuses do not imply a new human language review.

## Commands

| Command                                                                      | What it does                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run content:new -- prompt <slug>`                                       | New prompt directory with the next ID, as a draft                  |
| `npm run content:new -- template <slug>`                                     | New template with `versions/v1/`                                   |
| `npm run content:new -- collection <slug> --cover a_012 --items p_001,p_002` | New collection                                                     |
| `npm run content:new -- page <slug>`                                         | New content page (like `about`)                                    |
| `npm run content:new -- example --prompt p_001`                              | New example run with the prompt's current text and its cover image |
| `npm run media:import -- <image> --slug <words> --alt en="…"`                | Store an image and its display sizes; writes `media/a_NNN.yaml`    |
| `npm run media:import -- --refresh a_012`                                    | Regenerate sizes after editing `focalPoint` or `credit`            |
| `npm run content:validate`                                                   | Check everything; `--quiet` hides maintenance hints                |
| `npm run dev`                                                                | Local site that rebuilds when files here change                    |

`content:validate` reports four levels (design doc §14.3). **Errors** stop every build.
**Publish errors** mean a version marked `published` does not meet the publishing rules; they
stop the build too. **Warnings** (missing or outdated translations, untested prompts) and
**info** (unused images) never block. Each message names the file, the line, the field and how to
fix it.

## Layout

```text
content/
├── site.yaml, locales.yaml      instance configuration and the locale registry
├── prompts/p_001/
│   ├── entry.yaml               IDs, taxonomy, cover, model, annotations
│   ├── prompt.txt               the prompt, exactly as copied (not for template-based prompts)
│   └── locales/en.mdx …         title, summary and usage notes per language
├── templates/t_001/
│   ├── entry.yaml               currentVersion, promptLanguage, taxonomy
│   ├── locales/en.mdx …
│   └── versions/v1/
│       ├── body.txt             the prompt with {{fieldName}} placeholders
│       ├── fields.yaml          field types, limits, defaults and labels
│       └── samples/default.yaml values for the page and the editor; more samples cycle in order
├── examples/x_001/              one recorded run: run.yaml and the exact prompt.txt it used
├── media/a_001.yaml             one image: sizes, keys, colour, focal point, alt text, credit
├── collections/c_001/           an editorial list: entry.yaml (items in order) and locales/
├── pages/about/locales/…        content pages
├── taxonomy/
│   ├── categories.yaml, styles.yaml, use-cases.yaml, field-groups.yaml
│   └── categories/landscape/locales/en.mdx …   the text of a topic page
└── redirects.yaml               slug changes, merges and removed addresses
```

IDs (`p_001`, `t_001`, `x_001`, `a_001`, `c_001`) never change and never get reused; the
directory name is the ID. Slugs may change, but then the old slug goes into `redirects.yaml`.
A content page is served at `/{locale}/{directory name}/`, so its name cannot be one the site's own
routes use (prompts, templates, collections, categories, styles, use-cases, search, explore,
favorites, translation-missing, 404, 410); `content:validate` reports it.

## Optional prompt languages

Prompt bodies and page descriptions have separate language files. Keep adding single-language
cases as before; no translation directory is required. Within an existing page, the build uses
`prompt-locales/{code}/` when present and otherwise the original prompt language. Codes match
`locales.yaml` exactly (for example `zh-Hans`). Missing body translations are normal and do not
produce warnings. Files committed together are usable together; prompt translations have no
review, draft or expiry metadata.

- Literal prompt: add `prompts/p_NNN/prompt-locales/{code}/prompt.txt`. If the source has
  annotations, also add `annotations.yaml` with `annotations: [{ sourcePhrase: "…", phrase: "…" }]`.
  Map every original phrase once; each translated phrase must occur exactly once, without overlaps.
  The existing notes and image regions are reused.
- Template: add `templates/t_NNN/versions/vN/prompt-locales/{code}/body.txt` and `variant.yaml`.
  Keep the same placeholders and field constraints. `defaults` covers all non-enum fields with a
  source default; `enumText` covers each enum with a complete stable-value-to-output map or the
  string `source`; `separators` covers every list field; `samples` covers all source sample names,
  each with a complete set of valid values. Omit empty `defaults`, `enumText` and `separators`.
- Derived prompt: add `prompts/p_NNN/prompt-locales/{code}/variant.yaml` containing `values`
  and optional `annotations`. It must reference an existing translation of its fixed source
  template version. A template translation alone does not translate derived prompts.

For example, a template `A {{color}} {{product}}.` with enum values `blue` and `red`, a string
field `product` with no default, and one sample can use this Chinese body and variant:

```text
一个{{color}}{{product}}。
```

```yaml
enumText:
  color: { blue: 蓝色, red: 红色 }
samples:
  default: { color: blue, product: 杯子 }
```

The enum value saved in drafts and shared links is still `blue`; only the rendered output is
`蓝色`. User-entered text is kept across language switches. Copy, download, popup data, search,
Markdown, JSON export (current format version 2) and prompt structured data all use the selected
body. Update the entry's `updatedAt` when changing a body or its translations.

Generation runs retain their exact text. New runs record `promptLanguage`; translated template
runs also record `template.variantHash` alongside the source `contractHash`. These hashes protect
recorded generation evidence, not translation publication status. After a template variant has
been used in a run, change it in a new template version. Older runs without a language only count
when their source text can be reproduced exactly. A translation without its own matching run is
still available, but does not claim the original's test result.

For an existing target, `content:produce` can select an already-authored translation with the
recipe's `promptLanguage`; its body and values must reproduce the generation exactly. Template
recipes retain the source fields/input contract and select an existing translated sample.
Single-language commands keep their existing defaults. See
[the full design](../docs/multilingual-prompt-design.md) and the pilots `p_217`, `p_024` and `t_001`.

## Locale files and publishing

Each `locales/{code}.mdx` starts with frontmatter:

```yaml
---
title: Ink portrait
description: One sentence on what it makes and when to use it.
status: published # draft | published | archived
updatedAt: 2026-10-14
translation: # only in translations; the source-language file has none
  sourceLocale: en
  sourceHash: sha256:1a2b3c4d5e6f7a8b
  reviewStatus: reviewed # machine-draft | reviewed | outdated
---
```

Exactly one file per entry has no `translation` block: that is the source language. When the
source changes, `content:validate` warns about each translation and prints the new `sourceHash`
to write after reviewing it. An outdated translation stays published (§8.5).

A version is published in a language when (§8.4): the language is enabled in `locales.yaml`,
`status` is `published`, it is the source or a reviewed translation (never `machine-draft`), and
it has a description, at least one `##` section with text, alt text for the cover in that
language, annotation notes in that language, labels for its taxonomy terms (and, for
templates, field labels) in that language, and links only to entries published in that
language. Missing page descriptions have no page; the prompt-body fallback above does not create a page.

Preview builds (`BUILD_MODE=preview`, the default locally) also show drafts and the languages
marked `preview: true`, so work in progress can be checked. Archived versions answer 410.

### What the body may contain

Markdown (sections from `##`, lists, quotes, code, tables, emphasis, links) plus two components,
each on its own line:

```mdx
<Figure asset="a_012" caption="The same prompt without the seal" />

<Callout>A highlighted note.</Callout>
```

Link to other content by ID, so links survive slug changes and the base path:
`[the first portrait](prompt:p_001)`, `template:t_001`, `collection:c_001`, `page:about`,
`category:landscape`, `style:ink`, `use-case:portrait`. Other sites use `https://…`.

Raw HTML, imports, `{expressions}` and other components are errors. A literal brace is written
`\{`, or inside `` `inline code` `` — for example when a template description mentions
`` `{{product}}` ``.

## Prompts

`entry.yaml` (see any sample) holds the taxonomy, `coverAssetId`, `relatedTemplateIds`,
`model` (`verification: verified | unverified | unknown`; a verified prompt names its model),
`inputRequirements.referenceImage`, `source` and optional `annotations`.

Set `model.displayName` to the known model version (for example, `GPT Image 2.6`), and use
the same name in the corresponding example runs. Detail badges and card hover labels use this
value. `providerModelId` is the exact provider/API identifier and stays `null` when unavailable.
The project owner's 2026-11-05 version attribution labels the existing 208 prompts as GPT Image
2.5 and the 27 prompts in `production/gpt-image-26-2026-11/content-map.json` as GPT Image 2.6;
see `production/model-version-annotation-2026-11-05.json`. Historical generation receipts retain
the model information originally returned by the tool.

Example annotations:

```yaml
annotations:
  - phrase: a single red seal stamp in the lower right # verbatim from the prompt
    region: { x: 0.80, y: 0.82, w: 0.12, h: 0.12 } # 0–1, relative to the original image
    note: { en: This phrase sets the seal's position, zh-Hans: 这句话决定印章的位置 }
```

Phrases must appear in the prompt and must not overlap; there are at most five, lettered A–E
in the order they appear. A prompt rendered from a template uses
`promptSource: { type: template, templateId, version, values }` and has no `prompt.txt`.

## Templates

`fields.yaml` lists the fields in form order. Every field has `name`, `type`, `required`,
optional `group` (from `taxonomy/field-groups.yaml`), `labels` per language and optional
`help`:

- `string`: `default`, `minLength`, `maxLength`, `multiline`.
- `string-list`: `default`, `minItems`, `maxItems`, `itemMaxLength`, `separator`.
- `enum`: `default`, `options` (`value`, `labels`, optional `swatch: ['#RRGGBB', …]`). The
  prompt receives the `value`.

Lengths count characters as people see them, so "é" or an emoji counts once. Every placeholder
needs a field and every field must be used. Optional empty fields become empty text, so write
the body to read well either way.

A version that an example run used is frozen: changing its body, its defaults or the sample the
run used is an error, because the recorded prompt would no longer match. Create `v2` instead and
point `currentVersion` at it.

## Example runs

`examples/x_001/run.yaml` records one generation (§5.5): `promptId` and/or `template` (with
`version`, `sample` and the exact `values`), `promptSha256` of `prompt.txt`, `outputAssetIds`,
`referenceAssetIds`, `provider`, `model`, `recordedAt`, `parameters` and `notes` per language.
`prompt.txt` is the exact text sent and never changes; to record a new attempt, add a new run.
The newest run's date is shown as "last tested".

## Images

For this migration, lossless WebP conversion may be used before import, with the tool output
retained locally for audit. An optional `processing` profile records encoding settings so
`media:import -- --refresh` reproduces the same display configuration.

`media:import` validates the file (JPEG, PNG, WebP or AVIF), stores the original unchanged and
writes four sizes: `thumbnail` (480 px), `card` (960 px) and `detail` (1600 px) as WebP, never
enlarged and always at the original ratio, plus `og`, a 1200 × 630 JPEG cropped around the
focal point for link previews. `detail` and `og` carry the IPTC credit fields (§9.7). It also
suggests a placeholder colour and a focal point; both can be edited in the YAML.

Images are stored by the local driver in `public/media/`, which is part of the repository, so a
fresh clone shows every image without cloud storage. Keys contain a hash of their content and
are never overwritten; old files stay until a deliberate clean-up.

The live site can serve images from object storage instead (design doc §10.1,
[`docs/operations.md`](../docs/operations.md)): with `media.baseUrl` set, pages point at the CDN,
`npm run media:sync` uploads the files from `public/media/` and every deploy checks the CDN with
`npm run media:check`. Maintainers who keep images only in the bucket import with
`MEDIA_STORAGE=s3` (and the `S3_*` variables of `.env.example`); `content:validate` then warns
instead of failing about files that are not in `public/media/`.

## Taxonomy, topics and collections

`categories.yaml`, `styles.yaml` and `use-cases.yaml` list terms with labels per language and,
optionally, `aliases`: other words per language that should find the term in search, such as
synonyms and common queries (`poster: { en: [flyer], zh-Hans: [招贴] }`). A term's labels in other
languages already count as aliases, so they need not be repeated. A
term gets a topic page in a language only when `taxonomy/{categories|styles|use-cases}/{id}/locales/`
has a published file for it and at least three published prompts in that language use the term.
A collection is shown in a language when it is published there and at least two of its items
are; `reasons` in its frontmatter explain each item.

## Address changes

```yaml
redirects:
  - { kind: prompt, from: old-slug, to: p_005 } # slug change or merge, in every language
  - { from: /zh/, to: /zh-hans/ } # a fixed internal path
gone:
  - { kind: prompt, slug: removed-slug, reason: license } # 410: removed or license
```

### Reference inputs and showcase runs

Prompt `inputRequirements` may include localized `instructions` and image `slots`:

```yaml
inputRequirements:
  referenceImage: required
  instructions:
    en: Upload the first person's portrait, then the second person's portrait.
  slots:
    - { id: personA, labels: { en: First person }, min: 1, max: 1 }
    - { id: personB, labels: { en: Second person }, min: 1, max: 1 }
```

Slot IDs are unique, start with a lowercase letter and contain only letters/digits.
Counts are nonnegative integers with `min <= max` and `max > 0`. A positive minimum
requires `referenceImage: required`; all-zero minima require `optional`. Older entries
without slots keep their existing reference-image flag and presentation.

For a run owned by a prompt with slots, bind every ordered `referenceAssetIds` element
exactly once using `referenceBindings: [{slotId: personA, referenceIndex: 0}, ...]`.
Indices start at zero; unknown slots, duplicate/out-of-range indices and incorrect slot
counts fail content validation. Inputs remain asset IDs, never text-template fields.

Optional prompt `showcaseExampleId` selects the run shown with its reference images.
It must belong to the prompt, include its cover among outputs and preserve the exact current
prompt text. Older prompts may omit it. Localized input instructions are included in both
HTML details and Markdown export. Templates store the input contract in `versions/vN/inputs.yaml`; prompts inherit that version.
Recorded template runs freeze rendering semantics in `template.contractHash`: body, defaults, constraints, stable option values, separators and reference slots. Localized labels, help and instructions may change after text review. Legacy hashes that included this prose remain untouched; a strict, versioned `contract-baseline.yaml` records a verified legacy hash and its semantic equivalent. A baseline only accepts the legacy hash while the current semantics match. Generate it once from unchanged content after verifying all recorded hashes; never regenerate it during translation imports. Semantic changes require a new template version.
See [the production workflow](../production/README.md) for preparing, reviewing and applying new cases.
