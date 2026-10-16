# template

Pure template rendering shared by the build, the template page and the editor (design doc §6.3, §6.4, §7): `renderTemplate(version, values)`, `validateValues`, `resolveValues`, `parseTemplateBody` and `graphemeLength`. No runtime dependencies, so the editor (step 3c) imports it in the browser. `renderTemplate` always returns the segments for the preview, and returns the prompt text only when every value is valid. Owner: step 1b.
