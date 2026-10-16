# content

Reads the built content index: `getEntry(id, locale)`, `listEntries(query)`, publishing state and relations (design doc §7). Owner: step 1b. Build-time only code (file reading, MDX compilation) stays in `scripts/`; nothing here reads `content/` directly.
