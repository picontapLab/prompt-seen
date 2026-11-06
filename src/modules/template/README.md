# template

Pure template rendering shared by the build, the template page and the editor (design doc §6.3, §6.4, §7): `renderTemplate(version, values)`, `validateValues`, `resolveValues`, `parseTemplateBody` and `graphemeLength`. No runtime dependencies, so the editor (step 3c) imports it in the browser. `renderTemplate` always returns the segments for the preview, and returns the prompt text only when every value is valid. Owner: step 1b.

The build resolves the prompt locale before calling this module. `EnumOption.value` is the stable
stored value; optional `renderText` changes only its output text. A resolved spec also supplies
localized free-text defaults and list separators. User values are never translated or recursively
expanded. `examples.ts` matches recorded output by template/version, values, exact text and actual
prompt language. Locale selection and file validation live in `scripts/lib/content/prompt-variants.ts`.
