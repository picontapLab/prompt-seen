# Independent Brazilian Portuguese UI textual review

Reviewer: AI Codex translate_a (independent from the UI translation author).
Completed: 2026-11-11T11:44:24.781Z

## Scope and method

Read all 427 source/target messages across 14 namespaces: common.json, detail.json, explore.json, favorites.json, feed.json, geo.json, home.json, pages.json, popup.json, primitives.json, search.json, shell.json, shortcuts.json, templates.json. Read production/localization/pt-BR/glossary.yaml and style-guide.md in full. Compared meaning, factual qualification, Brazilian usage, domain terms, interface verbs, ICU arguments, plural branches, and retained technical syntax. This approval covers textual translation only. It does not certify browser interaction, visual layout, media assets, accessibility behavior, image generation, or human linguistic review. Those release checks remain pending.

## Correction

- src/i18n/messages/pt-BR/templates.json#editor.errors.required
  - Before: {label} está vazio. Preencha para completar o prompt.
  - After: O campo {label} está vazio. Preencha para completar o prompt.
  - Reason: adding “O campo” avoids gender agreement failures when {label} denotes a feminine field. Meaning and argument remain unchanged.

## Findings

- Templates use “template”, and AI models use “modelo”; no conflation was found. Prompt-original-language disclaimers, model uncertainty, licenses, source attribution, and historical generation/test claims retain their source meaning. No unsupported live generation functionality or new testing claim was introduced.
- Brazilian UI terms and actions are consistent: Copiar, Baixar, Buscar, Restaurar, Favoritos, imagem de referência. Horizontal/vertical are used for orientation. The film metaphor uses “Revelando imagens” and “O rolo”.
- All 427 keys exist exactly once as nonempty strings. Every source and target parses as ICU, and the complete argument names/types match, including nested branches. 32 messages include explicit =0 cases to avoid zero taking a singular Portuguese form.
- Glossary and style guide pass independent textual review. The glossary remains marked draft; this review does not alter its workflow status. Optional clarity improvement for the guide: describe retrato/paisagem as “tipo de imagem” or “tema visual” instead of “assunto”. This is not a release-blocking language defect.
- Target fingerprints use the repository fingerprint implementation on {field: targetField, value: actualTarget}; source hashes are copied from the inventory. Review timestamps are actual UTC execution time.

## Exact unchanged exceptions (32)

- src/i18n/messages/pt-BR/detail.json#breadcrumb.prompts: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#breadcrumb.templates: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#documentTitle: "{title} · {kind} · {siteName}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/detail.json#examples.template: "Template {version}" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#image.dimensions: "{width} × {height}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/detail.json#kinds.prompt: "Prompt" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#kinds.template: "Template" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#sheet.label: "Prompt · {language}" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#source.prompt: "Prompt" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/detail.json#test.dimensions: "{width} × {height}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/favorites.json#page.exportName: "prompt-seen-saved-{date}.json" — Stable export filename intentionally preserved; {date} remains an ICU argument.
- src/i18n/messages/pt-BR/favorites.json#page.prompts: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/favorites.json#page.templates: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/feed.json#feed.label: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/geo.json#llms.prompts: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/geo.json#llms.templates: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/geo.json#markdown.field: "{label}: {value}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/pages.json#breadcrumb.prompts: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/pages.json#collection.template: "Template" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/pages.json#topic.works: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/primitives.json#field.length: "{count} / {max}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/search.json#groups.prompt: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/search.json#groups.template: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/search.json#noResults.suggestion: "{label} ({count})" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/shell.json#footer.label: "Site" — This is also the standard Brazilian Portuguese UI term.
- src/i18n/messages/pt-BR/shell.json#menu.open: "Menu" — This is also the standard Brazilian Portuguese UI term.
- src/i18n/messages/pt-BR/shell.json#menu.title: "Menu" — This is also the standard Brazilian Portuguese UI term.
- src/i18n/messages/pt-BR/shell.json#nav.prompts: "Prompts" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/shell.json#nav.templates: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/shortcuts.json#withKey: "{action} ({key})" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.
- src/i18n/messages/pt-BR/templates.json#list.title: "Templates" — Prompt and template are intentionally adopted domain terms in the reviewed pt-BR glossary; any ICU argument is preserved.
- src/i18n/messages/pt-BR/templates.json#tokens.count: "{count} / {max}" — Format-only label intentionally preserves ICU arguments, punctuation, and unit-free numeric formatting.

## Explicit zero branches

- src/i18n/messages/pt-BR/detail.json#sheet.characters
- src/i18n/messages/pt-BR/detail.json#sheet.expandLines
- src/i18n/messages/pt-BR/detail.json#template.choices
- src/i18n/messages/pt-BR/detail.json#template.fieldCount
- src/i18n/messages/pt-BR/favorites.json#linkCount
- src/i18n/messages/pt-BR/favorites.json#page.count
- src/i18n/messages/pt-BR/favorites.json#page.fields
- src/i18n/messages/pt-BR/favorites.json#page.imported
- src/i18n/messages/pt-BR/favorites.json#page.importedDetail
- src/i18n/messages/pt-BR/feed.json#count
- src/i18n/messages/pt-BR/feed.json#filters.results
- src/i18n/messages/pt-BR/feed.json#filters.show
- src/i18n/messages/pt-BR/feed.json#interlude.collection
- src/i18n/messages/pt-BR/feed.json#interlude.fields
- src/i18n/messages/pt-BR/feed.json#status.loaded
- src/i18n/messages/pt-BR/home.json#collections.count
- src/i18n/messages/pt-BR/home.json#more.all
- src/i18n/messages/pt-BR/home.json#search.placeholder
- src/i18n/messages/pt-BR/home.json#templates.fields
- src/i18n/messages/pt-BR/home.json#useCases.count
- src/i18n/messages/pt-BR/pages.json#collection.count
- src/i18n/messages/pt-BR/pages.json#topic.count
- src/i18n/messages/pt-BR/primitives.json#chip.count
- src/i18n/messages/pt-BR/search.json#count
- src/i18n/messages/pt-BR/search.json#noResults.otherLocale
- src/i18n/messages/pt-BR/search.json#page.summary
- src/i18n/messages/pt-BR/search.json#panel.seeAll
- src/i18n/messages/pt-BR/templates.json#editor.missing
- src/i18n/messages/pt-BR/templates.json#list.count
- src/i18n/messages/pt-BR/templates.json#list.fields
- src/i18n/messages/pt-BR/templates.json#tokens.full
- src/i18n/messages/pt-BR/templates.json#tokens.remaining
