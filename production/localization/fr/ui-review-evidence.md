# F0 French linguistic review

Reviewer: Codex AI (not a human or native-speaker review). Completed: 2026-11-17T14:20:16.013Z.

Reviewed the 427 English/French UI pairs, 34 taxonomy fields, and source/target About and License pages. Scope is wording, meaning, terminology, punctuation, ICU arguments and preservation of licensing/model uncertainty. Media inspection and browser interaction are not covered by this review.

Corrections: home.more.all now has an explicit zero branch rather than promising a prompt when none exists. The English placard alias was initially copied as French placard (cupboard); the revised F0 batch uses tract/pancarte plus the meaningful flyer/poster aliases. Shape filters use Vertical/Horizontal rather than confusing image orientation with a subject. French distinguishes modèle de prompt from modèle d’IA. Zero-result search and remaining-token messages have explicit =0 branches; many/million uses the plural other output.

About retains the historical count of 101 images, unknown exact model snapshot, archived procedural runs and lossless/display compression distinction; it does not claim new asset inspection. License retains MIT, CC BY 4.0, per-file image licensing and exclusion of the name/logo, with the original link unchanged.

Validation: the six focused unit files passed 95 tests, including every catalog message compiled/runtime formatting, French 0/1/2/1000/1000000, apostrophe-adjacent parameters and language-region suggestions. TypeScript validation passed. Browser layout is pending separately.

## Exact unchanged UI fields

These are valid shared French spellings, numeric/parameter-only patterns or a stable download filename. Each is approved at its current field hash, not via a directory exemption.

- src/i18n/messages/fr/detail.json#breadcrumb.prompts: "Prompts"
- src/i18n/messages/fr/detail.json#documentTitle: "{title} · {kind} · {siteName}"
- src/i18n/messages/fr/detail.json#image.dimensions: "{width} × {height}"
- src/i18n/messages/fr/detail.json#kinds.prompt: "Prompt"
- src/i18n/messages/fr/detail.json#sheet.label: "Prompt · {language}"
- src/i18n/messages/fr/detail.json#source.image: "Image"
- src/i18n/messages/fr/detail.json#source.prompt: "Prompt"
- src/i18n/messages/fr/detail.json#template.choices: "{count, plural, one {# option} other {# options}}"
- src/i18n/messages/fr/detail.json#template.type: "Type"
- src/i18n/messages/fr/detail.json#template.version: "Version {version}"
- src/i18n/messages/fr/detail.json#test.dimensions: "{width} × {height}"
- src/i18n/messages/fr/favorites.json#page.exportName: "prompt-seen-saved-{date}.json"
- src/i18n/messages/fr/favorites.json#page.prompts: "Prompts"
- src/i18n/messages/fr/favorites.json#page.type: "Type"
- src/i18n/messages/fr/feed.json#feed.label: "Prompts"
- src/i18n/messages/fr/feed.json#filters.style: "Style"
- src/i18n/messages/fr/feed.json#status.page: "Page"
- src/i18n/messages/fr/feed.json#status.pageLink: "Page {page}"
- src/i18n/messages/fr/geo.json#llms.collections: "Collections"
- src/i18n/messages/fr/geo.json#llms.prompts: "Prompts"
- src/i18n/messages/fr/pages.json#breadcrumb.collections: "Collections"
- src/i18n/messages/fr/pages.json#breadcrumb.prompts: "Prompts"
- src/i18n/messages/fr/pages.json#collection.eyebrow: "Collection"
- src/i18n/messages/fr/pages.json#collections.title: "Collections"
- src/i18n/messages/fr/pages.json#topic.count: "{count, plural, one {# prompt} other {# prompts}}"
- src/i18n/messages/fr/pages.json#topic.kinds.style: "Style"
- src/i18n/messages/fr/pages.json#topic.works: "Prompts"
- src/i18n/messages/fr/primitives.json#field.length: "{count} / {max}"
- src/i18n/messages/fr/primitives.json#toast.region: "Notifications"
- src/i18n/messages/fr/search.json#groups.collection: "Collections"
- src/i18n/messages/fr/search.json#groups.prompt: "Prompts"
- src/i18n/messages/fr/search.json#noResults.suggestion: "{label} ({count})"
- src/i18n/messages/fr/shell.json#footer.label: "Site"
- src/i18n/messages/fr/shell.json#menu.open: "Menu"
- src/i18n/messages/fr/shell.json#menu.title: "Menu"
- src/i18n/messages/fr/shell.json#nav.collections: "Collections"
- src/i18n/messages/fr/shell.json#nav.prompts: "Prompts"
- src/i18n/messages/fr/shortcuts.json#action: "Action"
- src/i18n/messages/fr/shortcuts.json#withKey: "{action} ({key})"
- src/i18n/messages/fr/templates.json#list.version: "Version {version}"
- src/i18n/messages/fr/templates.json#tokens.count: "{count} / {max}"
