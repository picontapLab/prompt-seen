# Content

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

| Command                                                         | What it does                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run content:new -- prompt <slug>`                          | New prompt directory with the next ID, as a draft                    |
| `npm run content:new -- template <slug>`                        | New template with `versions/v1/`                                     |
| `npm run content:new -- collection <slug> --cover a_012 --items p_001,p_002` | New collection                                          |
| `npm run content:new -- page <slug>`                            | New content page (like `about`)                                      |
| `npm run content:new -- example --prompt p_001`                 | New example run with the prompt's current text and its cover image   |
| `npm run media:import -- <image> --slug <words> --alt en="…"`   | Store an image and its display sizes; writes `media/a_NNN.yaml`      |
| `npm run media:import -- --refresh a_012`                       | Regenerate sizes after editing `focalPoint` or `credit`              |
| `npm run content:validate`                                      | Check everything; `--quiet` hides maintenance hints                  |
| `npm run dev`                                                   | Local site that rebuilds when files here change                      |

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
language. Missing languages simply have no page; nothing falls back to English.

Preview builds (`BUILD_MODE=preview`, the default locally) also show drafts and the languages
marked `preview: true`, so work in progress can be checked. Archived versions answer 410.

### What the body may contain

Markdown (sections from `##`, lists, quotes, code, tables, emphasis, links) plus two components,
each on its own line:

```mdx
<Figure asset="a_012" caption="The same prompt without the seal" />

<Callout>
A highlighted note.
</Callout>
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
`inputRequirements.referenceImage`, `source` and optional `annotations`:

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
